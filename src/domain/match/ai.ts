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

/**
 * L'IA estime la valeur de chaque capacité disponible à cette minute (situation du score, temps qui reste,
 * contexte : blessés, malus, menace adverse…) et lance la meilleure si elle vaut le coup.
 */
export const AI_ACTIVATION_THRESHOLD = 1;
/** En fin de match, la jauge qui reste ne sert plus à rien : l'IA se lâche. */
const LATE_GAME_MINUTE = 75;
const LATE_GAME_URGENCY = 1.6;
/** Jauge presque pleine : ce qui se recharge serait perdu. */
const FULL_GAUGE_URGENCY = 1.6;
const GAUGE_ALMOST_FULL = 9;
/** Un peu d'imprévu, pour que l'IA ne soit pas réglée comme une horloge. */
const DECISION_JITTER = 0.3;
const MATCH_END_MINUTE = 93;
/** Capacité d'occasion (penalty, coup franc, corner) qui convient : l'IA la joue presque toujours. */
const TRIGGER_USE_CHANCE = 0.9;

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
  chaseWithSubstitution(run, team);
  const saving = isSavingForBigAbility(state, side);
  let best: MatchPlayer | undefined;
  let bestScore = 0;
  for (const player of team.players) {
    if (!player.ability || checkAvailability(state, side, player) !== null || wouldBackfire(state, side, player)) continue;
    if (saving && player.ability.cost < BIG_ABILITY_COST) continue;
    const score = abilityValue(state, team, player);
    if (score > bestScore) {
      best = player;
      bestScore = score;
    }
  }
  if (!best) return;
  const late = state.minute >= LATE_GAME_MINUTE ? LATE_GAME_URGENCY : 1;
  const full = team.gauge >= GAUGE_ALMOST_FULL ? FULL_GAUGE_URGENCY : 1;
  const jitter = 1 - DECISION_JITTER / 2 + rng.next() * DECISION_JITTER;
  if (bestScore * late * full * jitter >= AI_ACTIVATION_THRESHOLD) activate(run, side, best);
}

/** Durée pendant laquelle la capacité agit (0 pour un effet immédiat). */
function usefulMinutes(effects: readonly Effect[]): number {
  let minutes = 0;
  for (const effect of effects) if ('duration' in effect && !('scope' in effect && effect.scope === 'self' && effect.type === 'knockout')) minutes = Math.max(minutes, effect.duration);
  return minutes;
}

/**
 * Ce que vaut la capacité maintenant : la catégorie selon le score et le style du coach, réduite si son effet
 * déborderait le coup de sifflet, renforcée quand le contexte la rend précieuse.
 */
function abilityValue(state: MatchState, team: TeamState, player: MatchPlayer): number {
  const ability = player.ability!;
  const situation = situationOf(state, team.side);
  const taste = team.aiStyle ? AI_STYLE_PLAN[team.aiStyle].taste[ability.category] : 1;
  let value = CATEGORY_WEIGHTS[situation][ability.category] * taste;
  const span = usefulMinutes(ability.effects);
  if (span > 0) value *= Math.min(1, Math.max(1, MATCH_END_MINUTE - state.minute) / span);
  return value * contextBonus(state, team, ability.effects, situation);
}

function contextBonus(state: MatchState, team: TeamState, effects: readonly Effect[], situation: Situation): number {
  const opponents = teamOf(state, opponentSide(team.side));
  let bonus = 1;
  for (const effect of effects) {
    switch (effect.type) {
      case 'revive':
        // Un joueur au sol ou blessé : le relever vaut tout de suite.
        bonus = Math.max(bonus, 2.5);
        break;
      case 'clearMaluses': {
        const maluses = team.players.reduce((count, member) => count + member.effects.filter((active) => active.value < 0 && active.stat !== 'knockout').length, 0);
        bonus = Math.max(bonus, maluses >= 2 ? 2 : 1);
        break;
      }
      case 'shield': {
        // Bouclier : utile tant que l'adversaire a encore des capacités de sabotage à lancer.
        const threats = opponents.players.filter((member) => member.ability?.category === 'sabotage' && !member.usedAbility && !member.subbedOff).length;
        bonus = Math.max(bonus, threats > 0 ? 1.5 : 0.6);
        break;
      }
      case 'gamble':
        bonus *= situation === 'trailing' ? 1.3 : situation === 'leading' ? 0.7 : 1;
        break;
      case 'copyLast':
        bonus = Math.max(bonus, 1.3);
        break;
      case 'energy':
        if (effect.scope === 'team') bonus = Math.max(bonus, averageFatigue(team) / 40);
        break;
      default:
        break;
    }
  }
  return bonus;
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

/** Mené en fin de match : un défenseur sort pour un attaquant de plus. */
const CHASE_SUB_MINUTE = 65;
function chaseWithSubstitution(run: Run, team: TeamState): void {
  const { state } = run;
  if (state.minute < CHASE_SUB_MINUTE || team.goals >= teamOf(state, opponentSide(team.side)).goals || substitutionsLeft(team) <= SUBS_KEPT_FOR_INJURIES - 1) return;
  if (team.players.filter((player) => player.line === 'ATT' && !player.sentOff && !player.injured).length >= 3) return;
  const entering = team.players.filter(canEnter).find((player) => player.profile.position === 'ATT');
  const defenders = team.players.filter((player) => player.line === 'DEF' && !player.sentOff && !player.injured);
  if (!entering || defenders.length <= 3) return;
  const leaving = defenders.sort((a, b) => a.rating - b.rating)[0]!;
  performSubstitution(run, team, leaving, entering);
  entering.line = 'ATT';
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

/** Le joueur visé est-il celui que l'effet touche le plus ? (arrêts → gardien, tir → attaquant, défense → défenseur) */
function statFit(target: MatchPlayer, effects: readonly Effect[]): number {
  const stats = effects.flatMap((effect) => ('stat' in effect ? [effect.stat] : []));
  if (stats.includes('goalkeeping')) return target.line === 'GK' ? 2 : 0.2;
  if (stats.includes('shooting')) return target.line === 'ATT' ? 1.5 : target.line === 'MID' ? 1 : 0.5;
  if (stats.includes('defense')) return target.line === 'DEF' ? 1.5 : 0.7;
  return 1;
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
  // Un adversaire sous bouclier (ou indéboulonnable, pour une mise au sol) passe en dernier : la capacité serait perdue.
  const knocks = effects.some((effect) => effect.type === 'knockout');
  const protectedFrom = (target: MatchPlayer) =>
    (target.shield !== undefined && target.shield.charges > 0 && target.shield.until >= state.elapsed) || (knocks && target.steadyUntil >= state.elapsed);
  // Un adversaire en forme (bonus en cours) est la cible prioritaire ; un malus d'arrêts vise le gardien, de tir les attaquants.
  const threat = (target: MatchPlayer) => target.rating * (target.effects.some((active) => active.value > 0) ? 1.25 : 1) * statFit(target, effects);
  if (ability.targeting.kind !== 'teammate') candidates.sort((a, b) => Number(protectedFrom(a)) - Number(protectedFrom(b)) || threat(b) - threat(a));
  else if (effects.some((effect) => effect.type === 'energy')) candidates.sort((a, b) => b.profile.fatigue - a.profile.fatigue);
  else if (effects.some((effect) => effect.type === 'clearMaluses')) candidates.sort((a, b) => maluses(b) - maluses(a) || b.rating - a.rating);
  else candidates.sort((a, b) => b.rating - a.rating);
  return candidates.slice(0, count);
}
