import { describe, expect, test } from 'bun:test';
import { makeSheet } from './fixtures';
import { freeKickChances, resolvePendingPlay } from './plays';
import { beginRun, createMatch, endRun } from './state';
import type { FreeKickDistance, FreeKickOption, MatchState, WallSize } from './types';

function freeKickMatch(seed: number, distance: FreeKickDistance, option: FreeKickOption, wall: WallSize, boosted: boolean): MatchState {
  const state = createMatch({ home: makeSheet({ clubId: 'h', isHuman: true }), away: makeSheet({ clubId: 'a', level: 55 }), seed });
  state.pendingPlay = { kind: 'freeKick', side: 'home', takerId: null, distance, option, wall };
  if (boosted) {
    state.home.setPieceBoosts.push({ option: 'shot', value: 0.1 }, { option: 'cross', value: 0.05 });
    state.home.chanceBoosts.push({ value: 0.04 });
  }
  return state;
}

/** Fréquence réelle de but quand la simulation joue le coup franc. */
function measured(distance: FreeKickDistance, option: FreeKickOption, wall: WallSize, boosted: boolean, runs: number): number {
  let goals = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const state = freeKickMatch(seed, distance, option, wall, boosted);
    const run = beginRun(state);
    resolvePendingPlay(run);
    endRun(run);
    if (state.home.goals > 0) goals++;
  }
  return goals / runs;
}

describe('chances exactes de coup franc affichées au coach', () => {
  for (const [distance, option, wall, boosted] of [
    ['close', 'shot', 'large', false],
    ['close', 'shot', 'small', true],
    ['far', 'cross', 'small', true],
    ['medium', 'combination', 'normal', false],
  ] as const) {
    test(`${distance} / ${option} / mur ${wall}${boosted ? ' / capacités' : ''} : l’affichage colle à la simulation`, () => {
      const shown = freeKickChances(freeKickMatch(1, distance, option, wall, boosted))![option];
      const runs = 4000;
      // Marge de trois écarts-types de l'échantillon.
      const margin = 3 * Math.sqrt((shown.chance * (1 - shown.chance)) / runs) + 0.005;
      expect(Math.abs(measured(distance, option, wall, boosted, runs) - shown.chance)).toBeLessThan(margin);
    });
  }

  test('le tireur de la frappe directe et la part des capacités sont donnés', () => {
    const chances = freeKickChances(freeKickMatch(1, 'close', 'shot', 'normal', true))!;
    expect(chances.shot.takerName).not.toBeNull();
    expect(chances.cross.takerName).toBeNull();
    expect(chances.shot.boost).toBeCloseTo(0.14);
    expect(chances.cross.boost).toBeCloseTo(0.09);
    expect(chances.combination.boost).toBeCloseTo(0.04);
  });

  test('un coup franc qui sera annulé vaut 0 %', () => {
    const state = freeKickMatch(1, 'close', 'shot', 'normal', false);
    state.away.pendingCancels = 1;
    expect(freeKickChances(state)!.shot.chance).toBe(0);
  });
});
