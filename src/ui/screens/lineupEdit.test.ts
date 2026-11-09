import { describe, expect, test } from 'bun:test';
import { MAX_BENCH_SIZE } from '../../domain/league/lineup';
import type { Lineup } from '../../domain/types';
import { assignStarter, emptyLineup, toggleBench } from './lineupEdit';

function lineup(starters: string[], bench: string[] = []): Lineup {
  return { ...emptyLineup('4-4-2'), starters, bench };
}

describe('assignStarter (EFF-03)', () => {
  test('deux titulaires échangent leurs postes', () => {
    expect(assignStarter(lineup(['a', 'b', 'c']), 0, 'c').starters).toEqual(['c', 'b', 'a']);
  });

  test('un remplaçant prend le poste et l’ancien titulaire part sur le banc', () => {
    const result = assignStarter(lineup(['a', 'b'], ['x', 'y']), 1, 'y');
    expect(result.starters).toEqual(['a', 'y']);
    expect(result.bench).toEqual(['x', 'b']);
  });

  test('un joueur hors du groupe remplace le titulaire, qui sort du groupe', () => {
    const result = assignStarter(lineup(['a', 'b'], ['x']), 0, 'z');
    expect(result.starters).toEqual(['z', 'b']);
    expect(result.bench).toEqual(['x']);
  });

  test('un poste vide se remplit à la suite et retire le joueur du banc', () => {
    const result = assignStarter(lineup(['a'], ['x']), 1, 'x');
    expect(result.starters).toEqual(['a', 'x']);
    expect(result.bench).toEqual([]);
  });
});

describe('toggleBench', () => {
  test('ajoute puis retire un remplaçant', () => {
    const withSub = toggleBench(lineup(['a']), 'x');
    expect(withSub.bench).toEqual(['x']);
    expect(toggleBench(withSub, 'x').bench).toEqual([]);
  });

  test('refuse un titulaire et un banc déjà plein', () => {
    const full = lineup(['a'], Array.from({ length: MAX_BENCH_SIZE }, (_, index) => `s${index}`));
    expect(toggleBench(full, 'a')).toBe(full);
    expect(toggleBench(full, 'z')).toBe(full);
  });
});
