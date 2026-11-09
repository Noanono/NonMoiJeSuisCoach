import { describe, expect, test } from 'bun:test';
import { createMatch } from '../../domain/match';
import { makeSheet, testMatchOptions } from '../../domain/match/fixtures';
import { formatPercent } from '../format';
import { abilitySheet } from './activation';

function match() {
  return createMatch(
    testMatchOptions(
      makeSheet({ clubId: 'h', isHuman: true, abilities: { 1: 'boucher', 5: 'pilier', 6: 'cache', 7: 'vomisseur' } }),
      makeSheet({ clubId: 'a' }),
    ),
  );
}

describe("fiche d'activation (CAP-07)", () => {
  test('affiche coût, jauge, réussite et chaque risque en pourcentage', () => {
    const sheet = abilitySheet(match(), 'home', 'h-1');
    expect(sheet).toMatchObject({ abilityName: 'boucher', cost: 3, gauge: 3, success: formatPercent(1), available: true });
    expect(sheet.risks).toEqual([{ label: 'Carton jaune', chance: formatPercent(0.3) }]);
    expect(sheet.targeting).toBe('1 adversaire en vis-à-vis, à choisir sur le terrain');
  });

  test('une capacité cachée reste « ??? » (CAP-13)', () => {
    const state = match();
    state.home.players[6]!.abilityRevealed = false;
    const sheet = abilitySheet(state, 'home', 'h-6');
    expect(sheet.abilityName).toBe('???');
    expect(sheet.downside).toBeNull();
    expect(sheet.risks[0]!.label).toBe('Revers inconnu');
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
