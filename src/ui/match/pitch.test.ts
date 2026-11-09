import { describe, expect, test } from 'bun:test';
import { createMatch } from '../../domain/match';
import { makeSheet, testMatchOptions } from '../../domain/match/fixtures';
import { availability, benchPlayers, pitchColumns, toChip } from './pitch';

function match() {
  return createMatch(
    testMatchOptions(
      makeSheet({ clubId: 'h', formation: '4-4-2', benchAbilities: ['kebab'] }),
      makeSheet({ clubId: 'a', formation: '3-5-2', isHuman: true }),
    ),
  );
}

describe('terrain en direct (CAP-03)', () => {
  test('place le coach de son gardien à son attaque, l’adversaire en miroir', () => {
    const columns = pitchColumns(match(), 'away');
    expect(columns.map((column) => `${column.side}-${column.line}`)).toEqual([
      'away-GK', 'away-DEF', 'away-MID', 'away-ATT',
      'home-ATT', 'home-MID', 'home-DEF', 'home-GK',
    ]);
    expect(columns.map((column) => column.players.length)).toEqual([1, 3, 5, 2, 2, 4, 4, 1]);
  });

  test('le banc ne contient que les remplaçants', () => {
    const state = match();
    expect(benchPlayers(state, 'home').map((player) => player.id)).toEqual(['h-b0']);
    expect(benchPlayers(state, 'away')).toEqual([]);
  });

  test('grise exclus, blessés et joueurs au sol avec la raison', () => {
    const player = match().home.players[3]!;
    expect(availability(player, 10)).toBe('active');
    player.knockedOutUntil = 12;
    expect(availability(player, 10)).toBe('knockedOut');
    player.injured = true;
    expect(availability(player, 10)).toBe('injured');
    player.sentOff = true;
    expect(availability(player, 10)).toBe('sentOff');
  });
});

describe('effets actifs (CAP-09)', () => {
  test('bonus avec « + » et compte à rebours en minutes', () => {
    const chip = toChip({ label: 'Pilier', stat: 'speed', value: 0.4, remaining: 12 });
    expect(chip).toMatchObject({ tone: 'bonus', sign: '+', countdown: "12'" });
    expect(chip.detail).toBe('Pilier : + 40 % vitesse, encore 12 min');
  });

  test('malus avec « − », effet jusqu’au coup de sifflet', () => {
    const chip = toChip({ label: 'Chambrage', stat: 'morale', value: -0.1, remaining: null });
    expect(chip).toMatchObject({ tone: 'malus', sign: '−', countdown: 'fin' });
  });

  test('mise hors jeu sans pourcentage', () => {
    expect(toChip({ label: 'Le Boucher', stat: 'knockout', value: -1, remaining: 3 }).detail).toBe(
      'Le Boucher : − hors jeu, encore 3 min',
    );
  });
});
