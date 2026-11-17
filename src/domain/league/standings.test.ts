import { describe, expect, test } from 'bun:test';
import type { Fixture } from '../types';
import { computeStandings } from './standings';

let nextId = 0;
function played(homeId: string, awayId: string, homeGoals: number, awayGoals: number, competition: Fixture['competition'] = 'league'): Fixture {
  return {
    id: `f${++nextId}`,
    competition,
    divisionId: competition === 'league' ? 'd1' : null,
    round: 1,
    week: 1,
    homeId,
    awayId,
    result: { homeGoals, awayGoals, scorers: [] },
  };
}

describe('classement (UNIV-05)', () => {
  test('points 3 / 1 / 0 avant la différence de buts', () => {
    const fixtures = [
      played('a', 'b', 1, 0),
      played('c', 'd', 5, 0),
      played('b', 'd', 2, 2),
      played('a', 'd', 3, 3),
    ];
    const table = computeStandings(['a', 'b', 'c', 'd'], fixtures);
    // c a la meilleure différence (+5) mais a, avec une victoire et un nul, a plus de points.
    expect(table.map((row) => row.clubId)).toEqual(['a', 'c', 'd', 'b']);
    expect(table.map((row) => row.points)).toEqual([4, 3, 2, 1]);
  });

  test('à points égaux, la différence de buts départage', () => {
    const table = computeStandings(['x', 'y', 'z'], [played('x', 'z', 1, 0), played('y', 'z', 4, 0)]);
    expect(table.map((row) => row.clubId)).toEqual(['y', 'x', 'z']);
    expect(table[0]).toMatchObject({ played: 1, won: 1, points: 3, goalsFor: 4, goalsAgainst: 0 });
    expect(table[2]).toMatchObject({ played: 2, lost: 2, points: 0, goalsAgainst: 5 });
  });

  test('à différence égale, les buts marqués départagent', () => {
    const table = computeStandings(['x', 'y', 'z', 'w'], [played('x', 'z', 1, 0), played('y', 'w', 3, 2)]);
    expect(table.map((row) => row.clubId).slice(0, 2)).toEqual(['y', 'x']);
  });

  test('les matchs de coupe et non joués sont ignorés', () => {
    const unplayed: Fixture = { ...played('a', 'b', 0, 0), result: null };
    const table = computeStandings(['a', 'b'], [played('a', 'b', 0, 3, 'cup'), unplayed]);
    expect(table.every((row) => row.played === 0)).toBe(true);
  });
});
