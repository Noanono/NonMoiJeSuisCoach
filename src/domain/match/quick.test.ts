import { describe, expect, test } from 'bun:test';
import { createRng } from '../core/rng';
import { makeSheet } from './fixtures';
import { simulateQuick } from './quick';
import { aiMatch, playToEnd } from './fixtures';

const MATCHES = 200;

describe('simulation rapide IA contre IA', () => {
  test('sur 200 matchs, l’équipe nettement plus forte gagne majoritairement (MATCH-01)', () => {
    const rng = createRng(2026);
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < MATCHES; i++) {
      const strongAtHome = i % 2 === 0;
      const strong = makeSheet({ clubId: 'strong', level: 72 });
      const weak = makeSheet({ clubId: 'weak', level: 52 });
      const result = strongAtHome ? simulateQuick(strong, weak, rng).result : simulateQuick(weak, strong, rng).result;
      const strongGoals = strongAtHome ? result.homeGoals : result.awayGoals;
      const weakGoals = strongAtHome ? result.awayGoals : result.homeGoals;
      if (strongGoals > weakGoals) strongWins++;
      if (weakGoals > strongGoals) weakWins++;
    }
    expect(strongWins).toBeGreaterThan(MATCHES / 2);
    expect(weakWins).toBeLessThan(strongWins / 4);
  });

  test('le résultat est cohérent : un buteur par but, du bon club, et un vainqueur en coupe', () => {
    const rng = createRng(5);
    for (let i = 0; i < 50; i++) {
      const { result } = simulateQuick(makeSheet({ clubId: 'h' }), makeSheet({ clubId: 'a' }), rng, true);
      const homeScorers = result.scorers.filter((scorer) => scorer.clubId === 'h');
      expect(homeScorers).toHaveLength(result.homeGoals);
      expect(result.scorers).toHaveLength(result.homeGoals + result.awayGoals);
      for (const scorer of homeScorers) expect(scorer.playerId.startsWith('h-')).toBe(true);
      if (result.homeGoals === result.awayGoals) expect(['h', 'a']).toContain(result.penaltyWinnerId!);
      else expect(result.penaltyWinnerId).toBeUndefined();
    }
  });

  test('même graine, même résultat', () => {
    const play = () => simulateQuick(makeSheet({ clubId: 'h' }), makeSheet({ clubId: 'a' }), createRng(8));
    expect(play()).toEqual(play());
  });

  test('cartons et blessures aussi en simulation rapide, au même taux qu’en direct (C2, C3)', () => {
    const rng = createRng(11);
    let reds = 0;
    let yellows = 0;
    let injuries = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      const { incidents } = simulateQuick(makeSheet({ clubId: 'h' }), makeSheet({ clubId: 'a' }), rng);
      reds += new Set(incidents.cards.filter((card) => card.card === 'red').map((card) => card.playerId)).size;
      yellows += incidents.cards.filter((card) => card.card === 'yellow').length;
      injuries += incidents.injuries.length;
      for (const card of incidents.cards) if (card.card === 'red') expect(card.suspension).toBeGreaterThan(0);
    }
    const quickRedRate = reds / (2 * runs);
    expect(quickRedRate).toBeGreaterThan(0.04);
    expect(quickRedRate).toBeLessThan(0.09);
    expect(yellows / (2 * runs)).toBeGreaterThan(1);
    expect(injuries).toBeGreaterThan(0);
    // En direct, la même fréquence de rouges.
    let liveReds = 0;
    const liveRuns = 400;
    for (let seed = 1; seed <= liveRuns; seed++) {
      const state = aiMatch(seed);
      playToEnd(state);
      liveReds += state.cards.filter((card) => card.card === 'red').length;
    }
    const liveRedRate = liveReds / (2 * liveRuns);
    expect(liveRedRate).toBeGreaterThan(0.03);
    expect(liveRedRate).toBeLessThan(0.1);
  });
});
