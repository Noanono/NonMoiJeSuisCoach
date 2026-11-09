import type { Ability, Combo, Rarity } from '../types';

/** Catalogue complet des capacités (CAT-01). Rempli par les fichiers de données du dossier. */
export const ABILITIES: readonly Ability[] = [];

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
