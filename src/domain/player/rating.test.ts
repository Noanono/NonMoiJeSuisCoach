import { describe, expect, test } from 'bun:test';
import { effectiveRating, injuryRisk, overall, FORMATION_SLOTS } from './rating';
import { makePlayer } from '../testing/fixtures';

describe('note des joueurs', () => {
  test('la note globale pondère les attributs du poste (EFF-01)', () => {
    expect(overall(makePlayer())).toBe(69);
  });

  test('un joueur hors de son poste est moins performant (EFF-02)', () => {
    const player = makePlayer();
    expect(effectiveRating(player, 'DEF')).toBeLessThan(effectiveRating(player, 'ATT'));
  });

  test('la fatigue réduit la performance (EFF-04)', () => {
    const fresh = makePlayer();
    expect(effectiveRating(makePlayer({ fatigue: 80 }), 'ATT')).toBeLessThan(effectiveRating(fresh, 'ATT'));
  });

  test('un joueur fatigué se blesse plus souvent (EFF-04)', () => {
    expect(injuryRisk(makePlayer({ fatigue: 90 }))).toBeGreaterThan(injuryRisk(makePlayer()));
  });

  test('chaque formation aligne 11 joueurs dont un gardien', () => {
    for (const slots of Object.values(FORMATION_SLOTS)) {
      expect(slots).toHaveLength(11);
      expect(slots.filter((p) => p === 'GK')).toHaveLength(1);
    }
  });
});
