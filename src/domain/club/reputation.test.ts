import { describe, expect, test } from 'bun:test';
import { nextReputation, type SeasonOutcome } from './reputation';

const district = { min: 25, max: 40 };
const outcome = (overrides: Partial<SeasonOutcome>): SeasonOutcome => ({ position: 7, clubCount: 14, move: null, cupRoundsWon: 0, nextTier: district, ...overrides });

describe('réputation des clubs (C5)', () => {
  test('le haut du classement gagne de la réputation, le bas en perd', () => {
    expect(nextReputation(32, outcome({ position: 1 }))).toBeGreaterThan(32);
    expect(nextReputation(32, outcome({ position: 14 }))).toBeLessThan(32);
  });

  test('une montée fait un bond, une descente une chute', () => {
    const promoted = nextReputation(38, outcome({ position: 1, move: 'promotion', nextTier: { min: 40, max: 55 } }));
    expect(promoted).toBeGreaterThanOrEqual(38 + 8);
    const relegated = nextReputation(42, outcome({ position: 14, move: 'relegation', nextTier: district }));
    expect(relegated).toBeLessThanOrEqual(42 - 8);
  });

  test('un beau parcours en coupe se remarque', () => {
    expect(nextReputation(30, outcome({ cupRoundsWon: 4 }))).toBe(nextReputation(30, outcome({})) + 2);
  });

  test('la réputation se rapproche peu à peu de la division où le club joue', () => {
    expect(nextReputation(70, outcome({}))).toBeLessThan(70);
    expect(nextReputation(10, outcome({}))).toBeGreaterThan(10);
  });
});
