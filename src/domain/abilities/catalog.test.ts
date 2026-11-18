import { describe, expect, test } from 'bun:test';
import { isAbilityCompatible } from '../world/playerGenerator';
import { ABILITIES, abilitiesByRarity, getAbility } from './catalog';
import { RARITY_COOLDOWN, statsAtLevel } from './progression';
import { MAX_SQUAD_SIZE } from '../club/transfers';

function slugify(name: string): string {
  return name
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

describe('catalogue des capacités (CAT-01)', () => {
  test('77 capacités : 23 communes, 22 rares, 16 légendaires, 8 mythiques, 8 étrangères', () => {
    expect(ABILITIES).toHaveLength(77);
    expect(abilitiesByRarity('foreign')).toHaveLength(8);
    expect(abilitiesByRarity('common')).toHaveLength(23);
    expect(abilitiesByRarity('rare')).toHaveLength(22);
    expect(abilitiesByRarity('legendary')).toHaveLength(16);
    expect(abilitiesByRarity('mythic')).toHaveLength(8);
  });

  test('les identifiants sont uniques et tirés du nom', () => {
    expect(new Set(ABILITIES.map((ability) => ability.id)).size).toBe(ABILITIES.length);
    for (const ability of ABILITIES) expect(ability.id).toBe(slugify(ability.name));
    expect(getAbility('le-clin-d-oeil').name).toBe('Le Clin d’œil');
  });

  test('chaque capacité a son propre coût en Gueulante, de 1 à 7, indépendant de sa rareté', () => {
    for (const ability of ABILITIES) {
      expect(ability.cost).toBeDefined();
      expect(statsAtLevel(ability, 1).cost).toBe(ability.cost!);
      expect(ability.cost!).toBeGreaterThanOrEqual(1);
      expect(ability.cost!).toBeLessThanOrEqual(7);
    }
    // Une commune peut coûter cher, une mythique peu : la rareté dit la mécanique, pas la puissance.
    expect(Math.max(...abilitiesByRarity('common').map((ability) => ability.cost!))).toBeGreaterThan(Math.min(...abilitiesByRarity('mythic').map((ability) => ability.cost!)));
  });

  test('aucune recharge : chaque capacité sert une fois par match', () => {
    expect(RARITY_COOLDOWN).toEqual({ common: 0, rare: 0, legendary: 0, mythic: 0, foreign: 0 });
  });

  test('un descriptif ne contient aucun chiffre : les valeurs dépendent du niveau', () => {
    for (const ability of ABILITIES) expect(ability.description).not.toMatch(/\d/);
  });

  test('aucun malus de stats au-delà de −90 %, à aucun niveau', () => {
    for (const ability of ABILITIES) {
      for (const level of [1, 3, 5]) {
        for (const effect of statsAtLevel(ability, level).effects) {
          if (effect.type === 'modifier' || effect.type === 'mark') expect(effect.value).toBeGreaterThanOrEqual(-0.9);
        }
      }
    }
  });

  test('les capacités de Banc sont les seules cachées (CAP-13)', () => {
    for (const ability of ABILITIES) expect(ability.hidden).toBe(ability.position === 'BENCH');
  });

  test('assez de capacités pour que tout un effectif de ce poste soit unique (CAP-02)', () => {
    for (const position of ['GK', 'DEF', 'MID', 'ATT'] as const) {
      const compatible = ABILITIES.filter((ability) => isAbilityCompatible(ability, position));
      expect(compatible.length).toBeGreaterThanOrEqual(position === 'GK' ? 3 : MAX_SQUAD_SIZE - 7);
    }
  });
});
