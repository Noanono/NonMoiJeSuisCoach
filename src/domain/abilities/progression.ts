import type { Ability, AbilityStats, Effect, AbilityProgress, Rarity, Targeting } from '../types';
import { clamp, type Rng } from '../core/rng';

export const MAX_LEVEL = 5;

/**
 * XP cumulée nécessaire pour atteindre chaque niveau (index 0 = niveau 1). Chaque niveau coûte
 * nettement plus que le précédent : le niveau 5 demande presque une carrière (CAP-10).
 */
export const XP_THRESHOLDS = [0, 250, 900, 2400, 5000] as const;

/**
 * Hors du club du coach, on ne simule pas l'XP match par match : chaque saison de carrière rapporte
 * cette XP, selon le temps de jeu du joueur. Les joueurs générés ont l'XP de leur âge.
 */
export const CAREER_XP_PER_SEASON = { min: 120, max: 320 } as const;
export const CAREER_START_AGE = 18;

/** Coût en Jauge de Gueulante et recharge en minutes (0 = aucune) selon la rareté. */
export const RARITY_COST: Record<Rarity, number> = { common: 2, rare: 3, legendary: 5, mythic: 7 };
export const RARITY_COOLDOWN: Record<Rarity, number> = { common: 15, rare: 15, legendary: 0, mythic: 0 };

/** Gain d'effet par niveau au-delà du premier (CAP-11). */
const EFFECT_GAIN_PER_LEVEL = 0.1;
/** Durées : +10 % par niveau, et au moins une minute de plus à chaque niveau. */
const DURATION_GAIN_PER_LEVEL = 0.1;
/**
 * Capacité sans chiffre à faire grandir (annulation, vol de jauge, transfert…) : chaque niveau
 * au-delà du premier ajoute un petit coup de boost à toute l'équipe (CAP-11).
 */
export const LEVEL_BONUS_PER_LEVEL = 0.03;
export const LEVEL_BONUS_DURATION = 10;
export const LEVEL_BONUS_LABEL = 'Bonus de niveau';
/** Au niveau 5 : durée allongée ou recharge réduite pour les capacités sans cible à choisir. */
const LEVEL5_DURATION_FACTOR = 1.5;
const LEVEL5_COOLDOWN_REDUCTION = 5;

const BASE_ACTIVATION_XP = 10;

/** Multiplicateur de valeur marchande par rareté (CLUB-08). */
export const RARITY_VALUE_MULTIPLIER: Record<Rarity, number> = { common: 1, rare: 1.5, legendary: 3, mythic: 10 };

/** Part des joueurs générés par rareté (CAP-12). */
export const RARITY_GENERATION_WEIGHTS: Record<Rarity, number> = { common: 0.7, rare: 0.25, legendary: 0.045, mythic: 0.005 };

export const RARITY_LABEL: Record<Rarity, string> = { common: 'Commune', rare: 'Rare', legendary: 'Légendaire', mythic: 'Mythique' };

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]!) level = i + 1;
  }
  return level;
}

/** Ajoute de l'XP : le niveau monte avec les paliers et ne redescend jamais. */
export function gainXp(ability: AbilityProgress, xp: number): AbilityProgress {
  const total = ability.xp + xp;
  return { ...ability, xp: total, level: Math.max(ability.level, levelForXp(total)) };
}

/** XP d'une carrière déjà jouée à cet âge : une saison par an depuis 18 ans, temps de jeu tiré une fois. */
export function careerXpAtAge(rng: Rng, age: number): number {
  const seasons = Math.max(0, age - CAREER_START_AGE);
  return seasons * rng.int(CAREER_XP_PER_SEASON.min, CAREER_XP_PER_SEASON.max);
}

/** XP gagnée par activation, selon l'impact sur le match (CAP-10). `impact` de 0 à 1. */
export function xpForActivation(impact: number): number {
  return Math.round(BASE_ACTIVATION_XP * (1 + clamp(impact, 0, 1) * 2));
}

export type Level5Bonus = 'extraTarget' | 'longerDuration' | 'shorterCooldown' | null;

function hasDuration(effect: Effect): boolean {
  return 'duration' in effect || effect.type === 'cancelGoal';
}

function hasPickedTargets({ kind }: Targeting): boolean {
  return kind === 'teammate' || kind === 'opponent' || kind === 'randomOpponent';
}

/** Ce que le niveau 5 ajoute (CAP-11) : +1 cible, sinon +50 % de durée, sinon une recharge plus courte. */
export function level5Bonus(ability: Ability): Level5Bonus {
  if (ability.rarity === 'mythic') return null;
  if (hasPickedTargets(ability.targeting)) return 'extraTarget';
  if (ability.effects.some(hasDuration)) return 'longerDuration';
  return RARITY_COOLDOWN[ability.rarity] > 0 ? 'shorterCooldown' : null;
}

/**
 * Statistiques d'une capacité à un niveau donné (CAP-08, CAP-11). Chaque niveau améliore toutes
 * les capacités : valeurs +10 %, durées +10 % (au moins une minute), sinon un petit bonus d'équipe.
 */
export function statsAtLevel(ability: Ability, level: number): AbilityStats {
  const lvl = clamp(Math.round(level), 1, MAX_LEVEL);
  const factor = 1 + (lvl - 1) * EFFECT_GAIN_PER_LEVEL;
  const bonus = lvl === MAX_LEVEL ? level5Bonus(ability) : null;
  const durationFactor = bonus === 'longerDuration' ? LEVEL5_DURATION_FACTOR : 1;
  const cooldown = RARITY_COOLDOWN[ability.rarity];
  const effects = ability.effects.map((effect) => lengthen(extendPerLevel(scaleEffect(effect, factor), lvl), durationFactor));
  if (lvl > 1 && !ability.effects.some(growsWithLevel)) effects.push(levelBonus(lvl));
  return {
    effects,
    targeting: bonus === 'extraTarget' ? { ...ability.targeting, count: (ability.targeting.count ?? 1) + 1 } : ability.targeting,
    cost: RARITY_COST[ability.rarity],
    cooldown: bonus === 'shorterCooldown' ? cooldown - LEVEL5_COOLDOWN_REDUCTION : cooldown,
  };
}

/** Amplifie la partie chiffrée d'un effet. Une contrepartie (le porteur hors jeu) ne grandit pas. */
export function scaleEffect(effect: Effect, factor: number): Effect {
  switch (effect.type) {
    case 'modifier':
    case 'chanceBoost':
    case 'setPieceBoost':
      return { ...effect, value: effect.value * factor };
    case 'energy':
      return { ...effect, value: towardCertainty(effect.value, factor) };
    case 'opponentChanceMalus':
      // Le malus approche 100 % et touche un tir de plus aux niveaux 3 et 5.
      return { ...effect, value: towardCertainty(effect.value, factor), shots: effect.shots + Math.floor(Math.round((factor - 1) / EFFECT_GAIN_PER_LEVEL) / 2) };
    case 'scaledModifier':
      return { ...effect, base: effect.base * factor, perUnit: effect.perUnit * factor };
    case 'instantChance':
      return { ...effect, chance: towardCertainty(effect.chance, factor) };
    default:
      return effect;
  }
}

/**
 * Probabilités et parts (occasion immédiate, malus de tir, énergie) : le niveau réduit la part d'échec
 * au lieu de multiplier la valeur, pour progresser à chaque niveau sans jamais atteindre 100 %.
 */
function towardCertainty(value: number, factor: number): number {
  return factor === 1 ? value : 1 - (1 - clamp(value, 0, 1)) / factor;
}

/**
 * L'effet a-t-il un chiffre (valeur ou durée) que le niveau fait grandir assez pour peser ?
 * Une annulation de but ne gagne que des minutes de délai : elle reçoit aussi le bonus d'équipe.
 */
export function growsWithLevel(effect: Effect): boolean {
  switch (effect.type) {
    case 'modifier':
    case 'scaledModifier':
    case 'chanceBoost':
    case 'energy':
    case 'opponentChanceMalus':
    case 'instantChance':
    case 'swapTeams':
    case 'doubleGoals':
    case 'cleanSheetGauge':
    case 'setPieceBoost':
      return true;
    case 'knockout':
      return effect.scope !== 'self';
    default:
      return false;
  }
}

/** Minutes gagnées au niveau `level` par un effet qui dure `minutes` au niveau 1. */
export function extraMinutes(minutes: number, level: number): number {
  return Math.max(1, Math.round(minutes * DURATION_GAIN_PER_LEVEL)) * (level - 1);
}

/** Allonge les durées selon le niveau. Une contrepartie (le porteur hors jeu) ne grandit pas. */
function extendPerLevel(effect: Effect, level: number): Effect {
  if (level === 1) return effect;
  if (effect.type === 'cancelGoal') return { ...effect, withinMinutes: effect.withinMinutes + extraMinutes(effect.withinMinutes, level) };
  if (effect.type === 'knockout') {
    if (effect.scope === 'self') return effect;
    const chase = effect.chaseDuration;
    return {
      ...effect,
      duration: effect.duration + extraMinutes(effect.duration, level),
      ...(chase !== undefined ? { chaseDuration: chase + extraMinutes(chase, level) } : {}),
    };
  }
  return 'duration' in effect ? { ...effect, duration: effect.duration + extraMinutes(effect.duration, level) } : effect;
}

function levelBonus(level: number): Effect {
  return { type: 'modifier', scope: 'team', stat: 'all', value: LEVEL_BONUS_PER_LEVEL * (level - 1), duration: LEVEL_BONUS_DURATION };
}

function lengthen(effect: Effect, factor: number): Effect {
  if (factor === 1) return effect;
  if (effect.type === 'knockout' && effect.scope === 'self') return effect;
  if (effect.type === 'cancelGoal') return { ...effect, withinMinutes: Math.round(effect.withinMinutes * factor) };
  return 'duration' in effect ? { ...effect, duration: Math.round(effect.duration * factor) } : effect;
}
