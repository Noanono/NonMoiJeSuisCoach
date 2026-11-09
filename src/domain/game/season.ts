import { ABILITIES } from '../abilities/catalog';
import { reviewSeason, seasonObjective } from '../club/president';
import { createCup, fixtureWinnerId } from '../league/cup';
import { autoLineup } from '../league/lineup';
import { applyDivisionMoves, computeDivisionMoves } from '../league/promotion';
import { generateLeagueFixtures } from '../league/schedule';
import { computeStandings } from '../league/standings';
import type { Rng } from '../core/rng';
import type { StandingRow } from '../types';
import { developPlayers } from '../world/development';
import { generateYouthIntake } from '../world/youthAcademy';
import { clubPlayers, humanClub, humanDivision } from './selectors';
import type { GameState } from './state';

/** Prépare une saison : calendrier, coupe, objectifs du président (UNIV-05, UNIV-06, CLUB-04). */
export function startSeason(state: GameState, rng: Rng): void {
  state.week = 1;
  state.fixtures = state.divisions.flatMap((division) =>
    generateLeagueFixtures({ division, season: state.season, rng }),
  );
  state.cup = createCup({ clubIds: Object.keys(state.clubs), rng, season: state.season });
  state.objective = seasonObjective({ club: humanClub(state), division: humanDivision(state), clubs: state.clubs, rng });
  resetSeasonCounters(state);
  refreshAiLineups(state);
  state.news.push(`Le président : « ${state.objective.speech} »`);
}

function resetSeasonCounters(state: GameState): void {
  for (const player of Object.values(state.players)) {
    player.seasonStats = { matches: 0, goals: 0, yellowCards: 0, redCards: 0 };
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
 * Fin de saison : bilan du président, montées et descentes (UNIV-04), progression des joueurs,
 * jeunes du centre de formation (CLUB-07), puis nouvelle saison.
 */
export function endSeason(state: GameState, rng: Rng): void {
  const human = humanClub(state);
  const division = humanDivision(state);
  const standings = Object.fromEntries(state.divisions.map((entry) => [entry.id, divisionStandings(state, entry.id)]));
  const position = standings[division.id]!.findIndex((row) => row.clubId === human.id) + 1;
  const roundsWon = cupRoundsWon(state, human.id);
  const review = reviewSeason(state.objective, { finalPosition: position, cupRoundsWon: roundsWon });
  state.outlook.presidentConfidence = Math.max(0, Math.min(100, state.outlook.presidentConfidence + review.confidenceDelta));
  state.history.push({ season: state.season, divisionName: division.name, position, cupRoundsWon: roundsWon, verdict: review.verdict });
  state.news.push(`Fin de saison : ${position}e de ${division.name}. ${review.verdict}`);

  const moves = computeDivisionMoves(state.divisions, standings);
  const applied = applyDivisionMoves(state.divisions, state.clubs, moves);
  state.divisions = applied.divisions;
  state.clubs = applied.clubs;
  const humanMove = moves.find((move) => move.clubId === human.id);
  if (humanMove) state.news.push(humanMove.kind === 'promotion' ? 'MONTÉE ! La buvette est ouverte toute la nuit.' : 'Descente. Le président a vendu la tireuse.');

  for (const player of developPlayers(Object.values(state.players), rng)) state.players[player.id] = player;
  welcomeYouth(state, rng);
  state.season += 1;
  startSeason(state, rng);
}

function welcomeYouth(state: GameState, rng: Rng): void {
  const club = humanClub(state);
  const excluded = clubPlayers(state, club.id).map((player) => player.ability.abilityId);
  const youngsters = generateYouthIntake({ rng, club, abilityPool: ABILITIES, excludedAbilityIds: excluded });
  for (const youngster of youngsters) {
    state.players[youngster.id] = youngster;
    club.playerIds.push(youngster.id);
  }
  if (youngsters.length > 0) {
    state.news.push(`Le centre de formation sort ${youngsters.length} gamins. Ils ont l'air de savoir où est le ballon.`);
  }
}
