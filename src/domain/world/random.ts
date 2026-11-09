import type { Rng } from '../core/rng';

/** Nombre de chiffres hexadécimaux par tirage : un entier 32 bits. */
const HEX_DIGITS_PER_DRAW = 8;
const UINT32_MAX = 0xffffffff;

/** Copie mélangée (Fisher-Yates) : la liste d'origine n'est pas modifiée. */
export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/** Tire une clé selon des poids relatifs (leur somme n'a pas besoin de valoir 1). */
export function pickWeighted<K extends string>(rng: Rng, weights: Readonly<Record<K, number>>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng.next() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1]![0];
}

/** Identifiant déterministe tiré du `rng` (deux tirages 32 bits, collisions négligeables). */
export function randomId(rng: Rng, prefix: string): string {
  const draw = () => rng.int(0, UINT32_MAX).toString(16).padStart(HEX_DIGITS_PER_DRAW, '0');
  return `${prefix}-${draw()}${draw()}`;
}
