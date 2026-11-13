import { getAbility } from '../abilities/catalog';
import { pickWeeklyDialogue } from '../club/dialogues';
import { facilitiesOf, facilityBonus } from '../club/facilities';
import { applyBalance, wageBill, weeklyBalance } from '../club/finance';
import { clampGauge, type MatchOutcome } from '../club/model';
import { confidenceAfterMatch, confidenceTrend, isFired, matchExpectation, sponsorMoodAfterMatch, streakEffect } from '../club/president';
import { weeklySquadUpdate } from '../club/squadLife';
import { trainPlayer } from '../club/training';
import { activeOffers, generateIncomingOffers } from '../club/transfers';
import { createRng, type Rng } from '../core/rng';
import { isTransferWindowOpen, SEASON_WEEKS, seasonWeek } from '../league/calendar';
import { createPlayoffFixtures, playoffPairings } from '../league/playoffs';
import { drawNextCupRound, isCupRoundComplete } from '../league/cup';
import type { Fixture, Player } from '../types';
import { payCupRound } from './cupPrizes';
import { scaleConfidenceDelta } from './difficulty';
import { pickJobOffers } from './jobs';
import { playAiFixture } from './matches';
import { pruneCoachOffers } from './actions';
import { callUpStandIns } from './standIns';
import { divisionStandings, endSeason, refreshAiLineups } from './season';
import { clubPlayers, humanClub, humanDivision, humanFixture, humanFixtureAt, humanSquad, isDerby, replacePlayers, weekFixtures } from './selectors';
import type { GameState } from './state';
import { asCoachOfClub, forEachCoach, isMultiplayer } from './coaches';

/** Récupération hebdomadaire des joueurs des clubs IA, version allégée de la vie d'effectif. */
const AI_WEEKLY_RECOVERY = 35;
const DIALOGUE_CHANCE = 0.6;
const RECENT_DIALOGUES_KEPT = 6;
/** Un derby compte double pour le président et les sponsors (UNIV-09). */
const DERBY_FACTOR = 2;

/** Exécute une commande avec le générateur de la partie, puis sauvegarde son état (reprise identique). */
export function withRng<T>(state: GameState, command: (rng: Rng) => T): T {
  const rng = createRng(state.rngState);
  const result = command(rng);
  state.rngState = rng.state();
  return result;
}

export function canAdvanceWeek(state: GameState): { ok: true } | { ok: false; reason: string } {
  if (state.status === 'fired') return { ok: false, reason: 'Tu as été licencié. Choisis un nouveau club pour continuer.' };
  const fixture = humanFixture(state);
  if (fixture && !fixture.result && !isHumanDuel(state, fixture)) return { ok: false, reason: 'Ton match t’attend. Les gars sont déjà en crampons.' };
  if (state.dialogue) return { ok: false, reason: 'Quelqu’un attend ta réponse dans le bureau.' };
  return { ok: true };
}

/** Passe à la semaine suivante : autres matchs, vie du vestiaire, finances, président, mercato (TECH-03 : appelé entre deux journées). */
export function advanceWeek(state: GameState): void {
  // En multi, la semaine n'avance que si chaque coach est prêt (MULTI-04).
  forEachCoach(state, () => {
    const check = canAdvanceWeek(state);
    if (!check.ok) throw new Error(check.reason);
  });
  withRng(state, (rng) => {
    forEachCoach(state, () => (state.news = []));
    for (const fixture of weekFixtures(state)) if (!fixture.result) playAiFixture(state, fixture, rng);
    forEachCoach(state, () => updateHumanSquad(state, humanFixture(state)));
    recoverAiSquads(state);
    forEachCoach(state, () => {
      const fixture = humanFixture(state);
      const outcome = fixture ? outcomeFor(fixture, state.humanClubId) : null;
      settleFinances(state, fixture, outcome);
      updatePresident(state, fixture, outcome);
      updateOffers(state, rng);
    });
    advanceCup(state, rng);
    pruneCoachOffers(state, state.week + 1, isTransferWindowOpen(state.week + 1));
    forEachCoach(state, () => {
      // Licencié : il choisit un nouveau club ; en solo, la semaine reprendra après ce choix (CLUB-05).
      if (state.status === 'fired' && state.jobOffers.length === 0) state.jobOffers = pickJobOffers(state, rng);
    });
    if (!isMultiplayer(state) && state.status === 'fired') return;
    forEachCoach(state, () => {
      if (state.status !== 'fired') maybeOpenDialogue(state, rng);
    });
    finishWeek(state, rng);
  });
}

/** Fin de semaine : calendrier, fin de saison éventuelle, dépanneurs et compositions de l'IA. */
export function finishWeek(state: GameState, rng: Rng): void {
  state.week += 1;
  if (state.week > SEASON_WEEKS) endSeason(state, rng);
  else if (seasonWeek(state.week).kind === 'playoff') schedulePlayoffs(state);
  callUpAllStandIns(state, rng);
  refreshAiLineups(state);
}

/** Barrages d'accession (UNIV-04) : tirés du classement final, une seule fois. */
function schedulePlayoffs(state: GameState): void {
  if (state.fixtures.some((fixture) => fixture.competition === 'playoff')) return;
  const standings = Object.fromEntries(state.divisions.map((division) => [division.id, divisionStandings(state, division.id)]));
  const fixtures = createPlayoffFixtures(playoffPairings(state.divisions, standings), state.season, state.week);
  state.fixtures.push(...fixtures);
  forEachCoach(state, () => announcePlayoff(state, fixtures));
}

function announcePlayoff(state: GameState, fixtures: readonly Fixture[]): void {
  const mine = fixtures.find((fixture) => fixture.homeId === state.humanClubId || fixture.awayId === state.humanClubId);
  if (!mine) return;
  const opponent = state.clubs[mine.homeId === state.humanClubId ? mine.awayId : mine.homeId]!.name;
  state.news.push(
    mine.awayId === state.humanClubId
      ? `Barrage d'accession contre ${opponent} ! Gagne et tu montes. Le président a déjà commandé les fûts.`
      : `Barrage de maintien contre ${opponent}, qui veut ta place. Perds et tu descends.`,
  );
}

function callUpAllStandIns(state: GameState, rng: Rng): void {
  for (const clubId of Object.keys(state.clubs)) {
    const count = callUpStandIns(state, clubId, rng);
    if (count === 0) continue;
    asCoachOfClub(state, clubId, () => {
      state.news.push(`Effectif décimé : ${count} dépanneur(s) signent, dont le cousin du président. Il a amené ses crampons.`);
    });
  }
}

/** Match entre deux coachs humains (multi) : il ne se joue pas contre l'IA (MULTI-06). */
export function isHumanDuel(state: GameState, fixture: Fixture): boolean {
  return isMultiplayer(state) && state.clubs[fixture.homeId]?.isHuman === true && state.clubs[fixture.awayId]?.isHuman === true;
}

export function outcomeFor(fixture: Fixture, clubId: string): MatchOutcome | null {
  const { result } = fixture;
  if (!result) return null;
  const isHome = fixture.homeId === clubId;
  const scored = isHome ? result.homeGoals : result.awayGoals;
  const conceded = isHome ? result.awayGoals : result.homeGoals;
  if (scored !== conceded) return scored > conceded ? 'win' : 'loss';
  if (!result.penaltyWinnerId) return 'draw';
  return result.penaltyWinnerId === clubId ? 'win' : 'loss';
}

function goalsFor(fixture: Fixture, clubId: string): { scored: number; conceded: number } {
  const result = fixture.result!;
  const isHome = fixture.homeId === clubId;
  return isHome
    ? { scored: result.homeGoals, conceded: result.awayGoals }
    : { scored: result.awayGoals, conceded: result.homeGoals };
}

/** Récupération, blessures, suspensions (EFF-04, EFF-05) et entraînement de la semaine (TRAIN-01). */
function updateHumanSquad(state: GameState, fixture: Fixture | null): void {
  const facilities = facilitiesOf(humanClub(state));
  const recovered = weeklySquadUpdate({
    squad: humanSquad(state),
    appearances: state.lastAppearances,
    matchPlayed: fixture !== null,
    extraRecovery: facilityBonus.extraRecovery(facilities),
  });
  state.lastAppearances = [];
  const trained = recovered.map((player) => trainPlayer(player, facilityBonus.trainingRate(facilities)));
  replacePlayers(state, trained);
  const improved = trained.filter((player, index) => JSON.stringify(player.attributes) !== JSON.stringify(recovered[index]!.attributes) || player.ability.level > recovered[index]!.ability.level);
  if (improved.length > 0) state.news.push(`Entraînement : ${improved.length} joueur(s) ont progressé cette semaine.`);
}

function recoverAiSquads(state: GameState): void {
  for (const club of Object.values(state.clubs)) {
    if (club.isHuman) continue;
    for (const player of clubPlayers(state, club.id)) recoverAiPlayer(player);
  }
}

function recoverAiPlayer(player: Player): void {
  player.fatigue = Math.max(0, player.fatigue - AI_WEEKLY_RECOVERY);
  if (player.injuryWeeks > 0) player.injuryWeeks -= 1;
  if (player.suspendedMatches > 0) player.suspendedMatches -= 1;
}

/** Bilan financier hebdomadaire (CLUB-01), installations comprises (CLUB-09). */
function settleFinances(state: GameState, fixture: Fixture | null, outcome: MatchOutcome | null): void {
  const club = humanClub(state);
  const facilities = facilitiesOf(club);
  const lines = weeklyBalance({
    divisionTier: humanDivision(state).tier,
    sponsorMood: state.outlook.sponsorMood,
    matchOutcome: outcome,
    homeMatch: fixture?.homeId === club.id,
    wageBill: wageBill(humanSquad(state)),
    buvetteFactor: facilityBonus.buvetteIncome(facilities),
    sponsorFactor: facilityBonus.sponsorIncome(facilities),
  });
  state.clubs[club.id] = applyBalance(club, lines);
  state.lastFinance = lines;
}

/** Confiance du président et humeur des sponsors après le match (CLUB-05) ; licenciement à zéro. */
function updatePresident(state: GameState, fixture: Fixture | null, outcome: MatchOutcome | null): void {
  if (fixture && outcome) {
    const isHome = fixture.homeId === state.humanClubId;
    const opponent = state.clubs[isHome ? fixture.awayId : fixture.homeId]!;
    const { scored, conceded } = goalsFor(fixture, state.humanClubId);
    const before = state.outlook.presidentConfidence;
    const change = confidenceAfterMatch(before, {
      outcome,
      expectation: matchExpectation(humanClub(state).reputation, opponent.reputation, isHome),
      goalDifference: scored - conceded,
    });
    const derby = isDerby(state, fixture);
    const factor = derby ? DERBY_FACTOR : 1;
    const sponsorsBefore = state.outlook.sponsorMood;
    state.streak = {
      wins: outcome === 'win' ? state.streak.wins + 1 : 0,
      losses: outcome === 'loss' ? state.streak.losses + 1 : 0,
    };
    // Une série de victoires (ou de défaites) pèse plus lourd à chaque match (CLUB-05).
    const streak = streakEffect(state.streak);
    state.outlook.presidentConfidence = clampGauge(before + scaleConfidenceDelta((change.delta + streak.confidence) * factor, state.difficulty));
    for (let i = 0; i < factor; i++) state.outlook.sponsorMood = clampGauge(sponsorMoodAfterMatch(state.outlook.sponsorMood, outcome) + streak.sponsorMood);
    state.news.push(`Le président : « ${change.message} »`);
    state.news.push(`Après le match : confiance du président ${gaugeMove(before, state.outlook.presidentConfidence)}, humeur des sponsors ${gaugeMove(sponsorsBefore, state.outlook.sponsorMood)}.`);
    if (streak.confidence > 0) state.news.push(`${state.streak.wins} victoires de suite : le président et les sponsors en redemandent.`);
    if (streak.confidence < 0) state.news.push(`${state.streak.losses} défaites de suite : le président compte les jours, les sponsors relisent leurs contrats.`);
    if (derby) state.news.push(outcome === 'win' ? 'Derby gagné ! Toute la ville en parle, les sponsors adorent.' : outcome === 'loss' ? 'Derby perdu. Le président ne sort plus faire ses courses.' : 'Derby nul. Tout le monde rentre frustré.');
  }
  if (fixture?.competition === 'league') applyStandingTrend(state);
  if (isFired(state.outlook.presidentConfidence)) {
    state.status = 'fired';
    state.news.push('Le président a appelé. Il n’a rien dit. Puis il a raccroché. Tu es licencié.');
  }
}

/** « 62 → 66 (+4) » : une jauge avant et après. */
function gaugeMove(before: number, after: number): string {
  const delta = after - before;
  return `${before} → ${after} (${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${Math.abs(delta)})`;
}

function applyStandingTrend(state: GameState): void {
  const division = humanDivision(state);
  const position = divisionStandings(state, division.id).findIndex((row) => row.clubId === state.humanClubId) + 1;
  const trend = confidenceTrend(position, state.objective, division.clubIds.length, division.relegated);
  state.outlook.presidentConfidence = clampGauge(state.outlook.presidentConfidence + scaleConfidenceDelta(trend, state.difficulty));
}

/** Offres des clubs IA sur les joueurs du coach (CLUB-03). */
function updateOffers(state: GameState, rng: Rng): void {
  const nextWeek = state.week + 1;
  // Une offre ne peut être acceptée que mercato ouvert : elle tombe à la fermeture (CLUB-02).
  state.offers = isTransferWindowOpen(nextWeek) ? activeOffers(state.offers, nextWeek) : [];
  const offers = generateIncomingOffers(
    { clubs: state.clubs, players: state.players },
    { coachClubId: state.humanClubId, week: nextWeek, windowOpen: isTransferWindowOpen(nextWeek), abilityOf: getAbility, rng },
  );
  state.offers.push(...offers);
  if (offers.length > 0) state.news.push(`${offers.length} offre(s) reçue(s) pour tes joueurs. Le fax chauffe.`);
}

/** Tour de coupe terminé : primes des éliminés (et du vainqueur après la finale), puis tirage du suivant. */
function advanceCup(state: GameState, rng: Rng): void {
  const round = state.cup.currentRound;
  if (round < 1 || !isCupRoundComplete(state.cup, round)) return;
  payCupRound(state, round);
  if (round < state.cup.totalRounds) state.cup = drawNextCupRound(state.cup, rng);
}

/** Dialogue de la semaine (CLUB-06), avec des scènes dédiées avant un derby (UNIV-09). */
function maybeOpenDialogue(state: GameState, rng: Rng): void {
  if (state.dialogue || !rng.chance(DIALOGUE_CHANCE)) return;
  const next = humanFixtureAt(state, state.week + 1);
  const dialogue = pickWeeklyDialogue(
    {
      divisionTier: humanDivision(state).tier,
      losingStreak: state.streak.losses,
      winningStreak: state.streak.wins,
      budget: humanClub(state).budget,
      presidentConfidence: state.outlook.presidentConfidence,
      upcomingDerby: next !== null && isDerby(state, next),
      recentDialogueIds: state.recentDialogueIds,
    },
    rng,
  );
  state.dialogue = { dialogueId: dialogue.id };
  state.recentDialogueIds = [dialogue.id, ...state.recentDialogueIds].slice(0, RECENT_DIALOGUES_KEPT);
}
