import { levelForXp } from '../abilities/progression';
import { clampGauge } from '../club/model';
import type { Rng } from '../core/rng';
import { autoLineup, validateLineup, type LineupError } from '../league/lineup';
import { createMatch, simulateQuick, summarize } from '../match';
import type { Consequence, MatchState, MatchSummary, PlayerReport, Side, TeamSheet } from '../match/types';
import { overall } from '../player/rating';
import type { Fixture, MatchResult, Player, PressArticle } from '../types';
import { clubPlayers, humanFixture, humanSquad } from './selectors';
import type { GameState } from './state';

/** Fatigue d'un match simulé rapidement (matchs IA contre IA). */
const QUICK_MATCH_FATIGUE = 25;
const PRESS_PRESIDENT_DELTA = -2;

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
    context: club.isHuman ? state.abilityContext : { teamNight: 'none', houseRules: [] },
    isHuman: club.isHuman,
  };
}

/** Match IA contre IA : simulation rapide, sans minute par minute (green code). */
export function playAiFixture(state: GameState, fixture: Fixture, rng: Rng): void {
  const home = teamSheet(state, fixture.homeId);
  const away = teamSheet(state, fixture.awayId);
  fixture.result = simulateQuick(home, away, rng, fixture.competition === 'cup');
  for (const player of [...home.starters, ...away.starters]) {
    player.fatigue = Math.min(100, player.fatigue + QUICK_MATCH_FATIGUE);
    player.seasonStats.matches += 1;
  }
  for (const scorer of fixture.result.scorers) {
    const player = state.players[scorer.playerId];
    if (player) player.seasonStats.goals += 1;
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
  return createMatch({
    home: teamSheet(state, fixture.homeId),
    away: teamSheet(state, fixture.awayId),
    seed: rng.int(1, 2 ** 31 - 2),
    knockout: fixture.competition === 'cup',
  });
}

/** Reporte le match du coach sur la partie : résultat, joueurs, conséquences hors match. */
export function finishHumanMatch(state: GameState, match: MatchState): MatchSummary {
  const fixture = humanFixture(state);
  if (!fixture) throw new Error('Pas de match du coach cette semaine');
  const summary = summarize(match);
  fixture.result = toResult(summary, fixture);
  for (const report of summary.players) applyPlayerReport(state, report, summary);
  const humanSide: Side = fixture.homeId === state.humanClubId ? 'home' : 'away';
  for (const consequence of summary.consequences[humanSide]) applyConsequence(state, consequence);
  return summary;
}

function toResult(summary: MatchSummary, fixture: Fixture): MatchResult {
  const clubOf = (side: Side) => (side === 'home' ? fixture.homeId : fixture.awayId);
  const opposite = (side: Side): Side => (side === 'home' ? 'away' : 'home');
  return {
    homeGoals: summary.homeGoals,
    awayGoals: summary.awayGoals,
    ...(summary.shootout ? { penaltyWinnerId: clubOf(summary.shootout.winner) } : {}),
    scorers: summary.goals
      .filter((goal) => !goal.cancelled)
      .map((goal) => ({
        playerId: goal.playerId,
        clubId: clubOf(goal.ownGoal ? opposite(goal.side) : goal.side),
        minute: goal.minute,
      })),
  };
}

function applyPlayerReport(state: GameState, report: PlayerReport, summary: MatchSummary): void {
  const player = state.players[report.playerId];
  if (!player) return;
  player.ability.revealed ||= report.abilityRevealed;
  player.ability.seasonUses = report.seasonUses;
  const xp = summary.xpGains[player.id] ?? 0;
  if (xp > 0) {
    player.ability.xp += xp;
    player.ability.level = levelForXp(player.ability.xp);
  }
  if (!report.played) return;
  player.fatigue = report.fatigue;
  player.morale = report.morale;
  player.seasonStats.matches += 1;
  player.seasonStats.goals += report.goals;
  player.seasonStats.yellowCards += report.yellowCards;
  // Les suspensions pour carton rouge arrivent par les conséquences du match.
  if (report.sentOff) player.seasonStats.redCards += 1;
  const injury = summary.injuries.find((entry) => entry.playerId === player.id);
  if (injury) player.injuryWeeks = Math.max(player.injuryWeeks, injury.weeks);
}

function applyConsequence(state: GameState, consequence: Consequence): void {
  const club = state.clubs[state.humanClubId]!;
  switch (consequence.type) {
    case 'fine':
      state.finesPaid += consequence.amount;
      break;
    case 'budget':
      club.budget += consequence.amount;
      break;
    case 'presidentConfidence':
      state.outlook.presidentConfidence = clampGauge(state.outlook.presidentConfidence + consequence.value);
      break;
    case 'injury':
      bumpPlayer(state, consequence.playerId, (player) => (player.injuryWeeks = Math.max(player.injuryWeeks, consequence.weeks)));
      break;
    case 'suspension':
      bumpPlayer(state, consequence.playerId, (player) => (player.suspendedMatches += consequence.matches));
      break;
    case 'squadFatigue':
      for (const player of humanSquad(state)) player.fatigue = clampGauge(player.fatigue + consequence.value);
      break;
    case 'press':
      state.press.unshift(pressArticle(state, consequence.headline));
      state.outlook.presidentConfidence = clampGauge(state.outlook.presidentConfidence + PRESS_PRESIDENT_DELTA);
      break;
    case 'seasonUse':
    case 'abilityRevealed':
      break;
  }
  if ('reason' in consequence) state.news.push(consequence.reason);
}

function bumpPlayer(state: GameState, playerId: string, update: (player: Player) => void): void {
  const player = state.players[playerId];
  if (player) update(player);
}

function pressArticle(state: GameState, headline: string): PressArticle {
  return {
    id: `press-${state.season}-${state.week}-${state.press.length}`,
    week: state.week,
    season: state.season,
    headline,
    presidentDelta: PRESS_PRESIDENT_DELTA,
    sponsorDelta: 0,
  };
}
