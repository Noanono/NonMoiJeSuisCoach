import { describe, expect, test } from 'bun:test';
import type { Effect } from '../types';
import { ABILITIES, getAbility } from './catalog';
import { createRng } from '../core/rng';
import { careerXpAtAge, gainXp, growsWithLevel, LEVEL_BONUS_PER_LEVEL, level5Bonus, levelForXp, MAX_LEVEL, statsAtLevel, XP_THRESHOLDS } from './progression';

const valueOf = (id: string, level: number) => (statsAtLevel(getAbility(id), level).effects[0] as { value: number }).value;
const durationOf = (id: string, level: number) => (statsAtLevel(getAbility(id), level).effects[0] as { duration: number }).duration;

describe('progression des capacités', () => {
  test('les seuils d’XP font monter jusqu’au niveau 5 (CAP-10)', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(XP_THRESHOLDS[2])).toBe(3);
    expect(levelForXp(XP_THRESHOLDS[2] - 1)).toBe(2);
    expect(levelForXp(10_000)).toBe(5);
  });

  test('chaque niveau coûte plus d’XP que le précédent (CAP-10)', () => {
    for (let i = 2; i < XP_THRESHOLDS.length; i++) {
      expect(XP_THRESHOLDS[i]! - XP_THRESHOLDS[i - 1]!).toBeGreaterThan(XP_THRESHOLDS[i - 1]! - XP_THRESHOLDS[i - 2]!);
    }
  });

  test('gagner de l’XP ne fait jamais redescendre de niveau', () => {
    expect(gainXp({ abilityId: 'x', level: 3, xp: 10, revealed: true }, 5)).toMatchObject({ level: 3, xp: 15 });
    expect(gainXp({ abilityId: 'x', level: 1, xp: 0, revealed: true }, XP_THRESHOLDS[1])).toMatchObject({ level: 2 });
  });

  test('plus un joueur est âgé, plus sa carrière lui a donné d’XP', () => {
    const average = (age: number) => {
      const rng = createRng(3);
      let total = 0;
      for (let i = 0; i < 200; i++) total += careerXpAtAge(rng, age);
      return total / 200;
    };
    expect(average(18)).toBe(0);
    expect(average(25)).toBeGreaterThan(average(21));
    expect(average(33)).toBeGreaterThan(average(25));
    expect(levelForXp(average(33))).toBeGreaterThanOrEqual(3);
    expect(levelForXp(average(21))).toBeLessThanOrEqual(2);
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

  test('sinon un effet 25 % plus fort', () => {
    const frappe = getAbility('la-frappe-de-mule');
    expect(level5Bonus(frappe)).toBe('strongerEffect');
    expect(valueOf('la-frappe-de-mule', 5)).toBeCloseTo(valueOf('la-frappe-de-mule', 1) * 1.4 * 1.25);
  });

  test('plus de recharge : chaque capacité ne sert qu’une fois par match (CAP-04)', () => {
    for (const ability of ABILITIES) expect(statsAtLevel(ability, 1).cooldown).toBe(0);
  });

  test('Le Bus de l’amicale garde sa durée : le niveau ne renforce que sa défense', () => {
    const bus = getAbility('le-bus-de-l-amicale');
    expect(level5Bonus(bus)).toBe('strongerEffect');
    for (let level = 2; level <= MAX_LEVEL; level++) {
      expect(durationOf('le-bus-de-l-amicale', level)).toBe(durationOf('le-bus-de-l-amicale', 1));
      expect(valueOf('le-bus-de-l-amicale', level)).toBeGreaterThan(valueOf('le-bus-de-l-amicale', level - 1));
    }
  });

  test('la contrepartie de La Mêlée générale ne grandit pas avec le niveau', () => {
    const [, self] = statsAtLevel(getAbility('la-melee-generale'), 5).effects;
    expect(self).toMatchObject({ scope: 'self', duration: 15 });
  });
});
