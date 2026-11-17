import { describe, expect, test } from 'bun:test';
import { EMPTY_SLOT, MAX_BENCH_SIZE, STARTERS_COUNT } from '../../domain/league/lineup';
import type { Lineup } from '../../domain/types';
import { emptyLineup, movePlayer } from './lineupEdit';

function lineup(starters: string[], bench: string[] = []): Lineup {
  return { ...emptyLineup('4-4-2'), starters, bench };
}

const placed = (result: Lineup) => result.starters.filter((id) => id !== EMPTY_SLOT);

describe('cartes sur le terrain (EFF-03)', () => {
  test('deux titulaires échangent leurs postes', () => {
    expect(placed(movePlayer(lineup(['a', 'b', 'c']), 'c', { kind: 'slot', index: 0 }))).toEqual(['c', 'b', 'a']);
  });

  test('un titulaire peut rejoindre un poste libre sans décaler les autres', () => {
    const result = movePlayer(lineup(['a', 'b', 'c']), 'a', { kind: 'slot', index: 5 });
    expect(result.starters[0]).toBe(EMPTY_SLOT);
    expect(result.starters[1]).toBe('b');
    expect(result.starters[5]).toBe('a');
    expect(result.starters).toHaveLength(STARTERS_COUNT);
  });

  test('un remplaçant prend le poste et l’ancien titulaire part à sa place sur le banc', () => {
    const result = movePlayer(lineup(['a', 'b'], ['x', 'y']), 'y', { kind: 'slot', index: 1 });
    expect(placed(result)).toEqual(['a', 'y']);
    expect(result.bench).toEqual(['x', 'b']);
  });

  test('un joueur de tribune remplace le titulaire, qui monte en tribune', () => {
    const result = movePlayer(lineup(['a', 'b'], ['x']), 'z', { kind: 'slot', index: 0 });
    expect(placed(result)).toEqual(['z', 'b']);
    expect(result.bench).toEqual(['x']);
  });

  test('un remplaçant posé sur un poste libre quitte le banc', () => {
    const result = movePlayer(lineup(['a'], ['x']), 'x', { kind: 'slot', index: 1 });
    expect(placed(result)).toEqual(['a', 'x']);
    expect(result.bench).toEqual([]);
  });
});

describe('cartes sur le banc et en tribune', () => {
  test('un titulaire envoyé sur le banc libère son poste, sans décaler le reste', () => {
    const result = movePlayer(lineup(['a', 'b', 'c']), 'b', { kind: 'bench' });
    expect(result.starters.slice(0, 3)).toEqual(['a', EMPTY_SLOT, 'c']);
    expect(result.bench).toEqual(['b']);
  });

  test('lâché sur un remplaçant, le titulaire échange avec lui', () => {
    const result = movePlayer(lineup(['a', 'b'], ['x', 'y']), 'a', { kind: 'bench', occupantId: 'y' });
    expect(placed(result)).toEqual(['y', 'b']);
    expect(result.bench).toEqual(['x', 'a']);
  });

  test('banc plein : une carte refusée, sauf échange', () => {
    const full = lineup(['a'], Array.from({ length: MAX_BENCH_SIZE }, (_, index) => `s${index}`));
    expect(movePlayer(full, 'z', { kind: 'bench' })).toBe(full);
    expect(movePlayer(full, 'z', { kind: 'bench', occupantId: 's2' }).bench[2]).toBe('z');
  });

  test('en tribune, le joueur quitte le groupe ; lâché sur un joueur, celui-ci prend sa place', () => {
    expect(movePlayer(lineup(['a'], ['x']), 'x', { kind: 'stand' }).bench).toEqual([]);
    expect(movePlayer(lineup(['a'], ['x']), 'a', { kind: 'stand' }).starters[0]).toBe(EMPTY_SLOT);
    expect(placed(movePlayer(lineup(['a'], ['x']), 'a', { kind: 'stand', occupantId: 'z' }))).toEqual(['z']);
    expect(movePlayer(lineup(['a'], ['x']), 'x', { kind: 'stand', occupantId: 'z' }).bench).toEqual(['z']);
  });

  test('un joueur déjà en tribune n’y bouge pas', () => {
    const base = lineup(['a']);
    expect(movePlayer(base, 'z', { kind: 'stand' })).toBe(base);
  });
});
