import { describe, expect, test } from 'bun:test';
import { getAbility } from './catalog';
import { level5Bonus, levelForXp, statsAtLevel } from './progression';

const valueOf = (id: string, level: number) => (statsAtLevel(getAbility(id), level).effects[0] as { value: number }).value;

describe('progression des capacités', () => {
  test('les seuils d’XP font monter jusqu’au niveau 5 (CAP-10)', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(80)).toBe(3);
    expect(levelForXp(10_000)).toBe(5);
  });

  test('chaque niveau renforce l’effet de 10 % (CAP-11)', () => {
    expect(valueOf('le-buteur-de-comptoir', 1)).toBeCloseTo(0.4);
    expect(valueOf('le-buteur-de-comptoir', 3)).toBeCloseTo(0.48);
    expect(valueOf('le-buteur-de-comptoir', 4)).toBeCloseTo(0.52);
  });

  test('le niveau 5 donne une cible de plus aux capacités ciblées', () => {
    const bulldozer = getAbility('le-bulldozer');
    expect(level5Bonus(bulldozer)).toBe('extraTarget');
    expect(statsAtLevel(bulldozer, 4).targeting.count).toBe(2);
    expect(statsAtLevel(bulldozer, 5).targeting.count).toBe(3);
  });

  test('sinon +50 % de durée', () => {
    const mobylette = getAbility('la-mobylette');
    expect(level5Bonus(mobylette)).toBe('longerDuration');
    expect((statsAtLevel(mobylette, 5).effects[0] as { duration: number }).duration).toBe(12);
  });

  test('sinon une recharge plus courte', () => {
    const frappe = getAbility('la-frappe-de-mule');
    expect(level5Bonus(frappe)).toBe('shorterCooldown');
    expect(statsAtLevel(frappe, 5).cooldown).toBe(10);
  });

  test('la contrepartie de La Mêlée générale ne grandit pas avec le niveau', () => {
    const [, self] = statsAtLevel(getAbility('la-melee-generale'), 4).effects;
    expect(self).toMatchObject({ scope: 'self', duration: 15 });
  });
});
