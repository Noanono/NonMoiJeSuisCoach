import { describe, expect, test } from 'bun:test';
import { makeSheet, testMatchOptions } from './fixtures';
import { activeEffects, confirmActivation, createMatch, startActivation, summarize, tick } from './index';

describe('API publique du moteur de match', () => {
  test('un coach humain mène son match jusqu’au bout, avec la fenêtre de mi-temps (CAP-19, MATCH-02)', () => {
    const home = makeSheet({ clubId: 'h', isHuman: true, abilities: { 5: 'discours' } });
    const state = createMatch(testMatchOptions(home, makeSheet({ clubId: 'a', abilities: { 6: 'bus' } }), 4));
    let halftimeWindowSeen = false;
    for (let i = 0; i < 400 && state.status !== 'finished'; i++) {
      if (state.awaiting?.trigger === 'halftime') {
        halftimeWindowSeen = true;
        expect(state.status).toBe('halftime');
        startActivation(state, 'home', 'h-5');
        expect(confirmActivation(state).some((event) => event.kind === 'activation')).toBe(true);
        expect(activeEffects(state, 'h-0')[0]).toMatchObject({ value: 0.05, remaining: 45 });
      } else if (state.awaiting) {
        throw new Error(`Fenêtre inattendue : ${state.awaiting.trigger}`);
      }
      tick(state);
    }
    expect(halftimeWindowSeen).toBe(true);
    expect(state.status).toBe('finished');
    expect(summarize(state).abilities.some((report) => report.abilityId === 'discours')).toBe(true);
  });
});
