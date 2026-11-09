import type { Ability, AbilityPosition, Rarity } from '../types';

/** Capacité de test : seuls l'identifiant, la rareté, le poste et le caractère caché comptent ici. */
export function makeAbility(id: string, rarity: Rarity, position: AbilityPosition, hidden = false): Ability {
  return {
    id,
    name: id,
    rarity,
    category: 'support',
    position,
    targeting: { kind: 'self' },
    trigger: 'anytime',
    description: 'Capacité de test',
    effects: [],
    hidden,
  };
}

type AbilitySpec = [position: AbilityPosition, count: number];

const POOL_SPEC: Record<Rarity, AbilitySpec[]> = {
  common: [['GK', 3], ['DEF', 3], ['MID', 3], ['ATT', 3], ['ANY', 5], ['BENCH', 3]],
  rare: [['GK', 1], ['DEF', 2], ['MID', 1], ['ATT', 2], ['ANY', 2], ['BENCH', 1]],
  legendary: [['ATT', 1], ['ANY', 2]],
};

/** Une capacité sur ce nombre est cachée (CAP-13). */
const HIDDEN_EVERY = 4;

/** Pool de test : 32 capacités de raretés et de postes variés, en attendant le vrai catalogue (CAT-01). */
export const TEST_ABILITY_POOL: readonly Ability[] = buildTestPool();

function buildTestPool(): Ability[] {
  const pool: Ability[] = [];
  for (const [rarity, specs] of Object.entries(POOL_SPEC) as [Rarity, AbilitySpec[]][]) {
    for (const [position, count] of specs) {
      for (let index = 1; index <= count; index++) {
        const id = `${rarity}-${position.toLowerCase()}-${index}`;
        pool.push(makeAbility(id, rarity, position, pool.length % HIDDEN_EVERY === 0));
      }
    }
  }
  return pool;
}
