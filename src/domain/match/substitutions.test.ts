import { describe, expect, test } from 'bun:test';
import { makeSheet, playToEnd, testMatchOptions } from './fixtures';
import { checkAvailability } from './activation';
import { createMatch, requirePlayer } from './state';
import { summarize } from './summary';
import { canMoveToLine, canSwapPositions, MAX_SUBSTITUTIONS, moveToLine, substitutePlayer, swapPositions } from './substitutions';

function match(bench = ['pilier', 'pilier', 'pilier', 'pilier', 'pilier', 'pilier']) {
  return createMatch(
    testMatchOptions(makeSheet({ clubId: 'h', isHuman: true, abilities: { 9: 'pilier' }, benchAbilities: bench }), makeSheet({ clubId: 'a', isHuman: true })),
  );
}

describe('remplacements (MATCH-08)', () => {
  test('le remplaçant prend le poste du sortant', () => {
    const state = match();
    expect(substitutePlayer(state, 'home', 'h-9', 'h-b0')).not.toBe(false);
    expect(requirePlayer(state, 'h-b0').line).toBe('ATT');
    expect(requirePlayer(state, 'h-9').line).toBeNull();
    expect(state.home.players[9]!.id).toBe('h-b0');
    expect(state.home.substitutionsUsed).toBe(1);
    expect(state.events.at(-1)!.kind).toBe('substitution');
  });

  test('un joueur sorti ne revient pas et ne peut plus agir', () => {
    const state = match();
    substitutePlayer(state, 'home', 'h-9', 'h-b0');
    expect(substitutePlayer(state, 'home', 'h-b0', 'h-9')).toBe(false);
    expect(checkAvailability(state, 'home', requirePlayer(state, 'h-9'))).toContain('sorti');
  });

  test('cinq changements au maximum', () => {
    const state = match();
    for (let index = 0; index < MAX_SUBSTITUTIONS; index++) expect(substitutePlayer(state, 'home', `h-${index + 1}`, `h-b${index}`)).not.toBe(false);
    expect(substitutePlayer(state, 'home', 'h-6', 'h-b5')).toBe(false);
  });

  test('un blessé peut être remplacé, pas un exclu', () => {
    const state = match();
    requirePlayer(state, 'h-3').injured = true;
    expect(substitutePlayer(state, 'home', 'h-3', 'h-b0')).not.toBe(false);
    requirePlayer(state, 'h-4').sentOff = true;
    expect(substitutePlayer(state, 'home', 'h-4', 'h-b1')).toBe(false);
  });

  test('les deux joueurs comptent comme ayant joué', () => {
    const state = match();
    substitutePlayer(state, 'home', 'h-9', 'h-b0');
    const played = (id: string) => summarize(state).players.find((report) => report.playerId === id)!.played;
    expect(played('h-9')).toBe(true);
    expect(played('h-b0')).toBe(true);
    expect(played('h-b1')).toBe(false);
  });

  test('l’IA remplace ses blessés', () => {
    const state = createMatch(testMatchOptions(makeSheet({ clubId: 'h', isHuman: true }), makeSheet({ clubId: 'a', benchAbilities: ['pilier'] })));
    requirePlayer(state, 'a-9').injured = true;
    playToEnd(state);
    expect(requirePlayer(state, 'a-b0').line).toBe('ATT');
  });
});

describe('changements de poste en match', () => {
  test('deux titulaires échangent leur poste sans user de changement', () => {
    const state = match();
    expect(swapPositions(state, 'home', 'h-1', 'h-9')).not.toBe(false);
    expect(requirePlayer(state, 'h-1').line).toBe('ATT');
    expect(requirePlayer(state, 'h-9').line).toBe('DEF');
    expect(state.home.substitutionsUsed).toBe(0);
  });

  test('le gardien peut échanger son poste avec un joueur de champ, pas l’adversaire ni un exclu', () => {
    const state = match();
    expect(canSwapPositions(state, 'home', 'h-0', 'h-5')).toBe(true);
    expect(canSwapPositions(state, 'home', 'h-1', 'a-9')).toBe(false);
    expect(canSwapPositions(state, 'home', 'h-1', 'h-2')).toBe(false);
    requirePlayer(state, 'h-5').sentOff = true;
    expect(canSwapPositions(state, 'home', 'h-0', 'h-5')).toBe(false);
  });

  test('un joueur de champ change de ligne : la formation change', () => {
    const state = match();
    expect(moveToLine(state, 'home', 'h-5', 'ATT')).not.toBe(false);
    expect(state.home.players.filter((player) => player.line === 'ATT')).toHaveLength(3);
    expect(state.home.players.filter((player) => player.line === 'MID')).toHaveLength(3);
  });

  test('personne ne devient gardien en changeant de ligne, et chaque ligne garde un joueur', () => {
    const state = match();
    expect(canMoveToLine(state, 'home', 'h-1', 'GK')).toBe(false);
    expect(canMoveToLine(state, 'home', 'h-0', 'DEF')).toBe(false);
    moveToLine(state, 'home', 'h-9', 'MID');
    expect(canMoveToLine(state, 'home', 'h-10', 'MID')).toBe(false);
  });
});
