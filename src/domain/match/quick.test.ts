import { describe, expect, test } from 'bun:test';
import { createRng } from '../core/rng';
import { makeSheet } from './fixtures';
import { simulateQuick } from './quick';

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
      const result = strongAtHome ? simulateQuick(strong, weak, rng) : simulateQuick(weak, strong, rng);
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
      const result = simulateQuick(makeSheet({ clubId: 'h' }), makeSheet({ clubId: 'a' }), rng, true);
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
});
