import { describe, expect, test } from 'bun:test';
import { createMatch } from '../../domain/match';
import { makeSheet, testMatchOptions } from '../../domain/match/fixtures';
import { beginRun, endRun } from '../../domain/match/state';
import { recordGoal } from '../../domain/match/actions';
import { MAP_HEIGHT, MAP_WIDTH, minimapFrame } from './minimap';

function match() {
  return createMatch(testMatchOptions(makeSheet({ clubId: 'h', isHuman: true }), makeSheet({ clubId: 'a' }), 7));
}

describe('mini-carte du match', () => {
  test('montre les 22 joueurs sur le terrain', () => {
    const frame = minimapFrame(match(), 'home', 0);
    expect(frame.dots).toHaveLength(22);
    for (const dot of frame.dots) {
      expect(dot.x).toBeGreaterThanOrEqual(0);
      expect(dot.x).toBeLessThanOrEqual(MAP_WIDTH);
      expect(dot.y).toBeLessThanOrEqual(MAP_HEIGHT);
    }
  });

  test('un exclu et un blessé disparaissent, un joueur au sol reste', () => {
    const state = match();
    state.home.players[3]!.sentOff = true;
    state.home.players[4]!.injured = true;
    state.home.players[5]!.knockedOutUntil = 20;
    const frame = minimapFrame(state, 'home', 0);
    expect(frame.dots).toHaveLength(20);
    expect(frame.dots.find((dot) => dot.id === 'h-5')!.down).toBe(true);
  });

  test('le coach joue toujours de la gauche vers la droite, quel que soit son camp', () => {
    const keeper = (side: 'home' | 'away', id: string) => minimapFrame(match(), side, 0).dots.find((dot) => dot.id === id)!;
    expect(keeper('home', 'h-0').x).toBeLessThan(MAP_WIDTH / 2);
    expect(keeper('away', 'a-0').x).toBeLessThan(MAP_WIDTH / 2);
    expect(keeper('away', 'h-0').x).toBeGreaterThan(MAP_WIDTH / 2);
  });

  test('sur un but, le ballon finit au fond du bon but', () => {
    const state = match();
    const run = beginRun(state);
    recordGoal(run, 'home', state.home.players[9]!);
    endRun(run);
    expect(minimapFrame(state, 'home', 0).ball.x).toBeLessThan(MAP_WIDTH - 10);
    const last = minimapFrame(state, 'home', 2);
    expect(last.ball.x).toBe(MAP_WIDTH);
    expect(last.goal).toBe(true);
    expect(minimapFrame(state, 'away', 2).ball.x).toBe(0);
  });

  test('même minute et même étape, même image', () => {
    const state = match();
    expect(minimapFrame(state, 'home', 1)).toEqual(minimapFrame(state, 'home', 1));
  });
});
