import { describe, expect, test } from 'bun:test';
import { createRng } from '../core/rng';
import {
  CUP_ROUNDS,
  cupRoundWeek,
  fixturesForWeek,
  isTransferWindowOpen,
  LEAGUE_ROUNDS,
  leagueRoundWeek,
  SEASON_CALENDAR,
  SEASON_WEEKS,
} from './calendar';
import { generateLeagueFixtures } from './schedule';

describe('calendrier de saison', () => {
  test('chaque journée et chaque tour de coupe ont leur propre semaine', () => {
    const weeks = [
      ...Array.from({ length: LEAGUE_ROUNDS }, (_, index) => leagueRoundWeek(index + 1)),
      ...Array.from({ length: CUP_ROUNDS }, (_, index) => cupRoundWeek(index + 1)),
    ];
    expect(new Set(weeks).size).toBe(LEAGUE_ROUNDS + CUP_ROUNDS);
    expect(Math.max(...weeks)).toBeLessThanOrEqual(SEASON_WEEKS);
  });

  test('journées et tours de coupe dans l’ordre, finale de coupe en fin de saison', () => {
    for (let round = 2; round <= LEAGUE_ROUNDS; round++) {
      expect(leagueRoundWeek(round)).toBeGreaterThan(leagueRoundWeek(round - 1));
    }
    for (let round = 2; round <= CUP_ROUNDS; round++) {
      expect(cupRoundWeek(round)).toBeGreaterThan(cupRoundWeek(round - 1));
    }
    expect(cupRoundWeek(CUP_ROUNDS)).toBe(SEASON_WEEKS);
  });

  test('mercato ouvert en début de saison et à mi-saison seulement (CLUB-02)', () => {
    const openWeeks = SEASON_CALENDAR.filter((entry) => isTransferWindowOpen(entry.week)).map((entry) => entry.week);
    expect(openWeeks.slice(0, 2)).toEqual([1, 2]);
    const winter = openWeeks.slice(2);
    expect(winter.length).toBeGreaterThan(0);
    for (const week of winter) {
      expect(week).toBeGreaterThan(leagueRoundWeek(LEAGUE_ROUNDS / 2));
      expect(week).toBeLessThan(leagueRoundWeek(LEAGUE_ROUNDS / 2 + 1));
    }
    expect(isTransferWindowOpen(leagueRoundWeek(1))).toBe(false);
    expect(isTransferWindowOpen(SEASON_WEEKS + 1)).toBe(false);
  });

  test('matchs d’une semaine donnée', () => {
    const division = { id: 'd1', name: 'Élite', tier: 1, clubIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], promoted: 0, relegated: 2 };
    const fixtures = generateLeagueFixtures({ division, season: 1, rng: createRng(1) });
    const week = leagueRoundWeek(5);
    expect(fixturesForWeek(fixtures, week).every((fixture) => fixture.round === 5)).toBe(true);
    expect(fixturesForWeek(fixtures, week)).toHaveLength(5);
    expect(fixturesForWeek(fixtures, 1)).toHaveLength(0);
  });
});
