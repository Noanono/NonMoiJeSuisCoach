import { describe, expect, test } from 'bun:test';
import type { Club, Division, StandingRow } from '../types';
import { applyDivisionMoves, computeDivisionMoves } from './promotion';

const TIERS = 4;
const CLUBS_PER_DIVISION = 10;
const SLOTS = 2;

const divisions: Division[] = Array.from({ length: TIERS }, (_, index) => {
  const tier = index + 1;
  return {
    id: `d${tier}`,
    name: `Division ${tier}`,
    tier,
    clubIds: Array.from({ length: CLUBS_PER_DIVISION }, (_, club) => `d${tier}-c${club + 1}`),
    promoted: tier === 1 ? 0 : SLOTS,
    relegated: tier === TIERS ? 0 : SLOTS,
  };
});

const row = (clubId: string): StandingRow => ({ clubId, played: 18, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
/** Classement final = ordre de `clubIds`. */
const standings = Object.fromEntries(divisions.map((division) => [division.id, division.clubIds.map(row)]));

const clubs: Record<string, Club> = Object.fromEntries(
  divisions.flatMap((division) =>
    division.clubIds.map((id) => [
      id,
      { id, name: id, shortName: 'XXX', divisionId: division.id, reputation: 50, budget: 0, playerIds: [], lineup: null, isHuman: false, stadium: '' },
    ]),
  ),
);

describe('montées et descentes (UNIV-04)', () => {
  const moves = computeDivisionMoves(divisions, standings);

  test('2 montées et 2 descentes entre chaque paire de divisions adjacentes', () => {
    expect(moves.filter((move) => move.kind === 'promotion')).toHaveLength(SLOTS * (TIERS - 1));
    expect(moves.filter((move) => move.kind === 'relegation')).toHaveLength(SLOTS * (TIERS - 1));
  });

  test('les premiers montent, les derniers descendent, l’élite ne monte pas, le district ne descend pas', () => {
    const fromTier = (id: string) => moves.filter((move) => move.fromDivisionId === id);
    expect(fromTier('d1').map((move) => move.clubId)).toEqual(['d1-c9', 'd1-c10']);
    expect(fromTier('d4').map((move) => move.clubId)).toEqual(['d4-c1', 'd4-c2']);
    expect(fromTier('d2').map((move) => [move.clubId, move.toDivisionId])).toEqual([
      ['d2-c1', 'd1'],
      ['d2-c2', 'd1'],
      ['d2-c9', 'd3'],
      ['d2-c10', 'd3'],
    ]);
  });

  test('après application, chaque division garde 10 clubs et les clubs connaissent leur nouvelle division', () => {
    const applied = applyDivisionMoves(divisions, clubs, moves);
    for (const division of applied.divisions) expect(division.clubIds).toHaveLength(CLUBS_PER_DIVISION);
    expect(applied.divisions[0]!.clubIds).toContain('d2-c1');
    expect(applied.clubs['d2-c1']!.divisionId).toBe('d1');
    expect(applied.clubs['d1-c10']!.divisionId).toBe('d2');
    expect(clubs['d2-c1']!.divisionId).toBe('d2');
  });
});
