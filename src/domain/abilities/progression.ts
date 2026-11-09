import type { Ability, AbilityStats, Effect, Rarity, Targeting } from '../types';
import { clamp } from '../core/rng';

export const MAX_LEVEL = 5;

/** XP cumulée nécessaire pour atteindre chaque niveau (index 0 = niveau 1). */
export const XP_THRESHOLDS = [0, 30, 80, 160, 300] as const;

/** Coût en Jauge de Gueulante et recharge en minutes (0 = aucune) selon la rareté. */
export const RARITY_COST: Record<Rarity, number> = { common: 2, rare: 3, legendary: 5, mythic: 7 };
export const RARITY_COOLDOWN: Record<Rarity, number> = { common: 15, rare: 15, legendary: 0, mythic: 0 };

/** Gain d'effet par niveau au-delà du premier (CAP-11). */
const EFFECT_GAIN_PER_LEVEL = 0.1;
/** Au niveau 5 : durée allongée ou recharge réduite pour les capacités sans cible à choisir. */
const LEVEL5_DURATION_FACTOR = 1.5;
const LEVEL5_COOLDOWN_REDUCTION = 5;

const MAX_INSTANT_CHANCE = 0.95;
const MAX_SHOT_MALUS = 0.9;
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

/** Statistiques d'une capacité à un niveau donné (CAP-08, CAP-11). */
export function statsAtLevel(ability: Ability, level: number): AbilityStats {
  const lvl = clamp(Math.round(level), 1, MAX_LEVEL);
  const factor = 1 + (lvl - 1) * EFFECT_GAIN_PER_LEVEL;
  const bonus = lvl === MAX_LEVEL ? level5Bonus(ability) : null;
  const durationFactor = bonus === 'longerDuration' ? LEVEL5_DURATION_FACTOR : 1;
  const cooldown = RARITY_COOLDOWN[ability.rarity];
  return {
    effects: ability.effects.map((effect) => lengthen(scaleEffect(effect, factor), durationFactor)),
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
      return { ...effect, value: effect.value * factor };
    case 'energy':
      return { ...effect, value: clamp(effect.value * factor, 0, 1) };
    case 'opponentChanceMalus':
      return { ...effect, value: clamp(effect.value * factor, 0, MAX_SHOT_MALUS) };
    case 'scaledModifier':
      return { ...effect, base: effect.base * factor, perUnit: effect.perUnit * factor };
    case 'instantChance':
      return { ...effect, chance: clamp(effect.chance * factor, 0, MAX_INSTANT_CHANCE) };
    case 'knockout':
      return effect.scope === 'self' ? effect : { ...effect, duration: Math.round(effect.duration * factor) };
    default:
      return effect;
  }
}

function lengthen(effect: Effect, factor: number): Effect {
  if (factor === 1) return effect;
  if (effect.type === 'cancelGoal') return { ...effect, withinMinutes: Math.round(effect.withinMinutes * factor) };
  return 'duration' in effect ? { ...effect, duration: Math.round(effect.duration * factor) } : effect;
}
