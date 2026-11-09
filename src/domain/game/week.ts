import { getAbility } from '../abilities/catalog';
import { pickWeeklyDialogue } from '../club/dialogues';
import { applyBalance, wageBill, weeklyBalance } from '../club/finance';
import { clampGauge, type FrasqueEvent, type MatchOutcome } from '../club/model';
import { applyPressArticle, humiliationEvent, writeArticle } from '../club/press';
import { confidenceAfterMatch, confidenceTrend, isFired, matchExpectation } from '../club/president';
import { weeklySquadUpdate } from '../club/squadLife';
import { activeOffers, generateIncomingOffers } from '../club/transfers';
import { createRng, type Rng } from '../core/rng';
import { isTransferWindowOpen, SEASON_WEEKS } from '../league/calendar';
import { drawNextCupRound, isCupRoundComplete } from '../league/cup';
import type { Fixture, Player, PressArticle } from '../types';
import { playAiFixture } from './matches';
import { callUpStandIns } from './standIns';
import { divisionStandings, endSeason, refreshAiLineups } from './season';
import {
  clubPlayers,
  humanClub,
  humanDivision,
  humanFixture,
  humanSquad,
  outlookOf,
  replacePlayers,
  weekFixtures,
  writeOutlook,
} from './selectors';
import type { GameState } from './state';

/** Récupération hebdomadaire des joueurs des clubs IA, version allégée de la vie d'effectif. */
const AI_WEEKLY_RECOVERY = 30;
const DIALOGUE_CHANCE = 0.6;
const RECENT_DIALOGUES_KEPT = 6;
const PRESS_KEPT = 30;
/** L'hebdo local ne parle pas du club toutes les semaines… sauf après une humiliation. */
const FRONT_PAGE_CHANCE = 0.4;

/** Exécute une commande avec le générateur de la partie, puis sauvegarde son état (reprise identique). */
export function withRng<T>(state: GameState, command: (rng: Rng) => T): T {
  const rng = createRng(state.rngState);
  const result = command(rng);
  state.rngState = rng.state();
  return result;
}

export function canAdvanceWeek(state: GameState): { ok: true } | { ok: false; reason: string } {
  if (state.status === 'fired') return { ok: false, reason: 'Tu as été licencié. Le président a gardé tes clés.' };
  const fixture = humanFixture(state);
  if (fixture && !fixture.result) return { ok: false, reason: 'Ton match t’attend. Les gars sont déjà en crampons.' };
  if (state.dialogue) return { ok: false, reason: 'Quelqu’un attend ta réponse dans le bureau.' };
  return { ok: true };
}

/** Passe à la semaine suivante : autres matchs, vie du vestiaire, finances, président, mercato (TECH-03 : appelé entre deux journées). */
export function advanceWeek(state: GameState): void {
  const check = canAdvanceWeek(state);
  if (!check.ok) throw new Error(check.reason);
  withRng(state, (rng) => {
    state.news = [];
    for (const fixture of weekFixtures(state)) if (!fixture.result) playAiFixture(state, fixture, rng);
    const fixture = humanFixture(state);
    const outcome = fixture ? outcomeFor(fixture, state.humanClubId) : null;
    updateHumanSquad(state, fixture, outcome, rng);
    recoverAiSquads(state);
    settleFinances(state, fixture, outcome);
    updatePresident(state, fixture, outcome);
    updateOffers(state, rng);
    advanceCup(state, rng);
    maybeOpenDialogue(state, rng);
    state.teamNight = 'none';
    state.finesCollected = 0;
    state.finesPaid = 0;
    if (state.status === 'fired') return;
    state.week += 1;
    if (state.week > SEASON_WEEKS) endSeason(state, rng);
    callUpAllStandIns(state, rng);
    refreshAiLineups(state);
  });
}

function callUpAllStandIns(state: GameState, rng: Rng): void {
  for (const clubId of Object.keys(state.clubs)) {
    const count = callUpStandIns(state, clubId, rng);
    if (count > 0 && clubId === state.humanClubId) {
      state.news.push(`Effectif décimé : ${count} dépanneur(s) signent, dont le cousin du président. Il a amené ses crampons.`);
    }
  }
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

/** Vie du vestiaire (EFF-04 à EFF-07, FRAS-01, FRAS-06) et unes de la presse locale (FRAS-03, FRAS-04). */
function updateHumanSquad(state: GameState, fixture: Fixture | null, outcome: MatchOutcome | null, rng: Rng): void {
  const lineup = humanClub(state).lineup;
  const result = weeklySquadUpdate({
    squad: humanSquad(state),
    appearances: fixture && lineup ? lineup.starters : [],
    matchOutcome: outcome,
    houseRules: state.houseRules,
    teamNight: state.teamNight,
    abilityOf: getAbility,
    rng,
  });
  replacePlayers(state, result.squad);
  state.abilityContext = result.abilityContext;
  state.news.push(...result.messages);
  const events = [...result.events];
  if (fixture) {
    const { scored, conceded } = goalsFor(fixture, state.humanClubId);
    const humiliation = humiliationEvent(scored, conceded);
    if (humiliation) events.push(humiliation);
  }
  publishFrontPage(state, events, rng);
  state.press.length = Math.min(state.press.length, PRESS_KEPT);
}

/** Une seule une par semaine (FRAS-03) : la frasque qui fait le plus de dégâts auprès du président. */
function publishFrontPage(state: GameState, events: readonly FrasqueEvent[], rng: Rng): void {
  const context = { week: state.week, season: state.season, clubName: humanClub(state).name, rng };
  const articles = events.map((event) => writeArticle(event, context));
  const frontPage = articles.reduce<PressArticle | null>(
    (worst, article) => (!worst || article.presidentDelta < worst.presidentDelta ? article : worst),
    null,
  );
  const humiliated = events.some((event) => event.kind === 'humiliatingDefeat');
  if (!frontPage || (!humiliated && !rng.chance(FRONT_PAGE_CHANCE))) return;
  state.press.unshift(frontPage);
  writeOutlook(state, applyPressArticle(outlookOf(state), frontPage));
  state.news.push(`À la une de L'Écho de la Buvette : « ${frontPage.headline} »`);
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

/** Bilan financier hebdomadaire (CLUB-01). */
function settleFinances(state: GameState, fixture: Fixture | null, outcome: MatchOutcome | null): void {
  const club = humanClub(state);
  const lines = weeklyBalance({
    divisionTier: humanDivision(state).tier,
    sponsorMood: state.outlook.sponsorMood,
    matchOutcome: outcome,
    homeMatch: fixture?.homeId === club.id,
    teamNight: state.teamNight,
    wageBill: wageBill(humanSquad(state)),
    finesCollected: state.finesCollected,
    finesPaid: state.finesPaid,
  });
  state.clubs[club.id] = applyBalance(club, lines);
  state.lastFinance = lines;
}

/** Confiance du président après le match (CLUB-05) ; licenciement à zéro. */
function updatePresident(state: GameState, fixture: Fixture | null, outcome: MatchOutcome | null): void {
  if (fixture && outcome) {
    const isHome = fixture.homeId === state.humanClubId;
    const opponent = state.clubs[isHome ? fixture.awayId : fixture.homeId]!;
    const { scored, conceded } = goalsFor(fixture, state.humanClubId);
    const change = confidenceAfterMatch(state.outlook.presidentConfidence, {
      outcome,
      expectation: matchExpectation(humanClub(state).reputation, opponent.reputation, isHome),
      goalDifference: scored - conceded,
    });
    state.outlook.presidentConfidence = change.confidence;
    state.news.push(`Le président : « ${change.message} »`);
    state.streak = {
      wins: outcome === 'win' ? state.streak.wins + 1 : 0,
      losses: outcome === 'loss' ? state.streak.losses + 1 : 0,
    };
  }
  if (fixture?.competition === 'league') applyStandingTrend(state);
  if (isFired(state.outlook.presidentConfidence)) {
    state.status = 'fired';
    state.news.push('Le président a appelé. Il n’a rien dit. Puis il a raccroché. Tu es licencié.');
  }
}

function applyStandingTrend(state: GameState): void {
  const division = humanDivision(state);
  const position = divisionStandings(state, division.id).findIndex((row) => row.clubId === state.humanClubId) + 1;
  const trend = confidenceTrend(position, state.objective, division.clubIds.length, division.relegated);
  state.outlook.presidentConfidence = clampGauge(state.outlook.presidentConfidence + trend);
}

/** Offres des clubs IA sur les joueurs du coach (CLUB-03). */
function updateOffers(state: GameState, rng: Rng): void {
  const nextWeek = state.week + 1;
  state.offers = activeOffers(state.offers, nextWeek);
  const offers = generateIncomingOffers(
    { clubs: state.clubs, players: state.players },
    { coachClubId: state.humanClubId, week: nextWeek, windowOpen: isTransferWindowOpen(nextWeek), abilityOf: getAbility, rng },
  );
  state.offers.push(...offers);
  if (offers.length > 0) state.news.push(`${offers.length} offre(s) reçue(s) pour tes joueurs. Le fax chauffe.`);
}

function advanceCup(state: GameState, rng: Rng): void {
  const { cup } = state;
  if (cup.currentRound < cup.totalRounds && isCupRoundComplete(cup, cup.currentRound)) {
    state.cup = drawNextCupRound(cup, rng);
  }
}

/** Dialogue de la semaine (CLUB-06). */
function maybeOpenDialogue(state: GameState, rng: Rng): void {
  if (state.dialogue || !rng.chance(DIALOGUE_CHANCE)) return;
  const squad = humanSquad(state);
  const saddest = squad.reduce<Player | null>((low, player) => (!low || player.morale < low.morale ? player : low), null);
  const { dialogue, playerId } = pickWeeklyDialogue(
    {
      losingStreak: state.streak.losses,
      winningStreak: state.streak.wins,
      recentFrasque: state.press.some((article) => article.week === state.week && article.season === state.season),
      budget: humanClub(state).budget,
      presidentConfidence: state.outlook.presidentConfidence,
      lastTeamNight: state.teamNight,
      transferRequestPlayerId: squad.find((player) => player.transferRequested)?.id ?? null,
      unhappyPlayerId: saddest && saddest.morale < 35 ? saddest.id : null,
      recentDialogueIds: state.recentDialogueIds,
    },
    rng,
  );
  state.dialogue = { dialogueId: dialogue.id, playerId: playerId ?? rng.pick(squad).id };
  state.recentDialogueIds = [dialogue.id, ...state.recentDialogueIds].slice(0, RECENT_DIALOGUES_KEPT);
}
