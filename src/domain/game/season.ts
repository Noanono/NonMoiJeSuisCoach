import { ABILITIES } from '../abilities/catalog';
import { CAREER_XP_PER_SEASON, gainXp } from '../abilities/progression';
import { facilitiesOf, facilityBonus } from '../club/facilities';
import { CUP_WINNER_PRIZE, leaguePrize } from '../club/finance';
import { reviewSeason, seasonObjective } from '../club/president';
import { createCup, cupWinnerId, fixtureWinnerId } from '../league/cup';
import { autoLineup, EMPTY_SLOT } from '../league/lineup';
import { applyDivisionMoves, computeDivisionMoves } from '../league/promotion';
import { generateLeagueFixtures } from '../league/schedule';
import { computeStandings } from '../league/standings';
import type { Rng } from '../core/rng';
import type { Club, StandingRow } from '../types';
import { developPlayers } from '../world/development';
import { salaryForRating } from '../world/playerGenerator';
import { generateYouthIntake } from '../world/youthAcademy';
import { overall } from '../player/rating';
import { clubPlayers, humanClub, humanDivision } from './selectors';
import type { GameState } from './state';
import { seasonAwards } from './stats';

/** Âge à partir duquel un joueur peut prendre sa retraite (EFF-09). */
export const RETIREMENT_AGE = 32;
const RETIREMENT_BASE_CHANCE = 0.1;
const RETIREMENT_CHANCE_PER_YEAR = 0.15;
/** Jeunes promus chaque été : un chez le coach (son centre de formation), deux dans chaque club IA. */
export const HUMAN_YOUTH_PER_SEASON = 1;
const AI_YOUTH_PER_SEASON = 2;

/** Prépare une saison : calendrier, coupe, objectifs du président, rival (UNIV-05, UNIV-06, CLUB-04, UNIV-09). */
export function startSeason(state: GameState, rng: Rng): void {
  state.week = 1;
  state.fixtures = state.divisions.flatMap((division) =>
    generateLeagueFixtures({ division, season: state.season, rng }),
  );
  state.cup = createCup({ clubIds: Object.keys(state.clubs), rng, season: state.season });
  state.objective = seasonObjective({ club: humanClub(state), division: humanDivision(state), clubs: state.clubs, rng });
  state.rivalId = chooseRival(state, rng);
  resetSeasonCounters(state);
  refreshAiLineups(state);
  state.news.push(`Le président : « ${state.objective.speech} »`);
  const rival = state.rivalId ? state.clubs[state.rivalId] : undefined;
  if (rival) state.news.push(`Le rival de la saison : ${rival.name}. Les supporters ont déjà préparé les banderoles.`);
}

/** Rival de la saison (UNIV-09) : un club de la division du coach, tiré au sort. */
export function chooseRival(state: GameState, rng: Rng): string | null {
  const candidates = humanDivision(state).clubIds.filter((id) => id !== state.humanClubId);
  return candidates.length > 0 ? rng.pick(candidates) : null;
}

function resetSeasonCounters(state: GameState): void {
  for (const player of Object.values(state.players)) {
    player.seasonStats = { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
  }
}

/** Les clubs IA alignent leur meilleur onze disponible chaque semaine. */
export function refreshAiLineups(state: GameState): void {
  for (const club of Object.values(state.clubs)) {
    if (club.isHuman) continue;
    const formation = club.lineup?.formation ?? '4-4-2';
    club.lineup = autoLineup(clubPlayers(state, club.id), formation, club.lineup?.instructions);
  }
}

export function divisionStandings(state: GameState, divisionId: string): StandingRow[] {
  const division = state.divisions.find((candidate) => candidate.id === divisionId);
  if (!division) throw new Error(`Division inconnue : ${divisionId}`);
  return computeStandings(division.clubIds, state.fixtures.filter((fixture) => fixture.divisionId === divisionId));
}

export function cupRoundsWon(state: GameState, clubId: string): number {
  return state.cup.fixtures.filter(
    (fixture) => fixture.result && (fixture.homeId === clubId || fixture.awayId === clubId) && fixtureWinnerId(fixture) === clubId,
  ).length;
}

/**
 * Fin de saison : bilan du président, récompenses, montées et descentes (UNIV-04), progression,
 * salaires et retraites des joueurs, jeunes des centres de formation (CLUB-07), puis nouvelle saison.
 */
export function endSeason(state: GameState, rng: Rng): void {
  const human = humanClub(state);
  const division = humanDivision(state);
  const standings = Object.fromEntries(state.divisions.map((entry) => [entry.id, divisionStandings(state, entry.id)]));
  const position = standings[division.id]!.findIndex((row) => row.clubId === human.id) + 1;
  const roundsWon = cupRoundsWon(state, human.id);
  const review = reviewSeason(state.objective, { finalPosition: position, cupRoundsWon: roundsWon });
  const awards = seasonAwards(state, division.id);
  state.outlook.presidentConfidence = Math.max(0, Math.min(100, state.outlook.presidentConfidence + review.confidenceDelta));
  state.news.push(`Fin de saison : ${position}e de ${division.name}. ${review.verdict}`, ...awards);
  const prizeMoney = payPrizes(state, standings);
  state.history.push({ season: state.season, clubName: human.name, divisionName: division.name, position, cupRoundsWon: roundsWon, verdict: review.verdict, awards, prizeMoney });

  const moves = computeDivisionMoves(state.divisions, standings);
  const applied = applyDivisionMoves(state.divisions, state.clubs, moves);
  state.divisions = applied.divisions;
  state.clubs = applied.clubs;
  const humanMove = moves.find((move) => move.clubId === human.id);
  if (humanMove) state.news.push(humanMove.kind === 'promotion' ? 'MONTÉE ! La buvette est ouverte toute la nuit.' : 'Descente. Le président a vendu la tireuse.');

  // La référence est prise avant la progression d'intersaison : elle apparaît dans l'évolution de la saison suivante.
  for (const player of Object.values(state.players)) player.overallAtSeasonStart = overall(player);
  for (const player of developPlayers(Object.values(state.players), rng)) state.players[player.id] = player;
  growAiAbilities(state, rng);
  // Le salaire suit la note : il monte quand le joueur progresse, baisse quand il décline (EFF-10).
  for (const player of Object.values(state.players)) player.salary = salaryForRating(overall(player));
  retirePlayers(state, rng);
  welcomeYouth(state, rng);
  state.season += 1;
  startSeason(state, rng);
}

/**
 * Primes de fin de saison (CLUB-01) : chaque club touche sa prime de classement, le vainqueur de la
 * coupe une prime en plus. Rend ce qu'a touché le club du coach.
 */
function payPrizes(state: GameState, standings: Record<string, StandingRow[]>): number {
  let humanPrize = 0;
  for (const division of state.divisions) {
    const rows = standings[division.id] ?? [];
    rows.forEach((row, index) => {
      const club = state.clubs[row.clubId];
      if (!club) return;
      const prize = leaguePrize(division.tier, index + 1, rows.length);
      club.budget += prize;
      if (club.isHuman) {
        humanPrize += prize;
        state.news.push(`Prime de classement : ${formatPrize(prize)}. Le trésorier compte deux fois pour être sûr.`);
      }
    });
  }
  const winnerId = cupWinnerId(state.cup);
  const winner = winnerId ? state.clubs[winnerId] : undefined;
  if (winner) {
    winner.budget += CUP_WINNER_PRIZE;
    if (winner.isHuman) {
      humanPrize += CUP_WINNER_PRIZE;
      state.news.push(`COUPE GAGNÉE ! Prime de ${formatPrize(CUP_WINNER_PRIZE)}, le trophée trône déjà sur le comptoir.`);
    } else {
      state.news.push(`La coupe est remportée par ${winner.name}.`);
    }
  }
  return humanPrize;
}

function formatPrize(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} €`;
}

/** Les capacités des joueurs hors du club du coach gagnent une saison d'XP (CAP-10). */
function growAiAbilities(state: GameState, rng: Rng): void {
  for (const player of Object.values(state.players)) {
    if (player.clubId === state.humanClubId) continue;
    player.ability = gainXp(player.ability, rng.int(CAREER_XP_PER_SEASON.min, CAREER_XP_PER_SEASON.max));
  }
}

/** Chance de prendre sa retraite à cet âge (après l'anniversaire de l'intersaison). */
export function retirementChance(age: number): number {
  if (age < RETIREMENT_AGE) return 0;
  return Math.min(1, RETIREMENT_BASE_CHANCE + (age - RETIREMENT_AGE) * RETIREMENT_CHANCE_PER_YEAR);
}

/** Les vétérans raccrochent (EFF-09) : ils quittent leur club, les compositions sont recousues. */
function retirePlayers(state: GameState, rng: Rng): void {
  const retiredFromHuman: string[] = [];
  for (const player of Object.values(state.players)) {
    if (!rng.chance(retirementChance(player.age))) continue;
    const club = player.clubId ? state.clubs[player.clubId] : undefined;
    if (club) removeFromClub(club, player.id);
    if (club?.isHuman) retiredFromHuman.push(`${player.firstName} ${player.lastName} (${player.age} ans)`);
    delete state.players[player.id];
  }
  state.offers = state.offers.filter((offer) => state.players[offer.playerId]);
  const human = humanClub(state);
  if (human.lineup && human.lineup.starters.some((id) => id === EMPTY_SLOT)) {
    human.lineup = autoLineup(clubPlayers(state, human.id), human.lineup.formation, human.lineup.instructions);
  }
  if (retiredFromHuman.length > 0) state.news.push(`Retraite : ${retiredFromHuman.join(', ')} raccroche(nt) les crampons. Pot de départ à la buvette.`);
}

function removeFromClub(club: Club, playerId: string): void {
  club.playerIds = club.playerIds.filter((id) => id !== playerId);
  if (!club.lineup) return;
  club.lineup = {
    ...club.lineup,
    starters: club.lineup.starters.map((id) => (id === playerId ? EMPTY_SLOT : id)),
    bench: club.lineup.bench.filter((id) => id !== playerId),
  };
}

/** Centres de formation (CLUB-07) : un jeune chez le coach, meilleur si le centre est développé. */
function welcomeYouth(state: GameState, rng: Rng): void {
  for (const club of Object.values(state.clubs)) {
    const excluded = clubPlayers(state, club.id).map((player) => player.ability.abilityId);
    const youngsters = generateYouthIntake({
      rng,
      club,
      abilityPool: ABILITIES,
      excludedAbilityIds: excluded,
      count: club.isHuman ? HUMAN_YOUTH_PER_SEASON : AI_YOUTH_PER_SEASON,
      boost: facilityBonus.youth(facilitiesOf(club)),
    });
    for (const youngster of youngsters) {
      state.players[youngster.id] = youngster;
      club.playerIds.push(youngster.id);
    }
    const promoted = youngsters[0];
    if (club.isHuman && promoted) {
      state.news.push(`Le centre de formation promeut ${promoted.firstName} ${promoted.lastName}, ${promoted.age} ans, en équipe première. Il a l'air de savoir où est le ballon.`);
    }
  }
}
