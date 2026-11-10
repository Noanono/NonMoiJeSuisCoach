import type { Player, Rarity } from '../types';
import { overall } from '../player/rating';
import { RARITY_VALUE_MULTIPLIER } from '../abilities/progression';

/**
 * Valeur marchande et salaire demandé (CLUB-08) : note globale, âge et potentiel,
 * multipliés par la rareté et le niveau de la capacité.
 */

/** Valeur d'un joueur noté REFERENCE_RATING, au meilleur âge et sans marge de progression. */
const REFERENCE_VALUE = 2_000;
const REFERENCE_RATING = 40;
/** Chaque point de note multiplie la valeur par ce facteur (un joueur de 80 vaut ~0,9 M€). */
const VALUE_GROWTH_PER_RATING_POINT = 1.17;
/** Bonus par point d'écart entre potentiel et note, réservé aux jeunes. */
const POTENTIAL_GAP_BONUS = 0.03;
const YOUNG_MAX_AGE = 23;
/** Chaque niveau de capacité au-delà du premier ajoute 20 % à la valeur (niveau 5 : ×1,8). */
export const ABILITY_LEVEL_VALUE_BONUS = 0.2;
const MIN_VALUE = 500;
const VALUE_ROUNDING = 100;

/** Coefficient d'âge : les jeunes valent plus, les vétérans de buvette beaucoup moins. */
const AGE_BRACKETS: readonly { maxAge: number; factor: number }[] = [
  { maxAge: 21, factor: 1.3 },
  { maxAge: 29, factor: 1 },
  { maxAge: 32, factor: 0.7 },
  { maxAge: Number.POSITIVE_INFINITY, factor: 0.4 },
];

/** Part de la valeur versée chaque semaine en salaire. */
const WEEKLY_SALARY_RATIO = 0.004;
const MIN_WEEKLY_SALARY = 40;
const SALARY_ROUNDING = 10;

function ageFactor(age: number): number {
  return AGE_BRACKETS.find((bracket) => age <= bracket.maxAge)?.factor ?? 1;
}

function potentialFactor(player: Player, rating: number): number {
  if (player.age > YOUNG_MAX_AGE) return 1;
  return 1 + Math.max(0, player.potential - rating) * POTENTIAL_GAP_BONUS;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Valeur marchande en euros (CLUB-08) : à note égale, une légendaire vaut ×3 une commune, un niveau 5 ×1,8 un niveau 1. */
export function playerValue(player: Player, rarity: Rarity): number {
  const rating = overall(player);
  const ratingValue = REFERENCE_VALUE * VALUE_GROWTH_PER_RATING_POINT ** (rating - REFERENCE_RATING);
  const levelFactor = 1 + (player.ability.level - 1) * ABILITY_LEVEL_VALUE_BONUS;
  const value = ratingValue * ageFactor(player.age) * potentialFactor(player, rating) * RARITY_VALUE_MULTIPLIER[rarity] * levelFactor;
  return Math.max(MIN_VALUE, roundTo(value, VALUE_ROUNDING));
}

/** Salaire hebdomadaire réclamé par le joueur pour signer (proportionnel à sa valeur). */
export function askingSalary(player: Player, rarity: Rarity): number {
  return Math.max(MIN_WEEKLY_SALARY, roundTo(playerValue(player, rarity) * WEEKLY_SALARY_RATIO, SALARY_ROUNDING));
}
