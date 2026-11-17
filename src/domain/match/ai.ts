/**
 * IA du coach adverse (MATCH-07) : heuristique simple et peu coûteuse. Elle suit le style de son
 * club (C6), change de consignes selon le score, remplace ses blessés et ses joueurs cuits, garde
 * sa jauge pour ses grosses capacités, et ne gaspille pas une capacité inutile. Ses activations
 * passent par le même moteur et sont annoncées dans le live.
 */
import type { AbilityCategory, Effect } from '../types';
import { AI_STYLE_PLAN, tacticsFor } from '../club/aiStyle';
import { checkAvailability, performActivation } from './activation';
import { opponentSide, pushEvent, teamOf, type Run } from './state';
import { aiReplaceInjured, canEnter, performSubstitution, substitutionsLeft } from './substitutions';
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

/** En dessous, une résurrection ne vaut pas son prix. */
const MIRACLE_FATIGUE = 45;
/** À partir de ce coût, l'IA garde sa jauge pour pouvoir la lancer. */
const BIG_ABILITY_COST = 5;
/** Une Surcharge (M13) ne vaut le coup qu'avec une jauge bien remplie. */
const OVERCHARGE_MIN_GAUGE = 6;
/** Fatigue moyenne en dessous de laquelle une capacité d'énergie pour l'équipe attend. */
const ENERGY_MIN_FATIGUE = 25;

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

/** Changements pour fatigue : à partir de cette minute, au-delà de cette fatigue. */
const TIRED_SUB_MINUTE = 60;
const TIRED_FATIGUE = 65;
/** L'IA garde toujours des changements pour ses blessés. */
const SUBS_KEPT_FOR_INJURIES = 2;
const TIRED_SUB_CHANCE = 0.25;

/** Tour de l'IA à chaque minute de jeu. Mute l'état. */
export function aiTakeTurn(run: Run, side: Side): void {
  const { state, rng } = run;
  const team = teamOf(state, side);
  aiReplaceInjured(run, team);
  adjustTactics(run, team);
  restTiredPlayer(run, team);
  const think = state.minute >= LATE_GAME_MINUTE ? LATE_GAME_THINK_CHANCE : THINK_CHANCE;
  if (!rng.chance(think)) return;
  const weights = CATEGORY_WEIGHTS[situationOf(state, side)];
  const saving = isSavingForBigAbility(state, side);
  let best: MatchPlayer | undefined;
  let bestScore = 0;
  for (const player of team.players) {
    if (!player.ability || checkAvailability(state, side, player) !== null || wouldBackfire(state, side, player)) continue;
    if (saving && player.ability.cost < BIG_ABILITY_COST) continue;
    const taste = team.aiStyle ? AI_STYLE_PLAN[team.aiStyle].taste[player.ability.category] : 1;
    const score = weights[player.ability.category] * taste * rng.next();
    if (score > bestScore) {
      best = player;
      bestScore = score;
    }
  }
  if (best) activate(run, side, best);
}

/** Le coach IA change de plan selon le score et la minute, à la manière de son style (C6). */
function adjustTactics(run: Run, team: TeamState): void {
  if (!team.aiStyle) return;
  const { state } = run;
  const difference = team.goals - teamOf(state, opponentSide(team.side)).goals;
  const wanted = tacticsFor(team.aiStyle, difference, state.minute);
  const current = team.instructions;
  if (wanted.mentality === current.mentality && wanted.highPress === current.highPress && wanted.longBall === current.longBall) return;
  team.instructions = { ...wanted };
  const text =
    wanted.mentality === 'offensive' && current.mentality !== 'offensive'
      ? `${team.name} jette toutes ses forces vers l'avant.`
      : wanted.mentality === 'defensive' && current.mentality !== 'defensive'
        ? `${team.name} ferme la boutique : tout le monde derrière.`
        : `${team.name} revient à son plan de jeu.`;
  pushEvent(run, 'substitution', team.side, text);
}

/** Un joueur cuit est remplacé par un remplaçant du même poste, en gardant des changements pour les blessés. */
function restTiredPlayer(run: Run, team: TeamState): void {
  const { state, rng } = run;
  if (state.minute < TIRED_SUB_MINUTE || substitutionsLeft(team) <= SUBS_KEPT_FOR_INJURIES || !rng.chance(TIRED_SUB_CHANCE)) return;
  const tired = team.players
    .filter((player) => player.line !== null && player.line !== 'GK' && !player.sentOff && !player.injured && player.profile.fatigue >= TIRED_FATIGUE)
    .sort((a, b) => b.profile.fatigue - a.profile.fatigue)[0];
  if (!tired) return;
  const entering = team.players.filter(canEnter).find((player) => player.profile.position === tired.line);
  if (entering) performSubstitution(run, team, tired, entering);
}

/** L'IA ne gaspille pas une capacité qui ne servirait à rien, ou se retournerait contre elle. */
function wouldBackfire(state: MatchState, side: Side, player: MatchPlayer): boolean {
  const effects = player.ability!.effects;
  const team = teamOf(state, side);
  const opponents = teamOf(state, opponentSide(side));
  const has = (type: Effect['type']) => effects.some((effect) => effect.type === type);
  if (has('miracle')) return !team.players.some(needsMiracle);
  // N'inverse pas les niveaux quand elle est déjà la plus forte.
  if (has('swapTeams') && teamLevel(team) >= teamLevel(opponents)) return true;
  // Ne remonte pas le temps si elle a marqué autant que l'adversaire sur la période effacée.
  for (const effect of effects) {
    if (effect.type !== 'rewind') continue;
    const since = state.elapsed - effect.minutes;
    const goals = (s: Side) => state.goals.filter((goal) => goal.side === s && !goal.cancelled && goal.elapsed >= since).length;
    if (goals(side) >= goals(opponentSide(side))) return true;
  }
  // Rien à soigner : pas de malus à retirer.
  if (has('clearMaluses') && !team.players.some((member) => member.effects.some((effect) => effect.value < 0 && effect.stat !== 'knockout'))) return true;
  if (has('overcharge') && team.gauge < OVERCHARGE_MIN_GAUGE) return true;
  // Une capacité d'énergie d'équipe attend que les jambes soient lourdes.
  if (effects.some((effect) => effect.type === 'energy' && effect.scope === 'team') && averageFatigue(team) < ENERGY_MIN_FATIGUE) return true;
  return false;
}

function averageFatigue(team: TeamState): number {
  const onPitch = team.players.filter((player) => player.line !== null);
  return onPitch.reduce((total, player) => total + player.profile.fatigue, 0) / Math.max(1, onPitch.length);
}

function needsMiracle(player: MatchPlayer): boolean {
  return player.line !== null && (player.sentOff || player.injured || player.profile.fatigue >= MIRACLE_FATIGUE);
}

/** Tant que sa grosse capacité (coût 5 ou plus) n'est pas partie, l'IA garde sa jauge pour atteindre le coût. */
function isSavingForBigAbility(state: MatchState, side: Side): boolean {
  return teamOf(state, side).players.some((player) => {
    const ability = player.ability;
    if (!ability || ability.cost < BIG_ABILITY_COST || player.usedAbility || player.subbedOff || player.sentOff || player.injured) return false;
    return (player.line !== null || ability.position === 'BENCH') && !wouldBackfire(state, side, player);
  });
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
    if (!fitsSetPiece(state, player.ability.effects)) continue;
    if (rng.chance(TRIGGER_USE_CHANCE)) activate(run, side, player);
  }
}

/** Un bonus de tir direct ne sert à rien sur un centre (et inversement) : l'IA ne le gaspille pas. */
function fitsSetPiece(state: MatchState, effects: readonly Effect[]): boolean {
  const play = state.pendingPlay;
  const option = play?.kind === 'corner' ? 'cross' : play?.option;
  return effects.every((effect) => effect.type !== 'setPieceBoost' || option === undefined || effect.option === option);
}

function activate(run: Run, side: Side, player: MatchPlayer): void {
  performActivation(run, { side, player, targets: chooseTargets(run.state, player), byAi: true });
}

/**
 * Adversaires : les plus dangereux d'abord. Coéquipiers : les plus fatigués pour une capacité d'énergie,
 * ceux qui ont des malus pour un soin, les meilleurs sinon (bouclier, bonus).
 */
function chooseTargets(state: MatchState, player: MatchPlayer): MatchPlayer[] {
  const ability = player.ability!;
  const count = chosenTargetCount(ability);
  if (count === 0) return [];
  const candidates = validTargets(state, player, ability);
  const effects = ability.effects;
  const maluses = (member: MatchPlayer) => member.effects.filter((effect) => effect.value < 0).length;
  if (ability.targeting.kind !== 'teammate') candidates.sort((a, b) => b.rating - a.rating);
  else if (effects.some((effect) => effect.type === 'energy')) candidates.sort((a, b) => b.profile.fatigue - a.profile.fatigue);
  else if (effects.some((effect) => effect.type === 'clearMaluses')) candidates.sort((a, b) => maluses(b) - maluses(a) || b.rating - a.rating);
  else candidates.sort((a, b) => b.rating - a.rating);
  return candidates.slice(0, count);
}
