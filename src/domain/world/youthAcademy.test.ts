import { describe, expect, test } from 'bun:test';
import type { Club } from '../types';
import { createRng } from '../core/rng';
import { overall } from '../player/rating';
import { TEST_ABILITY_POOL } from './fixtures';
import { generateYouthIntake } from './youthAcademy';

const CLUB: Club = {
  id: 'c1',
  name: 'FC Test',
  shortName: 'FCT',
  divisionId: 'd4',
  reputation: 50,
  budget: 10_000,
  playerIds: [],
  lineup: null,
  isHuman: true,
  stadium: 'Stade',
};

describe('centre de formation (CLUB-07)', () => {
  const intakes = Array.from({ length: 200 }, (_, seed) =>
    generateYouthIntake({ rng: createRng(seed), club: CLUB, abilityPool: TEST_ABILITY_POOL, excludedAbilityIds: ['common-any-1'] }),
  );
  const youngsters = intakes.flat();

  test('2 à 4 jeunes de 16 à 18 ans par saison', () => {
    for (const intake of intakes) {
      expect(intake.length).toBeGreaterThanOrEqual(2);
      expect(intake.length).toBeLessThanOrEqual(4);
    }
    for (const player of youngsters) {
      expect(player.age).toBeGreaterThanOrEqual(16);
      expect(player.age).toBeLessThanOrEqual(18);
      expect(player.clubId).toBe('c1');
    }
  });

  test('note basse, potentiel élevé', () => {
    for (const player of youngsters) {
      expect(overall(player)).toBeLessThan(CLUB.reputation);
      expect(player.potential).toBeGreaterThanOrEqual(Math.min(99, overall(player) + 15));
    }
  });

  test('capacité visible dans environ 30 % des cas', () => {
    const visible = youngsters.filter((player) => player.ability.revealed).length / youngsters.length;
    expect(visible).toBeGreaterThan(0.2);
    expect(visible).toBeLessThan(0.4);
  });

  test('aucune capacité déjà présente dans l’effectif (CAP-02)', () => {
    for (const intake of intakes) {
      const ids = intake.map((player) => player.ability.abilityId);
      expect(ids).not.toContain('common-any-1');
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
