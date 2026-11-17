import { describe, expect, test } from 'bun:test';
import type { Position, Rarity } from '../types';
import { createRng } from '../core/rng';
import { overall } from '../player/rating';
import { TEST_ABILITY_POOL } from './fixtures';
import { generatePlayer, generateSquad, isAbilityCompatible, SQUAD_COMPOSITION } from './playerGenerator';

const ABILITY_BY_ID = new Map(TEST_ABILITY_POOL.map((ability) => [ability.id, ability]));
const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'ATT'];

describe('génération des joueurs', () => {
  test('même graine, même joueur', () => {
    const options = { position: 'MID' as const, reputation: 50, clubId: 'c1', abilityPool: TEST_ABILITY_POOL, excludedAbilityIds: [] };
    expect(generatePlayer({ ...options, rng: createRng(7) })).toEqual(generatePlayer({ ...options, rng: createRng(7) }));
  });

  test('la note suit la réputation du club', () => {
    const rng = createRng(3);
    const average = (reputation: number) => {
      let total = 0;
      for (let i = 0; i < 50; i++) {
        total += overall(generatePlayer({ rng, position: 'DEF', reputation, clubId: null, abilityPool: TEST_ABILITY_POOL, excludedAbilityIds: [], age: 27 }));
      }
      return total / 50;
    };
    const district = average(30);
    const elite = average(80);
    expect(district).toBeGreaterThan(20);
    expect(district).toBeLessThan(40);
    expect(elite).toBeGreaterThan(70);
    expect(elite).toBeLessThan(90);
  });

  test('les capacités de gardien sont réservées aux gardiens (CAP-01)', () => {
    const rng = createRng(11);
    for (let i = 0; i < 400; i++) {
      const position = POSITIONS[i % POSITIONS.length]!;
      const player = generatePlayer({ rng, position, reputation: 50, clubId: null, abilityPool: TEST_ABILITY_POOL, excludedAbilityIds: [] });
      const ability = ABILITY_BY_ID.get(player.ability.abilityId)!;
      expect(isAbilityCompatible(ability, position)).toBe(true);
    }
  });

  test('une capacité cachée n’est pas révélée à la génération (CAP-13)', () => {
    const rng = createRng(5);
    for (let i = 0; i < 200; i++) {
      const player = generatePlayer({ rng, position: 'ATT', reputation: 50, clubId: null, abilityPool: TEST_ABILITY_POOL, excludedAbilityIds: [] });
      expect(player.ability.revealed).toBe(!ABILITY_BY_ID.get(player.ability.abilityId)!.hidden);
    }
  });

  test('les raretés suivent environ 70 / 25 / 5 % (CAP-12)', () => {
    const rng = createRng(2026);
    const counts: Record<Rarity, number> = { common: 0, rare: 0, legendary: 0, mythic: 0 };
    const total = 2000;
    for (let i = 0; i < total; i++) {
      const player = generatePlayer({ rng, position: 'ATT', reputation: 50, clubId: null, abilityPool: TEST_ABILITY_POOL, excludedAbilityIds: [] });
      counts[ABILITY_BY_ID.get(player.ability.abilityId)!.rarity]++;
    }
    expect(counts.common / total).toBeCloseTo(0.7, 1);
    expect(counts.rare / total).toBeCloseTo(0.25, 1);
    expect(counts.legendary / total).toBeGreaterThan(0.02);
    expect(counts.legendary / total).toBeLessThan(0.08);
  });

  test('repli sur une autre rareté quand le pool est épuisé (CAP-12)', () => {
    const commonsAndRares = TEST_ABILITY_POOL.filter((ability) => ability.rarity !== 'legendary').map((ability) => ability.id);
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      const player = generatePlayer({ rng, position: 'ATT', reputation: 50, clubId: null, abilityPool: TEST_ABILITY_POOL, excludedAbilityIds: commonsAndRares });
      expect(ABILITY_BY_ID.get(player.ability.abilityId)!.rarity).toBe('legendary');
    }
  });

  test('erreur explicite quand plus aucune capacité n’est disponible', () => {
    const everything = TEST_ABILITY_POOL.map((ability) => ability.id);
    expect(() =>
      generatePlayer({ rng: createRng(1), position: 'GK', reputation: 50, clubId: null, abilityPool: TEST_ABILITY_POOL, excludedAbilityIds: everything }),
    ).toThrow();
  });
});

describe('génération d’un effectif', () => {
  const squads = Array.from({ length: 30 }, (_, seed) =>
    generateSquad({ rng: createRng(seed), reputation: 45, clubId: 'c1', abilityPool: TEST_ABILITY_POOL }),
  );

  test('18 joueurs : 2 gardiens, 6 défenseurs, 6 milieux, 4 attaquants', () => {
    for (const squad of squads) {
      expect(squad).toHaveLength(18);
      for (const position of POSITIONS) {
        expect(squad.filter((player) => player.position === position)).toHaveLength(SQUAD_COMPOSITION[position]);
      }
    }
  });

  test('deux joueurs d’un même effectif n’ont jamais la même capacité (CAP-02)', () => {
    for (const squad of squads) {
      expect(new Set(squad.map((player) => player.ability.abilityId)).size).toBe(squad.length);
    }
  });

  test('identifiants uniques', () => {
    const ids = squads.flatMap((squad) => squad.map((player) => player.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
