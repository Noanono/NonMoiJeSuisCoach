import type { Ability, Combo, Rarity } from '../types';
import { ATTACK_ABILITIES } from './data/attack';
import { DEFENSE_ABILITIES } from './data/defense';
import { PROVOC_ABILITIES } from './data/provoc';
import { SABOTAGE_ABILITIES } from './data/sabotage';

/** Catalogue complet des capacités (CAT-01), par section du tableau. */
export const ABILITIES: readonly Ability[] = [
  ...SABOTAGE_ABILITIES,
  ...PROVOC_ABILITIES,
  ...ATTACK_ABILITIES,
  ...DEFENSE_ABILITIES,
];

/** Combos déclenchés par deux capacités à moins de 5 minutes d'intervalle (CAP-15). */
export const COMBOS: readonly Combo[] = [];

const ABILITY_BY_ID = new Map(ABILITIES.map((ability) => [ability.id, ability]));

export function getAbility(id: string): Ability {
  const ability = ABILITY_BY_ID.get(id);
  if (!ability) throw new Error(`Capacité inconnue : ${id}`);
  return ability;
}

export function abilitiesByRarity(rarity: Rarity): Ability[] {
  return ABILITIES.filter((ability) => ability.rarity === rarity);
}

export function findCombo(firstId: string, secondId: string, combos: readonly Combo[] = COMBOS): Combo | undefined {
  return combos.find(
    ({ abilityIds: [a, b] }) => (a === firstId && b === secondId) || (a === secondId && b === firstId),
  );
}
