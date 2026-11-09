import { describe, expect, test } from 'bun:test';
import { ratingColors } from './rating';

const hueOf = (rating: number) => Number(/hsl\((\d+)/.exec(ratingColors(rating).background)![1]);

describe('couleur des notes', () => {
  test('rouge près de 0, vert près de 100, de plus en plus vert entre les deux', () => {
    expect(hueOf(0)).toBe(0);
    expect(hueOf(100)).toBe(120);
    expect(hueOf(60)).toBeGreaterThan(hueOf(40));
  });

  test('une note hors limites reste dans le dégradé', () => {
    expect(hueOf(140)).toBe(120);
    expect(hueOf(-5)).toBe(0);
  });
});
