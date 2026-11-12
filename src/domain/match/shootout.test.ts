import { describe, expect, test } from 'bun:test';
import { createRng } from '../core/rng';
import { runShootout } from './shootout';

/** Scores qu'une vraie séance peut donner après 5 tirs chacun, en s'arrêtant dès que c'est joué. */
function regulationScores(): Set<string> {
  const scores = new Set<string>();
  for (let mask = 0; mask < 1 << 10; mask++) {
    let home = 0;
    let away = 0;
    for (let shot = 0; shot < 10; shot++) {
      const homeShot = shot % 2 === 0;
      if (mask & (1 << shot)) {
        if (homeShot) home++;
        else away++;
      }
      const homeLeft = 5 - Math.floor(shot / 2) - 1;
      const awayLeft = 5 - Math.floor((shot + 1) / 2);
      if (home + homeLeft < away || away + awayLeft < home) break;
    }
    if (home !== away) scores.add(`${home}-${away}`);
  }
  return scores;
}

describe('tirs au but (UNIV-06)', () => {
  test('la séance s’arrête dès qu’une équipe ne peut plus être rattrapée : aucun score impossible', () => {
    const possible = regulationScores();
    expect(possible.has('5-2')).toBe(false);
    expect(possible.has('3-0')).toBe(true);
    for (let seed = 1; seed <= 3000; seed++) {
      const result = runShootout(createRng(seed), 0.6 + (seed % 7) * 0.05, 0.6 + (seed % 5) * 0.06);
      const score = `${result.home}-${result.away}`;
      expect(result.winner).toBe(result.home > result.away ? 'home' : 'away');
      // Après la séance réglementaire, la mort subite se gagne d'un but.
      if (!possible.has(score)) expect(Math.abs(result.home - result.away)).toBe(1);
      expect(score).not.toBe('5-2');
      expect(score).not.toBe('2-5');
    }
  });
});
