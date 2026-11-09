/**
 * Générateur pseudo-aléatoire à graine (mulberry32) : rapide, sans allocation,
 * et reproductible pour les tests et la reprise de partie.
 */
export interface Rng {
  /** Flottant dans [0, 1[. */
  next(): number;
  /** Entier dans [min, max] inclus. */
  int(min: number, max: number): number;
  /** true avec la probabilité `p`. */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** État courant, à sauvegarder pour reprendre la même suite. */
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;

  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick() sur une liste vide');
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    state: () => s,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
