import { describe, expect, test } from 'bun:test';
import { recordGoal } from './actions';
import { aiMatch, makeSheet, playToEnd, testMatchOptions } from './fixtures';
import { GAUGE_RECHARGE_INTERVAL, isPaused, setInstructions, tick } from './simulation';
import { beginRun, createMatch, endRun, GAUGE_START } from './state';
import { toMatchResult } from './summary';
import type { MatchState } from './types';
import { dismissEventWindow } from './windows';

describe('simulation minute par minute', () => {
  test('le live texte produit régulièrement des lignes lisibles (MATCH-04)', () => {
    const state = aiMatch(3);
    playToEnd(state);
    expect(state.events[0]!.kind).toBe('kickoff');
    expect(state.events.some((event) => event.kind === 'halftime')).toBe(true);
    expect(state.events.at(-1)!.kind).toBe('fullTime');
    expect(state.events.length).toBeGreaterThan(45);
    for (const event of state.events) expect(event.text).not.toMatch(/\{\w+\}/);
  });

  test('même graine, même match ; reprise identique après sauvegarde JSON (TECH-03)', () => {
    const first = aiMatch(99);
    const second = aiMatch(99);
    for (let i = 0; i < 50; i++) {
      tick(first);
      tick(second);
    }
    const restored: MatchState = JSON.parse(JSON.stringify(second));
    playToEnd(first);
    playToEnd(restored);
    expect(restored.events).toEqual(first.events);
    expect(restored.home.goals).toBe(first.home.goals);
    const other = aiMatch(100);
    playToEnd(other);
    expect(other.events).not.toEqual(first.events);
  });

  test('la jauge part de 3, gagne 1 point toutes les 10 minutes et 1 quand on encaisse (CAP-05)', () => {
    const state = createMatch(
      testMatchOptions(makeSheet({ clubId: 'h', isHuman: true }), makeSheet({ clubId: 'a', isHuman: true })),
    );
    expect(state.home.gauge).toBe(GAUGE_START);
    while (state.elapsed < GAUGE_RECHARGE_INTERVAL) {
      if (state.awaiting) dismissEventWindow(state);
      tick(state);
    }
    const gaugeBefore = state.away.gauge;
    expect(gaugeBefore).toBe(GAUGE_START + 1 + state.home.goals);
    const run = beginRun(state);
    recordGoal(run, 'home', state.home.players[9]!);
    endRun(run);
    expect(state.away.gauge).toBe(gaugeBefore + 1);
  });

  test('l’IA active ses capacités et chaque activation est annoncée (MATCH-07)', () => {
    const state = createMatch(
      testMatchOptions(
        makeSheet({ clubId: 'h', isHuman: true }),
        makeSheet({ clubId: 'a', abilities: { 1: 'boucher', 5: 'pilier', 6: 'chambreur', 7: 'bus' } }),
        11,
      ),
    );
    playToEnd(state);
    const aiActivations = state.activations.filter((record) => record.byAi);
    expect(aiActivations.length).toBeGreaterThan(0);
    const announced = state.events.filter((event) => event.kind === 'activation' && event.side === 'away');
    expect(announced).toHaveLength(aiActivations.length);
    for (const record of aiActivations) {
      for (const targetId of record.targetIds) expect(targetId.startsWith('h-')).toBe(true);
    }
  });

  test('en coupe, une égalité se termine aux tirs au but (UNIV-06)', () => {
    let state: MatchState | undefined;
    for (let seed = 0; seed < 50; seed++) {
      const candidate = createMatch({ ...testMatchOptions(makeSheet({ clubId: 'h' }), makeSheet({ clubId: 'a' }), seed), knockout: true });
      playToEnd(candidate);
      if (candidate.home.goals === candidate.away.goals) {
        state = candidate;
        break;
      }
    }
    expect(state).toBeDefined();
    expect(state!.shootout).not.toBeNull();
    expect(toMatchResult(state!).penaltyWinnerId).toBeDefined();
  });

  test('les consignes changent la simulation : le pressing haut fatigue davantage (MATCH-05)', () => {
    const calm = createMatch(testMatchOptions(makeSheet({ clubId: 'h' }), makeSheet({ clubId: 'a' })));
    const pressing = createMatch(testMatchOptions(makeSheet({ clubId: 'h' }), makeSheet({ clubId: 'a' })));
    setInstructions(pressing, 'home', { mentality: 'offensive', highPress: true, longBall: false });
    playToEnd(calm);
    playToEnd(pressing);
    const fatigue = (state: MatchState) => state.home.players[5]!.profile.fatigue;
    expect(fatigue(pressing)).toBeGreaterThan(fatigue(calm));
  });

  test('tick ne fait rien quand le match attend le coach', () => {
    const state = aiMatch(1);
    state.awaiting = { side: 'home', trigger: 'halftime', eligiblePlayerIds: [] };
    expect(isPaused(state)).toBe(true);
    expect(tick(state)).toEqual([]);
    expect(state.elapsed).toBe(0);
  });
});
