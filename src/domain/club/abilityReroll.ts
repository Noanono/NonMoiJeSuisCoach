/**
 * Reroll de capacité (CAP-23) : le coach paie d'abord, puis découvre 3 capacités au choix.
 * La nouvelle capacité repart au niveau 1 ; on peut aussi garder l'ancienne, l'argent est perdu.
 */
import type { Rng } from '../core/rng';
import type { Ability, Player, Rarity } from '../types';
import { isAbilityCompatible } from '../world/playerGenerator';
import { moneyFactorBetween } from './finance';
import { playerValue } from './valuation';

/** Part de la valeur du joueur, selon la rareté de sa capacité actuelle. */
export const REROLL_PRICE_RATIO: Record<Rarity, number> = { common: 0.25, rare: 0.4, legendary: 0.75, mythic: 1.2 };
/** Prix plancher au District, multiplié comme le reste des finances à chaque division plus haut. */
export const REROLL_MIN_PRICE = 2_000;
const REROLL_MIN_PRICE_TIER = 4;
const PRICE_ROUNDING = 100;
export const REROLL_OPTIONS = 3;
/** Chance, pour chaque proposition, d'être d'un rang de rareté au-dessus. */
export const REROLL_UPGRADE_CHANCE = 0.06;

const NEXT_RARITY: Record<Rarity, Rarity | null> = { common: 'rare', rare: 'legendary', legendary: 'mythic', mythic: null };
/** Si une rareté est épuisée pour ce poste, on descend d'un rang (il n'y a que 4 mythiques). */
const LOWER_RARITIES: Record<Rarity, Rarity[]> = { common: [], rare: ['common'], legendary: ['rare', 'common'], mythic: ['legendary', 'rare', 'common'] };

/** Prix d'un reroll : une part de la valeur du joueur, jamais sous le plancher de la division. */
export function rerollPrice(player: Player, rarity: Rarity, divisionTier: number): number {
  const floor = REROLL_MIN_PRICE * moneyFactorBetween(REROLL_MIN_PRICE_TIER, divisionTier);
  const price = Math.max(floor, playerValue(player, rarity) * REROLL_PRICE_RATIO[rarity]);
  return Math.round(price / PRICE_ROUNDING) * PRICE_ROUNDING;
}

/**
 * Trois capacités différentes, compatibles avec le poste et absentes de l'effectif (CAP-02), de la
 * rareté actuelle ; chacune a une petite chance d'être d'un rang au-dessus. Si une rareté est
 * épuisée, on se replie sur la rareté actuelle, puis sur les rangs en dessous.
 */
export function drawRerollOptions(
  rng: Rng,
  player: Player,
  rarity: Rarity,
  abilityPool: readonly Ability[],
  excludedAbilityIds: ReadonlySet<string>,
): Ability[] {
  const options: Ability[] = [];
  const available = (target: Rarity) =>
    abilityPool.filter(
      (ability) =>
        ability.rarity === target &&
        isAbilityCompatible(ability, player.position) &&
        !excludedAbilityIds.has(ability.id) &&
        !options.includes(ability),
    );
  for (let i = 0; i < REROLL_OPTIONS; i++) {
    const upgrade = NEXT_RARITY[rarity];
    const target = upgrade && rng.chance(REROLL_UPGRADE_CHANCE) ? upgrade : rarity;
    const pool = [target, rarity, ...LOWER_RARITIES[rarity]].map(available).find((candidates) => candidates.length > 0);
    if (pool) options.push(rng.pick(pool));
  }
  return options;
}
