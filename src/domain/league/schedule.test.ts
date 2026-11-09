import { describe, expect, test } from 'bun:test';
import type { Division } from '../types';
import { createRng } from '../core/rng';
import { doubleRoundRobin, generateLeagueFixtures } from './schedule';

const clubs = (count: number) => Array.from({ length: count }, (_, index) => `c${index + 1}`);

function longestVenueStreak(clubId: string, rounds: ReturnType<typeof doubleRoundRobin>): number {
  let longest = 0;
  let streak = 0;
  let previous: boolean | null = null;
  for (const round of rounds) {
    const match = round.find((pairing) => pairing.homeId === clubId || pairing.awayId === clubId);
    if (!match) continue;
    const atHome = match.homeId === clubId;
    streak = atHome === previous ? streak + 1 : 1;
    previous = atHome;
    longest = Math.max(longest, streak);
  }
  return longest;
}

describe('calendrier de championnat (UNIV-05)', () => {
  test.each([4, 10, 12])('aller-retour complet à %i clubs, chacun une fois par journée', (count) => {
    const ids = clubs(count);
    const rounds = doubleRoundRobin(ids);
    expect(rounds).toHaveLength((count - 1) * 2);
    for (const round of rounds) {
      const playing = round.flatMap((pairing) => [pairing.homeId, pairing.awayId]);
      expect(new Set(playing).size).toBe(count);
    }
    const matchups = new Set(rounds.flat().map((pairing) => `${pairing.homeId}-${pairing.awayId}`));
    expect(matchups.size).toBe(count * (count - 1));
  });

  test('alternance domicile / extérieur : jamais trois fois de suite au même endroit', () => {
    const ids = clubs(10);
    const rounds = doubleRoundRobin(ids);
    for (const id of ids) {
      expect(longestVenueStreak(id, rounds)).toBeLessThanOrEqual(2);
      expect(rounds.flat().filter((pairing) => pairing.homeId === id)).toHaveLength(9);
    }
  });

  test('nombre impair de clubs : un exempt par journée', () => {
    const rounds = doubleRoundRobin(clubs(5));
    expect(rounds).toHaveLength(10);
    for (const round of rounds) expect(round).toHaveLength(2);
    expect(new Set(rounds.flat().map((pairing) => `${pairing.homeId}-${pairing.awayId}`)).size).toBe(20);
  });

  test('matchs placés sur les semaines de championnat, identifiants uniques', () => {
    const division: Division = { id: 'd4', name: 'District', tier: 4, clubIds: clubs(10), promoted: 2, relegated: 0 };
    const fixtures = generateLeagueFixtures({ division, season: 1, rng: createRng(3) });
    expect(fixtures).toHaveLength(90);
    expect(new Set(fixtures.map((fixture) => fixture.id)).size).toBe(90);
    for (let round = 1; round <= 18; round++) {
      const weeks = new Set(fixtures.filter((fixture) => fixture.round === round).map((fixture) => fixture.week));
      expect(weeks.size).toBe(1);
    }
  });
});
