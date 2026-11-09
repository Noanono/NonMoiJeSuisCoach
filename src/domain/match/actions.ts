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
export const GAUGE_ON_CONCEDED = 2;
const SUSPENSION_SECOND_YELLOW = 1;
const SUSPENSION_DIRECT_RED = 2;
const INJURY_WEEKS_MIN = 1;
const INJURY_WEEKS_MAX = 4;

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
  ownGoal?: boolean;
  penalty?: boolean;
}

/** Marque un but pour `side`. `scorer` est l'adversaire fautif en cas de csc. */
export function recordGoal(run: Run, side: Side, scorer: MatchPlayer, options: GoalOptions = {}): void {
  const { state } = run;
  const team = teamOf(state, side);
  const ownGoal = options.ownGoal ?? false;
  const penalty = options.penalty ?? false;
  team.goals++;
  if (!ownGoal) scorer.goals++;
  state.goals.push({
    side,
    playerId: scorer.id,
    minute: state.minute,
    addedMinute: state.addedMinute,
    elapsed: state.elapsed,
    ownGoal,
    penalty,
    cancelled: false,
  });
  addGauge(teamOf(state, opponentSide(side)), GAUGE_ON_CONCEDED);
  const key = ownGoal ? 'ownGoal' : penalty ? 'penaltyGoal' : 'goal';
  const text = comment(run.rng, key, { player: scorer.name, team: team.name, score: scoreLine(state) });
  pushEvent(run, ownGoal ? 'ownGoal' : 'goal', side, text, { playerId: scorer.id });
  creditActive(state, side, IMPACT.goalScored, 'but marqué pendant l’effet');
  openTriggers(run, side, 'afterOwnGoal', null);
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
    if (!goal.ownGoal) {
      const scorer = team.players.find((player) => player.id === goal.playerId);
      if (scorer) scorer.goals--;
    }
    pushEvent(run, 'goalCancelled', side, comment(run.rng, 'goalCancelled', { team: team.name, score: scoreLine(state) }));
    return true;
  }
  return false;
}

/**
 * Avertit ou exclut un joueur (2 jaunes = rouge). Rend le carton réellement donné,
 * `null` si l'équipe est protégée (« aucun carton ») ou le joueur déjà exclu.
 */
export function bookPlayer(run: Run, player: MatchPlayer, card: 'yellow' | 'red'): 'yellow' | 'red' | null {
  const { state } = run;
  const team = teamOf(state, player.side);
  if (player.sentOff || team.noCardsUntil >= state.elapsed) return null;
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
  const weeks = run.rng.int(INJURY_WEEKS_MIN, INJURY_WEEKS_MAX);
  player.injured = true;
  state.injuries.push({ side: player.side, playerId: player.id, minute: state.minute, weeks });
  addConsequence(team, { type: 'injury', playerId: player.id, weeks, reason: 'Blessure en match' });
  const text = comment(run.rng, 'injury', { player: player.name, team: team.name, weeks });
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

/** Retire les effets terminés (CAP-09). Les effets de moral durent jusqu'au coup de sifflet final. */
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
