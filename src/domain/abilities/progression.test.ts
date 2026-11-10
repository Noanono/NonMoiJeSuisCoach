import { describe, expect, test } from 'bun:test';
import type { Effect } from '../types';
import { ABILITIES, getAbility } from './catalog';
import { growsWithLevel, LEVEL_BONUS_PER_LEVEL, level5Bonus, levelForXp, MAX_LEVEL, statsAtLevel } from './progression';

const valueOf = (id: string, level: number) => (statsAtLevel(getAbility(id), level).effects[0] as { value: number }).value;
const durationOf = (id: string, level: number) => (statsAtLevel(getAbility(id), level).effects[0] as { duration: number }).duration;

describe('progression des capacités', () => {
  test('les seuils d’XP font monter jusqu’au niveau 5 (CAP-10)', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(80)).toBe(3);
    expect(levelForXp(10_000)).toBe(5);
  });

  test('chaque niveau renforce l’effet de 10 % (CAP-11)', () => {
    const base = valueOf('le-buteur-de-comptoir', 1);
    expect(valueOf('le-buteur-de-comptoir', 3)).toBeCloseTo(base * 1.2);
    expect(valueOf('le-buteur-de-comptoir', 4)).toBeCloseTo(base * 1.3);
  });

  test('chaque niveau allonge les effets d’au moins une minute (CAP-11)', () => {
    for (let level = 2; level <= MAX_LEVEL - 1; level++) {
      expect(durationOf('le-buteur-de-comptoir', level)).toBeGreaterThan(durationOf('le-buteur-de-comptoir', level - 1));
    }
  });

  test('toutes les capacités progressent à chaque niveau (CAP-11)', () => {
    for (const ability of ABILITIES) {
      for (let level = 2; level <= MAX_LEVEL; level++) {
        expect(JSON.stringify(statsAtLevel(ability, level))).not.toBe(JSON.stringify(statsAtLevel(ability, level - 1)));
      }
    }
  });

  test('une capacité sans chiffre à faire grandir gagne un petit bonus d’équipe par niveau', () => {
    const kamikaze = getAbility('le-gardien-kamikaze');
    expect(kamikaze.effects.some(growsWithLevel)).toBe(false);
    expect(statsAtLevel(kamikaze, 1).effects).toHaveLength(kamikaze.effects.length);
    const bonus = statsAtLevel(kamikaze, 3).effects.at(-1) as Extract<Effect, { type: 'modifier' }>;
    expect(bonus).toMatchObject({ type: 'modifier', scope: 'team', stat: 'all' });
    expect(bonus.value).toBeCloseTo(LEVEL_BONUS_PER_LEVEL * 2);
  });

  test('le niveau 5 donne une cible de plus aux capacités ciblées', () => {
    const bulldozer = getAbility('le-bulldozer');
    expect(level5Bonus(bulldozer)).toBe('extraTarget');
    expect(statsAtLevel(bulldozer, 4).targeting.count).toBe(2);
    expect(statsAtLevel(bulldozer, 5).targeting.count).toBe(3);
  });

  test('sinon +50 % de durée en plus', () => {
    const mobylette = getAbility('la-mobylette');
    expect(level5Bonus(mobylette)).toBe('longerDuration');
    const base = durationOf('la-mobylette', 1);
    const step = Math.max(1, Math.round(base * 0.1));
    expect(durationOf('la-mobylette', 5)).toBe(Math.round((base + 4 * step) * 1.5));
  });

  test('sinon une recharge plus courte', () => {
    const frappe = getAbility('la-frappe-de-mule');
    expect(level5Bonus(frappe)).toBe('shorterCooldown');
    expect(statsAtLevel(frappe, 5).cooldown).toBe(10);
  });

  test('la contrepartie de La Mêlée générale ne grandit pas avec le niveau', () => {
    const [, self] = statsAtLevel(getAbility('la-melee-generale'), 5).effects;
    expect(self).toMatchObject({ scope: 'self', duration: 15 });
  });
});
