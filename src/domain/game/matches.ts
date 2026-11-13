import { gainXp } from '../abilities/progression';
import type { Rng } from '../core/rng';
import { autoLineup, validateLineup, type LineupError } from '../league/lineup';
import { createMatch, simulateQuick, summarize } from '../match';
import type { Consequence, MatchState, MatchSummary, PlayerReport, Side, TeamSheet } from '../match/types';
import { overall } from '../player/rating';
import type { Fixture, MatchResult, Player } from '../types';
import { facilitiesOf, facilityBonus } from '../club/facilities';
import { DIFFICULTIES } from './difficulty';
import { clubPlayers, humanFixture, humanSquad, isDerby } from './selectors';
import type { GameState } from './state';
import { asCoachOfClub } from './coaches';
import { scoutOpponents } from './scouting';
import { autoPickLineup } from './actions';

/** Fatigue d'un match simulé rapidement (matchs IA contre IA). */
const QUICK_MATCH_FATIGUE = 40;

export function teamSheet(state: GameState, clubId: string): TeamSheet {
  const club = state.clubs[clubId];
  if (!club) throw new Error(`Club inconnu : ${clubId}`);
  const lineup = club.lineup ?? autoLineup(clubPlayers(state, clubId), '4-4-2');
  const byId = (id: string) => state.players[id];
  const starters = lineup.starters.map(byId).filter((player): player is Player => player !== undefined);
  const bench = lineup.bench.map(byId).filter((player): player is Player => player !== undefined);
  const captain = starters.reduce((best, player) => (overall(player) > overall(best) ? player : best), starters[0]!);
  return {
    clubId,
    name: club.name,
    starters,
    bench,
    formation: lineup.formation,
    instructions: lineup.instructions,
    captainId: captain.id,
    isHuman: club.isHuman,
  };
}

/** Match IA contre IA : simulation rapide, sans minute par minute (green code). */
export function playAiFixture(state: GameState, fixture: Fixture, rng: Rng): void {
  const home = teamSheet(state, fixture.homeId);
  const away = teamSheet(state, fixture.awayId);
  fixture.result = simulateQuick(home, away, rng, fixture.competition !== 'league');
  for (const player of [...home.starters, ...away.starters]) {
    player.fatigue = Math.min(100, player.fatigue + QUICK_MATCH_FATIGUE);
    player.seasonStats.matches += 1;
  }
  for (const scorer of fixture.result.scorers) {
    const player = state.players[scorer.playerId];
    if (player) player.seasonStats.goals += 1;
    const assister = scorer.assistId ? state.players[scorer.assistId] : undefined;
    if (assister) assister.seasonStats.assists += 1;
  }
}

/** Erreurs de composition qui empêchent de lancer le match (EFF-03). */
export function humanLineupErrors(state: GameState): LineupError[] {
  const lineup = state.clubs[state.humanClubId]?.lineup;
  if (!lineup) return [{ code: 'notEnoughStarters', message: 'Pas de composition. Même au foot à 7, il faut quelqu’un.' }];
  return validateLineup(lineup, humanSquad(state));
}

/** Prépare le match du coach de la semaine (MATCH-01). */
export function startHumanMatch(state: GameState, rng: Rng): MatchState {
  const fixture = humanFixture(state);
  if (!fixture || fixture.result) throw new Error('Pas de match à jouer cette semaine');
  const errors = humanLineupErrors(state);
  if (errors.length > 0) throw new Error(errors[0]!.message);
  const humanSide: Side = fixture.homeId === state.humanClubId ? 'home' : 'away';
  const aiSide: Side = humanSide === 'home' ? 'away' : 'home';
  const boost = DIFFICULTIES[state.difficulty].opponentBoost;
  return createMatch({
    home: teamSheet(state, fixture.homeId),
    away: teamSheet(state, fixture.awayId),
    seed: rng.int(1, 2 ** 31 - 2),
    knockout: fixture.competition !== 'league',
    homeAdvantage: facilityBonus.homeAdvantage(facilitiesOf(state.clubs[fixture.homeId]!)),
    ...(boost !== 0 ? { boosts: { [aiSide]: boost } } : {}),
    derby: isDerby(state, fixture),
  });
}

/** Reporte le match du coach sur la partie : résultat, fatigue, cartons, blessures, progression des capacités. */
export function finishHumanMatch(state: GameState, match: MatchState): MatchSummary {
  const summary = summarize(match);
  applyHumanMatchSummary(state, summary);
  return summary;
}

/** Reporte un match déjà joué (son résumé) : en multi, le client joue son match et envoie le résumé. */
export function applyHumanMatchSummary(state: GameState, summary: MatchSummary): void {
  const fixture = humanFixture(state);
  if (!fixture) throw new Error('Pas de match du coach cette semaine');
  if (fixture.result) throw new Error('Ce match a déjà été joué.');
  recordMatch(state, fixture, summary);
  applyCoachSide(state, fixture, summary);
}

/**
 * Match entre deux coachs de la ligue (MULTI-07) : joué en direct sur le serveur. Pas de bonus de
 * difficulté : à armes égales. Une compo invalide est refaite par l'adjoint au coup d'envoi.
 */
export function startDuelMatch(state: GameState, fixture: Fixture, rng: Rng): MatchState {
  if (fixture.result) throw new Error('Ce match a déjà été joué.');
  for (const clubId of [fixture.homeId, fixture.awayId]) {
    asCoachOfClub(state, clubId, () => {
      if (humanLineupErrors(state).length > 0) autoPickLineup(state);
    });
  }
  let derby = false;
  asCoachOfClub(state, fixture.homeId, () => (derby = isDerby(state, fixture)));
  asCoachOfClub(state, fixture.awayId, () => (derby ||= isDerby(state, fixture)));
  return createMatch({
    home: teamSheet(state, fixture.homeId),
    away: teamSheet(state, fixture.awayId),
    seed: rng.int(1, 2 ** 31 - 2),
    knockout: fixture.competition !== 'league',
    homeAdvantage: facilityBonus.homeAdvantage(facilitiesOf(state.clubs[fixture.homeId]!)),
    derby,
  });
}

/** Reporte un match entre deux coachs : un seul résultat, puis les suites de chaque côté pour chaque coach. */
export function applyDuelSummary(state: GameState, fixture: Fixture, summary: MatchSummary): void {
  if (fixture.result) throw new Error('Ce match a déjà été joué.');
  recordMatch(state, fixture, summary);
  for (const clubId of [fixture.homeId, fixture.awayId]) asCoachOfClub(state, clubId, () => applyCoachSide(state, fixture, summary));
}

/** Résultat et rapports de tous les joueurs du match. */
function recordMatch(state: GameState, fixture: Fixture, summary: MatchSummary): void {
  fixture.result = toResult(summary, fixture);
  for (const report of summary.players) applyPlayerReport(state, report, summary);
}

/** Ce qui ne concerne que le coach au focus : ses joueurs alignés, ses blessés et suspendus. */
function applyCoachSide(state: GameState, fixture: Fixture, summary: MatchSummary): void {
  state.lastAppearances = summary.players.filter((report) => report.played && state.players[report.playerId]?.clubId === state.humanClubId).map((report) => report.playerId);
  const humanSide: Side = fixture.homeId === state.humanClubId ? 'home' : 'away';
  for (const consequence of summary.consequences[humanSide]) applyConsequence(state, consequence);
  // L'adversaire affronté est connu de la cellule de scouts (CLUB-10).
  scoutOpponents(state, humanSide === 'home' ? fixture.awayId : fixture.homeId);
}

function toResult(summary: MatchSummary, fixture: Fixture): MatchResult {
  const clubOf = (side: Side) => (side === 'home' ? fixture.homeId : fixture.awayId);
  return {
    homeGoals: summary.homeGoals,
    awayGoals: summary.awayGoals,
    ...(summary.shootout ? { penaltyWinnerId: clubOf(summary.shootout.winner) } : {}),
    scorers: summary.goals
      .filter((goal) => !goal.cancelled)
      .map((goal) => ({ playerId: goal.playerId, clubId: clubOf(goal.side), minute: goal.minute, ...(goal.assistId ? { assistId: goal.assistId } : {}) })),
  };
}

function applyPlayerReport(state: GameState, report: PlayerReport, summary: MatchSummary): void {
  const player = state.players[report.playerId];
  if (!player) return;
  player.ability.revealed ||= report.abilityRevealed;
  const xp = summary.xpGains[player.id] ?? 0;
  if (xp > 0) {
    player.ability = gainXp(player.ability, xp);
  }
  if (!report.played) return;
  player.fatigue = report.fatigue;
  player.seasonStats.matches += 1;
  player.seasonStats.goals += report.goals;
  player.seasonStats.assists += report.assists;
  player.seasonStats.yellowCards += report.yellowCards;
  // Les suspensions pour carton rouge arrivent par les conséquences du match.
  if (report.sentOff) player.seasonStats.redCards += 1;
  const injury = summary.injuries.find((entry) => entry.playerId === player.id);
  if (injury) player.injuryWeeks = Math.max(player.injuryWeeks, injury.weeks);
}

function applyConsequence(state: GameState, consequence: Consequence): void {
  switch (consequence.type) {
    case 'injury':
      bumpPlayer(state, consequence.playerId, (player) => (player.injuryWeeks = Math.max(player.injuryWeeks, consequence.weeks)));
      break;
    case 'suspension':
      bumpPlayer(state, consequence.playerId, (player) => (player.suspendedMatches += consequence.matches));
      break;
    case 'abilityRevealed':
      break;
  }
  if ('reason' in consequence) state.news.push(consequence.reason);
}

function bumpPlayer(state: GameState, playerId: string, update: (player: Player) => void): void {
  const player = state.players[playerId];
  if (player) update(player);
}
