import type { Ability, AbilityStats, Cooldown, Effect, HouseRule, Rarity, Risk, TeamNight } from '../types';
import { clamp } from '../core/rng';

export const MAX_LEVEL = 5;

/** XP cumulée nécessaire pour atteindre chaque niveau (index 0 = niveau 1). */
export const XP_THRESHOLDS = [0, 30, 80, 160, 300] as const;

/** Gain d'effet par niveau au-delà du premier (CAP-11). */
const EFFECT_GAIN_PER_LEVEL = 0.1;
/** Baisse relative du risque par niveau. */
const RISK_DROP_PER_LEVEL = 0.05;
/** Minutes de recharge gagnées par niveau. */
const COOLDOWN_GAIN_PER_LEVEL = 1;
const MIN_COOLDOWN_MINUTES = 5;

const BASE_ACTIVATION_XP = 10;

/** Multiplicateur de valeur marchande par rareté (CLUB-08). */
export const RARITY_VALUE_MULTIPLIER: Record<Rarity, number> = { common: 1, rare: 1.5, legendary: 3 };

/** Part des joueurs générés par rareté (CAP-12). */
export const RARITY_GENERATION_WEIGHTS: Record<Rarity, number> = { common: 0.7, rare: 0.25, legendary: 0.05 };

export const RARITY_LABEL: Record<Rarity, string> = { common: 'Commune', rare: 'Rare', legendary: 'Légendaire' };

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]!) level = i + 1;
  }
  return level;
}

/** XP gagnée par activation réussie, selon l'impact sur le match (CAP-10). `impact` de 0 à 1. */
export function xpForActivation(impact: number): number {
  return Math.round(BASE_ACTIVATION_XP * (1 + clamp(impact, 0, 1) * 2));
}

/** Statistiques d'une capacité à un niveau donné (CAP-08, CAP-11). */
export function statsAtLevel(ability: Ability, level: number): AbilityStats {
  const lvl = clamp(Math.round(level), 1, MAX_LEVEL);
  const steps = Math.min(lvl, MAX_LEVEL - 1) - 1;
  const scaled: AbilityStats = {
    successChance: clamp(ability.base.successChance * (1 + steps * EFFECT_GAIN_PER_LEVEL), 0, 1),
    effects: ability.base.effects.map((effect) => scaleEffect(effect, 1 + steps * EFFECT_GAIN_PER_LEVEL)),
    risks: ability.base.risks.map((risk) => scaleRisk(risk, 1 - steps * RISK_DROP_PER_LEVEL)),
    cooldown: shortenCooldown(ability.base.cooldown, steps * COOLDOWN_GAIN_PER_LEVEL),
    cost: ability.base.cost,
  };
  return lvl === MAX_LEVEL ? { ...scaled, ...ability.level5 } : scaled;
}

export function scaleRisk(risk: Risk, factor: number): Risk {
  return { ...risk, chance: clamp(risk.chance * factor, 0, 1) };
}

/** Amplifie la partie chiffrée d'un effet (valeurs, probabilités). Les conséquences hors match ne bougent pas. */
export function scaleEffect(effect: Effect, factor: number): Effect {
  switch (effect.type) {
    case 'modifier':
    case 'energy':
    case 'morale':
    case 'chanceBoost':
    case 'opponentChanceMalus':
      return { ...effect, value: effect.value * factor };
    case 'penaltyAwarded':
    case 'ownGoal':
      return { ...effect, chance: clamp(effect.chance * factor, 0, 1) };
    case 'knockout':
      return effect.chance === undefined ? effect : { ...effect, chance: clamp(effect.chance * factor, 0, 1) };
    default:
      return effect;
  }
}

function shortenCooldown(cooldown: Cooldown, minutes: number): Cooldown {
  if (cooldown.kind !== 'minutes') return cooldown;
  return { kind: 'minutes', value: Math.max(MIN_COOLDOWN_MINUTES, cooldown.value - minutes) };
}

// ---------------------------------------------------------------------------
// Contexte (CAP-14) et règlement intérieur (FRAS-01)
// ---------------------------------------------------------------------------

const BIG_NIGHT_ALCOHOL_BONUS = 1.5;
const HOUSE_RULE_DAMPING = 0.85;

/** Tags de capacités bridés par chaque règle du règlement intérieur. */
export const HOUSE_RULE_TAGS: Record<HouseRule, Ability['tags']> = {
  curfew: ['alcohol', 'vice'],
  noAlcoholEve: ['alcohol'],
  barClosedToPlayers: ['alcohol'],
  noGirlfriendsInStands: ['family', 'vice'],
};

export interface AbilityContext {
  teamNight: TeamNight;
  houseRules: readonly HouseRule[];
}

/** Multiplicateurs à appliquer aux bonus et aux risques d'une capacité selon le contexte. */
export function contextMultiplier(ability: Ability, context: AbilityContext): { bonus: number; risk: number } {
  let bonus = 1;
  let risk = 1;
  if (context.teamNight === 'bigNight' && ability.tags.includes('alcohol')) bonus *= BIG_NIGHT_ALCOHOL_BONUS;
  for (const rule of context.houseRules) {
    if (HOUSE_RULE_TAGS[rule].some((tag) => ability.tags.includes(tag))) {
      bonus *= HOUSE_RULE_DAMPING;
      risk *= HOUSE_RULE_DAMPING;
    }
  }
  return { bonus, risk };
}
