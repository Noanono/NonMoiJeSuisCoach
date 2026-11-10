import { describe, expect, test } from 'bun:test';
import { createMatch, GAUGE_START } from '../../domain/match';
import { makeSheet, testMatchOptions } from '../../domain/match/fixtures';
import { substitutePlayer } from '../../domain/match';
import { abilitySheet, substitutionFromDrag } from './activation';

function match() {
  return createMatch(
    testMatchOptions(
      makeSheet({ clubId: 'h', isHuman: true, abilities: { 1: 'boucher', 5: 'pilier', 6: 'cache', 7: 'vomisseur' } }),
      makeSheet({ clubId: 'a' }),
    ),
  );
}

describe("fiche d'activation", () => {
  test('affiche la rareté, le coût, la jauge, la cible et ce que fait la capacité', () => {
    const sheet = abilitySheet(match(), 'home', 'h-1');
    expect(sheet).toMatchObject({ abilityName: 'boucher', cost: 3, gauge: GAUGE_START, available: true, rarity: { key: 'rare', label: 'Rare' } });
    expect(sheet.abilityEffects).toEqual(['Hors jeu 15 min : la cible']);
    expect(sheet.targeting).toBe('1 attaquant, à choisir sur le terrain');
  });

  test('une capacité cachée reste « ??? » (CAP-13)', () => {
    const state = match();
    state.home.players[6]!.abilityRevealed = false;
    state.home.players[6]!.ability!.hidden = true;
    const sheet = abilitySheet(state, 'home', 'h-6');
    expect(sheet.abilityName).toBe('???');
    expect(sheet.abilityEffects).toEqual([]);
    expect(sheet.rarity).toBeNull();
  });

  test('une capacité de zone se déclenche sans choisir de cible (CAP-18)', () => {
    expect(abilitySheet(match(), 'home', 'h-7').targeting).toStartWith('Sa zone du terrain');
  });

  test("donne la raison d'indisponibilité", () => {
    const state = match();
    state.home.gauge = 0;
    const sheet = abilitySheet(state, 'home', 'h-5');
    expect(sheet.available).toBe(false);
    expect(sheet.status).toContain('il te manque 2 point(s)');
  });
});

describe('changement en glissant les joueurs (MATCH-08)', () => {
  function withBench() {
    return createMatch(testMatchOptions(makeSheet({ clubId: 'h', isHuman: true, benchAbilities: ['pilier', 'kebab'] }), makeSheet({ clubId: 'a' })));
  }

  test('fonctionne dans les deux sens', () => {
    const state = withBench();
    const expected = { leavingId: 'h-9', enteringId: 'h-b0' };
    expect(substitutionFromDrag(state, 'home', 'h-b0', 'h-9')).toEqual(expected);
    expect(substitutionFromDrag(state, 'home', 'h-9', 'h-b0')).toEqual(expected);
  });

  test('refuse deux titulaires, deux remplaçants et les adversaires', () => {
    const state = withBench();
    expect(substitutionFromDrag(state, 'home', 'h-9', 'h-5')).toBeNull();
    expect(substitutionFromDrag(state, 'home', 'h-b0', 'h-b1')).toBeNull();
    expect(substitutionFromDrag(state, 'home', 'h-b0', 'a-9')).toBeNull();
  });

  test('un joueur sorti ne peut plus être glissé sur le terrain', () => {
    const state = withBench();
    substitutePlayer(state, 'home', 'h-9', 'h-b0');
    expect(substitutionFromDrag(state, 'home', 'h-9', 'h-5')).toBeNull();
  });

  test('impossible pendant un ciblage', () => {
    const state = withBench();
    state.pending = { side: 'home', playerId: 'h-5', abilityId: 'x', required: 1, targetIds: [], validTargetIds: [] };
    expect(substitutionFromDrag(state, 'home', 'h-b0', 'h-9')).toBeNull();
  });
});
