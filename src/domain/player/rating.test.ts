import { describe, expect, test } from 'bun:test';
import { effectiveRating, injuryRisk, overall, ratingAtPosition, FORMATION_SLOTS } from './rating';
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

  test('la note affichée ignore la fatigue, la note réelle en tient compte (EFF-04)', () => {
    const tired = makePlayer({ fatigue: 40 });
    expect(ratingAtPosition(tired, 'ATT')).toBe(overall(tired));
    expect(effectiveRating(tired, 'ATT')).toBeLessThan(ratingAtPosition(tired, 'ATT'));
  });

  test('un joueur fatigué se blesse plus souvent (EFF-04)', () => {
    expect(injuryRisk(makePlayer({ fatigue: 90 }))).toBeGreaterThan(injuryRisk(makePlayer()) * 10);
  });

  test('un joueur épuisé perd la moitié de sa note (EFF-04)', () => {
    expect(effectiveRating(makePlayer({ fatigue: 100 }), 'ATT')).toBeCloseTo(effectiveRating(makePlayer(), 'ATT') / 2);
  });

  test('chaque formation aligne 11 joueurs dont un gardien', () => {
    for (const slots of Object.values(FORMATION_SLOTS)) {
      expect(slots).toHaveLength(11);
      expect(slots.filter((p) => p === 'GK')).toHaveLength(1);
    }
  });
});
