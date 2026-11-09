import { describe, expect, test } from 'bun:test';
import type { Ability } from '../types';
import { contextMultiplier, levelForXp, statsAtLevel } from './progression';

const ability: Ability = {
  id: 'pilier-de-buvette',
  name: 'Pilier de buvette',
  rarity: 'rare',
  category: 'attack',
  position: 'ANY',
  targeting: { kind: 'self' },
  trigger: 'anytime',
  description: '+40 % à toutes ses stats pendant 15 min',
  downside: 'Puis −30 % jusqu’à la fin du match',
  level5Text: 'Chute limitée à −15 %',
  base: {
    successChance: 1,
    effects: [{ type: 'modifier', scope: 'self', stat: 'all', value: 0.4, duration: 15 }],
    risks: [{ chance: 0.2, label: 'Coup de barre', effects: [] }],
    cooldown: { kind: 'minutes', value: 20 },
    cost: 2,
  },
  level5: { cost: 1 },
  tags: ['alcohol'],
  hidden: false,
};

describe('progression des capacités', () => {
  test('les seuils d’XP font monter jusqu’au niveau 5 (CAP-10)', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(80)).toBe(3);
    expect(levelForXp(10_000)).toBe(5);
  });

  test('chaque niveau renforce l’effet, raccourcit la recharge et baisse le risque (CAP-11)', () => {
    const l1 = statsAtLevel(ability, 1);
    const l3 = statsAtLevel(ability, 3);
    const effect = (stats: typeof l1) => (stats.effects[0] as { value: number }).value;
    expect(effect(l3)).toBeGreaterThan(effect(l1));
    expect(l3.risks[0]!.chance).toBeLessThan(l1.risks[0]!.chance);
    expect(l3.cooldown).toEqual({ kind: 'minutes', value: 18 });
  });

  test('le niveau 5 applique la surcharge propre à la capacité (CAP-11)', () => {
    expect(statsAtLevel(ability, 5).cost).toBe(1);
  });

  test('une grosse soirée donne +50 % aux capacités alcoolisées, le règlement les bride (CAP-14, FRAS-01)', () => {
    expect(contextMultiplier(ability, { teamNight: 'bigNight', houseRules: [] }).bonus).toBe(1.5);
    const bridled = contextMultiplier(ability, { teamNight: 'none', houseRules: ['noAlcoholEve'] });
    expect(bridled.bonus).toBeLessThan(1);
    expect(bridled.risk).toBeLessThan(1);
  });
});
