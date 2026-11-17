import { describe, expect, test } from 'bun:test';
import { createRng } from '../core/rng';
import { overall } from '../player/rating';
import { makePlayer } from '../testing/fixtures';
import { developPlayer } from './development';

const ATTRIBUTES = { speed: 50, technique: 50, physical: 50, shooting: 50, defense: 30, goalkeeping: 10 };

describe('progression de fin de saison', () => {
  test('un jeune monte vers son potentiel sans le dépasser', () => {
    const young = makePlayer({ age: 18, attributes: ATTRIBUTES, potential: 80 });
    const developed = developPlayer(young, createRng(1));
    expect(overall(developed)).toBeGreaterThan(overall(young));
    expect(overall(developed)).toBeLessThanOrEqual(80);
    expect(developed.age).toBe(19);
  });

  test('un joueur à son plafond ne bouge pas', () => {
    const player = makePlayer({ age: 26, attributes: ATTRIBUTES });
    const atCeiling = { ...player, potential: overall(player) };
    expect(developPlayer(atCeiling, createRng(1)).attributes).toEqual(ATTRIBUTES);
  });

  test('après 31 ans, le joueur décline', () => {
    const veteran = makePlayer({ age: 33, attributes: ATTRIBUTES, potential: 60 });
    const developed = developPlayer(veteran, createRng(1));
    expect(overall(developed)).toBeLessThan(overall(veteran));
    expect(developed.potential).toBe(overall(developed));
    expect(developed.age).toBe(34);
  });

  test('le joueur d’origine n’est pas modifié', () => {
    const young = makePlayer({ age: 18, attributes: ATTRIBUTES, potential: 80 });
    developPlayer(young, createRng(1));
    expect(young.age).toBe(18);
    expect(young.attributes).toEqual(ATTRIBUTES);
  });
});
