import { describe, expect, test } from 'bun:test';
import { createMatch, selectTarget, startActivation } from '../../domain/match';
import { makeSheet, testMatchOptions } from '../../domain/match/fixtures';
import { findPlayer } from '../../domain/match/state';
import { availability, benchPlayers, pitchColumns, pitchView, toChip, tokenFocus, tokenView } from './pitch';

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

describe('ciblage sur le terrain (CAP-16, CAP-17)', () => {
  function armed() {
    return createMatch(
      testMatchOptions(
        makeSheet({ clubId: 'h' }),
        makeSheet({ clubId: 'a', isHuman: true, abilities: { 1: 'boucher', 5: 'pilier' }, benchAbilities: ['kebab'] }),
      ),
    );
  }

  test('en jeu, seuls les joueurs du coach se touchent ; les capacités prêtes affichent leur coût', () => {
    const state = armed();
    const view = pitchView(state, 'away');
    const tokens = view.columns.flatMap((column) => column.tokens);
    expect(tokens.find((token) => token.id === 'h-9')!.focus.interactive).toBe(false);
    expect(tokens.find((token) => token.id === 'a-5')!.readyCost).toBe(2);
    expect(tokens.find((token) => token.id === 'a-2')!.readyCost).toBeNull();
    expect(view.bench.map((token) => [token.id, token.reason])).toEqual([['a-b0', null]]);
  });

  test('cibles valides en évidence, les autres grisées, choix une à une', () => {
    const state = armed();
    startActivation(state, 'away', 'a-1');
    const focus = (id: string) => tokenFocus(state, findPlayer(state, id)!, 'away');
    expect(focus('h-9')).toEqual({ interactive: true, highlighted: true, chosen: false, dimmed: false });
    expect(focus('h-5').dimmed).toBe(true);
    expect(focus('a-1').dimmed).toBe(false);
    selectTarget(state, 'h-9');
    expect(focus('h-9')).toMatchObject({ chosen: true, interactive: false });
    expect(focus('h-10').interactive).toBe(false);
  });

  test("fenêtre d'événement : les joueurs éligibles du coach ressortent (CAP-19)", () => {
    const state = armed();
    state.awaiting = { side: 'away', trigger: 'ownSetPiece', eligiblePlayerIds: ['a-5'] };
    const focus = (id: string) => tokenFocus(state, findPlayer(state, id)!, 'away');
    expect(focus('a-5')).toMatchObject({ highlighted: true, interactive: true });
    expect(focus('a-2')).toMatchObject({ highlighted: false, interactive: true });
    expect(focus('h-5').interactive).toBe(false);
  });
});

describe('effets actifs (CAP-09)', () => {
  test('bonus avec « + » et compte à rebours en minutes', () => {
    const chip = toChip({ label: 'Pilier', stat: 'speed', value: 0.4, remaining: 12 });
    expect(chip).toMatchObject({ tone: 'bonus', sign: '+', countdown: "12'" });
    expect(chip.detail).toBe('Pilier : + 40 % vitesse, encore 12 min');
  });

  test('malus avec « − », effet jusqu’au coup de sifflet', () => {
    const chip = toChip({ label: 'Chambrage', stat: 'speed', value: -0.1, remaining: null });
    expect(chip).toMatchObject({ tone: 'malus', sign: '−', countdown: 'fin' });
  });

  test('mise hors jeu sans pourcentage', () => {
    expect(toChip({ label: 'Le Boucher', stat: 'knockout', value: -1, remaining: 3 }).detail).toBe(
      'Le Boucher : − hors jeu, encore 3 min',
    );
  });

  test('la note affichée reste celle du joueur frais', () => {
    const state = match();
    const player = state.home.players[3]!;
    const fresh = tokenView(state, player, 'home').rating;
    player.profile.fatigue = 60;
    expect(tokenView(state, player, 'home').rating).toBe(fresh);
  });

  test('un joueur sous effet porte un halo, le malus l’emporte', () => {
    const state = match();
    const player = state.home.players[3]!;
    expect(tokenView(state, player, 'home').halo).toBeNull();
    player.effects.push({ label: 'x', stat: 'speed', value: 0.2, endsAt: 50 });
    expect(tokenView(state, player, 'home').halo).toBe('bonus');
    player.effects.push({ label: 'y', stat: 'shooting', value: -0.2, endsAt: 50 });
    expect(tokenView(state, player, 'home').halo).toBe('malus');
  });
});
