import { describe, expect, test } from 'bun:test';
import { createRng } from './rng';

describe('createRng', () => {
  test('une même graine donne la même suite', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  test('int reste dans les bornes', () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const n = rng.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  test('reprendre depuis state() continue la même suite', () => {
    const a = createRng(7);
    a.next();
    const b = createRng(a.state());
    expect(b.next()).toBe(a.next());
  });
});
