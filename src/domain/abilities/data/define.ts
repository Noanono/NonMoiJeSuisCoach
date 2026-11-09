import type { Ability, Rarity } from '../../types';

type AbilitySpec = Omit<Ability, 'rarity' | 'hidden' | 'trigger' | 'targeting'> & Partial<Pick<Ability, 'trigger' | 'targeting'>>;

/** Complète une fiche : soi-même, à tout moment, et cachée seulement pour les capacités de Banc (CAP-13). */
export function defineAbility(rarity: Rarity, spec: AbilitySpec): Ability {
  return {
    targeting: { kind: 'self' },
    trigger: 'anytime',
    ...spec,
    rarity,
    hidden: spec.position === 'BENCH',
  };
}
