import { describe, expect, test } from 'bun:test';
import type { AbilityStats, Effect } from '../types';
import { ABILITIES, COMBOS, abilitiesByRarity, findCombo, getAbility } from './catalog';

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function effectChances(effects: readonly Effect[]): number[] {
  return effects.flatMap((effect) => ('chance' in effect && effect.chance !== undefined ? [effect.chance] : []));
}

function probabilities(stats: Partial<AbilityStats>): number[] {
  return [
    ...(stats.successChance === undefined ? [] : [stats.successChance]),
    ...effectChances(stats.effects ?? []),
    ...(stats.risks ?? []).flatMap((risk) => [risk.chance, ...effectChances(risk.effects)]),
  ];
}

describe('catalogue des capacités (CAT-01)', () => {
  test('72 capacités : 45 communes, 22 rares, 5 légendaires', () => {
    expect(ABILITIES).toHaveLength(72);
    expect(abilitiesByRarity('common')).toHaveLength(45);
    expect(abilitiesByRarity('rare')).toHaveLength(22);
    expect(abilitiesByRarity('legendary')).toHaveLength(5);
  });

  test('les identifiants sont uniques et tirés du nom', () => {
    expect(new Set(ABILITIES.map((ability) => ability.id)).size).toBe(ABILITIES.length);
    for (const ability of ABILITIES) expect(ability.id).toBe(slugify(ability.name));
    expect(getAbility('l-ex-de-la-femme-du-president').name).toBe('L’Ex de la femme du président');
  });

  test('chaque capacité a au moins un effet et des probabilités dans [0, 1] (CAP-07)', () => {
    for (const ability of ABILITIES) {
      expect(ability.base.effects.length).toBeGreaterThan(0);
      for (const p of [...probabilities(ability.base), ...probabilities(ability.level5)]) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });

  test('les légendaires servent une fois par saison et coûtent 3 (CAP-12)', () => {
    for (const ability of abilitiesByRarity('legendary')) {
      expect(ability.category).toBe('legendary');
      expect(ability.base.cooldown).toEqual({ kind: 'perSeason', uses: 1 });
      expect(ability.base.cost).toBe(3);
    }
  });
});

describe('combos (CAP-15)', () => {
  test('7 combos dont les deux capacités existent', () => {
    expect(COMBOS).toHaveLength(7);
    for (const combo of COMBOS) {
      for (const id of combo.abilityIds) expect(() => getAbility(id)).not.toThrow();
    }
  });

  test('findCombo marche dans les deux sens', () => {
    expect(findCombo('le-vomisseur', 'le-peteur')?.id).toBe('zone-chimique');
    expect(findCombo('le-peteur', 'le-vomisseur')?.id).toBe('zone-chimique');
    expect(findCombo('le-peteur', 'le-plongeur')).toBeUndefined();
  });
});

describe('ciblage du niveau 5 (CAP-11)', () => {
  test('les capacités qui gagnent des cibles au niveau 5 en ont réellement plus', () => {
    const widened = ABILITIES.filter((ability) => ability.level5Targeting);
    expect(widened.length).toBeGreaterThanOrEqual(8);
    for (const ability of widened) {
      expect(ability.level5Targeting!.count!).toBeGreaterThan(ability.targeting.count ?? 1);
    }
  });
});
