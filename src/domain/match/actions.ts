/**
 * Faits de jeu partagés par la simulation et les capacités : buts, cartons,
 * blessures, mises hors jeu, Jauge de Gueulante. Toutes ces fonctions mutent l'état.
 */
import { clamp } from '../core/rng';
import { comment } from './commentary';
import { creditActive, IMPACT } from './impact';
import { GAUGE_MAX, opponentSide, pushEvent, teamOf, type Run } from './state';
import type { Consequence, MatchPlayer, MatchState, Side, TeamState } from './types';
import { openTriggers } from './windows';

/** Points de jauge gagnés quand l'équipe encaisse (CAP-05). */
export const GAUGE_ON_CONCEDED = 1;
const SUSPENSION_SECOND_YELLOW = 1;
const SUSPENSION_DIRECT_RED = 2;
/** La plupart des blessures se soignent dans la semaine ; les grosses, rares, coûtent plusieurs matchs. */
export const SERIOUS_INJURY_CHANCE = 0.1;
const SERIOUS_INJURY_WEEKS_MIN = 3;
const SERIOUS_INJURY_WEEKS_MAX = 5;

export function scoreLine(state: MatchState): string {
  return `${state.home.name} ${state.home.goals}-${state.away.goals} ${state.away.name}`;
}

/** Ajoute des points à la Jauge de Gueulante, plafonnée à 10 (CAP-05). */
export function addGauge(team: TeamState, points: number): void {
  team.gauge = clamp(team.gauge + points, 0, GAUGE_MAX);
}

export function addConsequence(team: TeamState, consequence: Consequence): void {
  team.consequences.push(consequence);
}

interface GoalOptions {
  penalty?: boolean;
}

/** Marque un but pour `side`. */
export function recordGoal(run: Run, side: Side, scorer: MatchPlayer, options: GoalOptions = {}): void {
  const { state } = run;
  const team = teamOf(state, side);
  const penalty = options.penalty ?? false;
  team.goals++;
  scorer.goals++;
  state.goals.push({
    side,
    playerId: scorer.id,
    minute: state.minute,
    addedMinute: state.addedMinute,
    elapsed: state.elapsed,
    penalty,
    cancelled: false,
  });
  addGauge(teamOf(state, opponentSide(side)), GAUGE_ON_CONCEDED);
  const text = comment(run.rng, penalty ? 'penaltyGoal' : 'goal', { player: scorer.name, team: team.name, score: scoreLine(state) });
  pushEvent(run, 'goal', side, text, { playerId: scorer.id });
  extendGoalEffects(team);
  creditActive(state, side, IMPACT.goalScored, 'but marqué pendant l’effet');
  openTriggers(run, side, 'afterOwnGoal', null);
}

/** Les effets « tant que ça marque » gagnent du temps à chaque but de l'équipe. */
function extendGoalEffects(team: TeamState): void {
  for (const player of team.players) {
    for (const effect of player.effects) {
      if (effect.extendOnGoal) effect.endsAt += effect.extendOnGoal;
    }
  }
}

/** Annule le dernier but de `side` marqué dans les `withinMinutes` dernières minutes. */
export function cancelRecentGoal(run: Run, side: Side, withinMinutes: number): boolean {
  const { state } = run;
  for (let i = state.goals.length - 1; i >= 0; i--) {
    const goal = state.goals[i]!;
    if (state.elapsed - goal.elapsed > withinMinutes) break;
    if (goal.side !== side || goal.cancelled) continue;
    goal.cancelled = true;
    const team = teamOf(state, side);
    team.goals--;
    const scorer = team.players.find((player) => player.id === goal.playerId);
    if (scorer) scorer.goals--;
    pushEvent(run, 'goalCancelled', side, comment(run.rng, 'goalCancelled', { team: team.name, score: scoreLine(state) }));
    return true;
  }
  return false;
}

/**
 * Avertit ou exclut un joueur (2 jaunes = rouge). Rend le carton réellement donné,
 * `null` si le joueur est déjà exclu.
 */
export function bookPlayer(run: Run, player: MatchPlayer, card: 'yellow' | 'red'): 'yellow' | 'red' | null {
  const { state } = run;
  const team = teamOf(state, player.side);
  if (player.sentOff) return null;
  const secondYellow = card === 'yellow' && player.yellowCards === 1;
  if (card === 'yellow') player.yellowCards++;
  const given = card === 'red' || secondYellow ? 'red' : 'yellow';
  state.cards.push({ side: player.side, playerId: player.id, minute: state.minute, card: given, secondYellow });
  const vars = { player: player.name, team: team.name };
  if (given === 'yellow') {
    pushEvent(run, 'yellowCard', player.side, comment(run.rng, 'yellowCard', vars), { playerId: player.id });
    return given;
  }
  player.sentOff = true;
  const key = secondYellow ? 'secondYellow' : 'redCard';
  pushEvent(run, 'redCard', player.side, comment(run.rng, key, vars), { playerId: player.id });
  addConsequence(team, {
    type: 'suspension',
    playerId: player.id,
    matches: secondYellow ? SUSPENSION_SECOND_YELLOW : SUSPENSION_DIRECT_RED,
    reason: 'Carton rouge',
  });
  return given;
}

/** Blessure en match : le joueur sort, sans remplacement en V1 (MATCH-08). */
export function injurePlayer(run: Run, player: MatchPlayer): void {
  const { state } = run;
  const team = teamOf(state, player.side);
  const serious = run.rng.chance(SERIOUS_INJURY_CHANCE);
  const weeks = serious ? run.rng.int(SERIOUS_INJURY_WEEKS_MIN, SERIOUS_INJURY_WEEKS_MAX) : 0;
  player.injured = true;
  state.injuries.push({ side: player.side, playerId: player.id, minute: state.minute, weeks });
  if (serious) addConsequence(team, { type: 'injury', playerId: player.id, weeks, reason: 'Grosse blessure en match' });
  const text = comment(run.rng, serious ? 'injury' : 'injuryMinor', { player: player.name, team: team.name, weeks });
  pushEvent(run, 'injury', player.side, text, { playerId: player.id });
}

/** Met un joueur hors jeu `minutes` minutes, avec un effet visible (CAP-09). */
export function knockOut(run: Run, player: MatchPlayer, minutes: number, label: string): void {
  const { state } = run;
  const until = state.elapsed + minutes;
  player.knockedOutUntil = Math.max(player.knockedOutUntil, until);
  player.effects.push({ label, stat: 'knockout', value: -1, endsAt: until });
  const text = comment(run.rng, 'knockout', {
    player: player.name,
    team: teamOf(state, player.side).name,
    minutes,
  });
  pushEvent(run, 'effect', player.side, text, { playerId: player.id });
}

/** Retire les effets terminés (CAP-09). */
export function expireEffects(state: MatchState): void {
  expireTeamEffects(state.home, state.elapsed);
  expireTeamEffects(state.away, state.elapsed);
}

function expireTeamEffects(team: TeamState, elapsed: number): void {
  for (const player of team.players) {
    const effects = player.effects;
    for (let i = effects.length - 1; i >= 0; i--) {
      if (effects[i]!.endsAt < elapsed) effects.splice(i, 1);
    }
  }
}
