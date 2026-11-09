import type { Ability, Rarity } from '../types';
import { COMMON_ABILITIES } from './data/common';
import { LEGENDARY_ABILITIES } from './data/legendary';
import { MYTHIC_ABILITIES } from './data/mythic';
import { RARE_ABILITIES } from './data/rare';

/** Catalogue complet des capacités (CAT-01). */
export const ABILITIES: readonly Ability[] = [...COMMON_ABILITIES, ...RARE_ABILITIES, ...LEGENDARY_ABILITIES, ...MYTHIC_ABILITIES];

const ABILITY_BY_ID = new Map(ABILITIES.map((ability) => [ability.id, ability]));

export function getAbility(id: string): Ability {
  const ability = ABILITY_BY_ID.get(id);
  if (!ability) throw new Error(`Capacité inconnue : ${id}`);
  return ability;
}

export function abilitiesByRarity(rarity: Rarity): Ability[] {
  return ABILITIES.filter((ability) => ability.rarity === rarity);
}
