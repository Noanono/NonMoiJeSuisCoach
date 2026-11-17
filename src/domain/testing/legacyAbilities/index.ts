/**
 * Ancien catalogue (55 capacités), retiré du jeu en novembre 2026. Gardé pour les tests du moteur :
 * chaque capacité y exerce un effet précis (mise au sol, poursuite, échange de maillots…).
 */
import type { Ability } from '../../types';
import { COMMON_ABILITIES } from './common';
import { LEGENDARY_ABILITIES } from './legendary';
import { MYTHIC_ABILITIES } from './mythic';
import { RARE_ABILITIES } from './rare';

export const LEGACY_ABILITIES: readonly Ability[] = [...COMMON_ABILITIES, ...RARE_ABILITIES, ...LEGENDARY_ABILITIES, ...MYTHIC_ABILITIES];

const BY_ID = new Map(LEGACY_ABILITIES.map((ability) => [ability.id, ability]));

export function getLegacyAbility(id: string): Ability {
  const ability = BY_ID.get(id);
  if (!ability) throw new Error(`Ancienne capacité inconnue : ${id}`);
  return ability;
}
