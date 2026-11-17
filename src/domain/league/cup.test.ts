import { describe, expect, test } from 'bun:test';
import type { Fixture } from '../types';
import { createRng, type Rng } from '../core/rng';
import { CUP_ROUNDS, cupRoundWeek } from './calendar';
import { createCup, cupRoundName, cupWinnerId, drawNextCupRound, fixtureWinnerId, type CupState } from './cup';

const MAX_GOALS = 3;
const clubs = (count: number) => Array.from({ length: count }, (_, index) => `c${index + 1}`);

/** Joue au hasard tous les matchs du tour en cours, tirs au but compris. */
function playCurrentRound(cup: CupState, rng: Rng): CupState {
  const fixtures = cup.fixtures.map((fixture): Fixture => {
    if (fixture.round !== cup.currentRound || fixture.result) return fixture;
    const homeGoals = rng.int(0, MAX_GOALS);
    const awayGoals = rng.int(0, MAX_GOALS);
    const penaltyWinnerId = homeGoals === awayGoals ? rng.pick([fixture.homeId, fixture.awayId]) : undefined;
    return { ...fixture, result: { homeGoals, awayGoals, penaltyWinnerId, scorers: [] } };
  });
  return { ...cup, fixtures };
}

function playWholeCup(clubIds: string[], seed: number): CupState {
  const rng = createRng(seed);
  let cup = playCurrentRound(createCup({ clubIds, rng, season: 1 }), rng);
  while (cupWinnerId(cup) === null) cup = playCurrentRound(drawNextCupRound(cup, rng), rng);
  return cup;
}

describe('coupe à élimination directe (UNIV-06)', () => {
  test('40 clubs : tour préliminaire de 16 clubs, 24 exemptés, puis 32 clubs', () => {
    const cup = createCup({ clubIds: clubs(40), rng: createRng(1), season: 1 });
    expect(cup.totalRounds).toBe(CUP_ROUNDS);
    expect(cup.fixtures).toHaveLength(8);
    expect(cup.byeClubIds).toHaveLength(24);
    expect(cupRoundName(cup, 1)).toBe('Tour préliminaire');
    expect(cupRoundName(cup, CUP_ROUNDS)).toBe('Finale');
  });

  test.each([40, 32, 5])('%i clubs : tous entrent en lice, un seul vainqueur', (count) => {
    const ids = clubs(count);
    const cup = playWholeCup(ids, count);
    const entrants = new Set(cup.fixtures.flatMap((fixture) => [fixture.homeId, fixture.awayId]));
    expect(entrants).toEqual(new Set(ids));
    expect(cup.fixtures).toHaveLength(count - 1);

    const losers = cup.fixtures.map((fixture) => (fixtureWinnerId(fixture) === fixture.homeId ? fixture.awayId : fixture.homeId));
    expect(new Set(losers).size).toBe(count - 1);
    const winner = cupWinnerId(cup);
    expect(winner).not.toBeNull();
    expect(losers).not.toContain(winner);
  });

  test('chaque tour se joue sur sa semaine de coupe', () => {
    const cup = playWholeCup(clubs(40), 7);
    for (const fixture of cup.fixtures) expect(fixture.week).toBe(cupRoundWeek(fixture.round));
    expect(new Set(cup.fixtures.map((fixture) => fixture.id)).size).toBe(cup.fixtures.length);
  });

  test('qualification aux tirs au but en cas d’égalité', () => {
    const fixture: Fixture = {
      id: 'f', competition: 'cup', divisionId: null, round: 1, week: 1, homeId: 'a', awayId: 'b',
      result: { homeGoals: 1, awayGoals: 1, penaltyWinnerId: 'b', scorers: [] },
    };
    expect(fixtureWinnerId(fixture)).toBe('b');
    expect(() => fixtureWinnerId({ ...fixture, result: { homeGoals: 1, awayGoals: 1, scorers: [] } })).toThrow();
  });

  test('impossible de tirer le tour suivant avant la fin du tour en cours', () => {
    const rng = createRng(3);
    const cup = createCup({ clubIds: clubs(8), rng, season: 1 });
    expect(() => drawNextCupRound(cup, rng)).toThrow();
  });
});
