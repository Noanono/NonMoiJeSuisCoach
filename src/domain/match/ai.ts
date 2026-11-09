/**
 * IA du coach adverse (MATCH-07) : heuristique simple et peu coûteuse. Elle attaque
 * quand elle est menée, défend quand elle mène, sabote volontiers, et choisit ses
 * cibles parmi les cibles valides. Ses activations passent par le même moteur et
 * sont annoncées dans le live.
 */
import type { AbilityCategory } from '../types';
import { checkAvailability, performActivation } from './activation';
import { opponentSide, teamOf, type Run } from './state';
import { chosenTargetCount, validTargets } from './targets';
import type { MatchPlayer, MatchState, Side, TeamState } from './types';
import { triggerIsOpen } from './windows';

/** Chance que l'IA envisage une activation à une minute donnée. */
const THINK_CHANCE = 0.1;
/** En fin de match, l'IA se lâche. */
const LATE_GAME_MINUTE = 70;
const LATE_GAME_THINK_CHANCE = 0.2;
/** Chance d'utiliser une capacité d'événement disponible (CAP-19). */
const TRIGGER_USE_CHANCE = 0.6;

type Situation = 'trailing' | 'level' | 'leading';

const CATEGORY_WEIGHTS: Record<Situation, Record<AbilityCategory, number>> = {
  trailing: { attack: 3, legendary: 3, sabotage: 2.5, support: 1, defense: 0.2 },
  level: { attack: 1.5, sabotage: 1.5, support: 1, defense: 1, legendary: 0.5 },
  leading: { defense: 3, support: 1.5, sabotage: 1, attack: 0.5, legendary: 0.3 },
};

function situationOf(state: MatchState, side: Side): Situation {
  const diff = teamOf(state, side).goals - teamOf(state, opponentSide(side)).goals;
  return diff < 0 ? 'trailing' : diff > 0 ? 'leading' : 'level';
}

/** Tour de l'IA à chaque minute de jeu. Mute l'état. */
export function aiTakeTurn(run: Run, side: Side): void {
  const { state, rng } = run;
  const think = state.minute >= LATE_GAME_MINUTE ? LATE_GAME_THINK_CHANCE : THINK_CHANCE;
  if (!rng.chance(think)) return;
  const weights = CATEGORY_WEIGHTS[situationOf(state, side)];
  let best: MatchPlayer | undefined;
  let bestScore = 0;
  for (const player of teamOf(state, side).players) {
    if (!player.ability || checkAvailability(state, side, player) !== null || wouldBackfire(state, side, player)) continue;
    const score = weights[player.ability.category] * rng.next();
    if (score > bestScore) {
      best = player;
      bestScore = score;
    }
  }
  if (best) activate(run, side, best);
}

/** L'IA n'inverse pas les niveaux quand elle est déjà la plus forte. */
function wouldBackfire(state: MatchState, side: Side, player: MatchPlayer): boolean {
  if (!player.ability!.effects.some((effect) => effect.type === 'swapTeams')) return false;
  return teamLevel(teamOf(state, side)) >= teamLevel(teamOf(state, opponentSide(side)));
}

function teamLevel(team: TeamState): number {
  return team.players.reduce((total, player) => total + (player.line === null ? 0 : player.rating), 0);
}

/** Réaction immédiate de l'IA à un événement (coup franc, penalty, but, mi-temps). Mute l'état. */
export function aiReactToTrigger(run: Run, side: Side): void {
  const { state, rng } = run;
  const trigger = state.triggers[side];
  for (const player of teamOf(state, side).players) {
    if (!player.ability || player.ability.trigger === 'anytime' || !triggerIsOpen(player.ability.trigger, trigger)) continue;
    if (checkAvailability(state, side, player) !== null) continue;
    if (rng.chance(TRIGGER_USE_CHANCE)) activate(run, side, player);
  }
}

function activate(run: Run, side: Side, player: MatchPlayer): void {
  performActivation(run, { side, player, targets: chooseTargets(run.state, player), byAi: true });
}

/** Adversaires : les plus dangereux d'abord. Coéquipiers : les plus fatigués d'abord. */
function chooseTargets(state: MatchState, player: MatchPlayer): MatchPlayer[] {
  const ability = player.ability!;
  const count = chosenTargetCount(ability);
  if (count === 0) return [];
  const candidates = validTargets(state, player, ability);
  if (ability.targeting.kind === 'teammate') candidates.sort((a, b) => b.profile.fatigue - a.profile.fatigue);
  else candidates.sort((a, b) => b.rating - a.rating);
  return candidates.slice(0, count);
}
