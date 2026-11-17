import { describe, expect, test } from 'bun:test';
import type { Division, Fixture, StandingRow } from '../types';
import { createPlayoffFixtures, playoffMoves, playoffPairings, playoffZone } from './playoffs';

const TIERS = 4;
const divisions: Division[] = Array.from({ length: TIERS }, (_, index) => {
  const tier = index + 1;
  return {
    id: `d${tier}`,
    name: `Division ${tier}`,
    tier,
    clubIds: Array.from({ length: 10 }, (_, club) => `d${tier}-c${club + 1}`),
    promoted: tier === 1 ? 0 : 2,
    relegated: tier === TIERS ? 0 : 2,
  };
});
const row = (clubId: string): StandingRow => ({ clubId, played: 18, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
const standings = Object.fromEntries(divisions.map((division) => [division.id, division.clubIds.map(row)]));

function played(fixture: Fixture, homeGoals: number, awayGoals: number, penaltyWinnerId?: string): Fixture {
  return { ...fixture, result: { homeGoals, awayGoals, scorers: [], ...(penaltyWinnerId ? { penaltyWinnerId } : {}) } };
}

describe('barrages d’accession', () => {
  test('le 3e de chaque division affronte le 8e de la division du dessus, chez lui', () => {
    const fixtures = createPlayoffFixtures(playoffPairings(divisions, standings), 1, 30);
    expect(fixtures.map((fixture) => [fixture.homeId, fixture.awayId])).toEqual([
      ['d1-c8', 'd2-c3'],
      ['d2-c8', 'd3-c3'],
      ['d3-c8', 'd4-c3'],
    ]);
    expect(fixtures.every((fixture) => fixture.competition === 'playoff' && fixture.week === 30)).toBe(true);
  });

  test('si le club d’en bas gagne, les deux clubs échangent leur division ; sinon rien ne bouge', () => {
    const [top, middle] = createPlayoffFixtures(playoffPairings(divisions, standings), 1, 30);
    const moves = playoffMoves([played(top!, 0, 1), played(middle!, 2, 2, 'd2-c8')], divisions);
    expect(moves).toEqual([
      { clubId: 'd2-c3', fromDivisionId: 'd2', toDivisionId: 'd1', kind: 'promotion' },
      { clubId: 'd1-c8', fromDivisionId: 'd1', toDivisionId: 'd2', kind: 'relegation' },
    ]);
  });

  test('le classement signale les places de barrage', () => {
    const [elite, , , district] = divisions;
    expect(playoffZone(district!, true, false, 3)).toBe('up');
    expect(playoffZone(elite!, false, true, 8)).toBe('down');
    expect(playoffZone(elite!, false, true, 3)).toBeNull();
    expect(playoffZone(district!, true, false, 8)).toBeNull();
  });
});
