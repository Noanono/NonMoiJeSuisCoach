import { describe, expect, test } from 'bun:test';
import { isAbilityCompatible } from '../world/playerGenerator';
import { ABILITIES, abilitiesByRarity, getAbility } from './catalog';
import { RARITY_COOLDOWN, RARITY_COST, statsAtLevel } from './progression';
import { MAX_SQUAD_SIZE } from '../club/transfers';

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

describe('catalogue des capacités (CAT-01)', () => {
  test('55 capacités : 29 communes, 15 rares, 7 légendaires, 4 mythiques', () => {
    expect(ABILITIES).toHaveLength(55);
    expect(abilitiesByRarity('mythic')).toHaveLength(4);
    expect(abilitiesByRarity('common')).toHaveLength(29);
    expect(abilitiesByRarity('rare')).toHaveLength(15);
    expect(abilitiesByRarity('legendary')).toHaveLength(7);
  });

  test('les identifiants sont uniques et tirés du nom', () => {
    expect(new Set(ABILITIES.map((ability) => ability.id)).size).toBe(ABILITIES.length);
    for (const ability of ABILITIES) expect(ability.id).toBe(slugify(ability.name));
    expect(getAbility('l-agriculteur').name).toBe('L’Agriculteur');
  });

  test('une commune n’a qu’un seul effet (deux sur penalty, plafonné par nature), une rare au plus deux', () => {
    for (const ability of abilitiesByRarity('common')) expect(ability.effects).toHaveLength(ability.trigger === 'ownPenalty' ? 2 : 1);
    for (const ability of abilitiesByRarity('rare')) expect(ability.effects.length).toBeLessThanOrEqual(2);
  });

  test('le coût suit la rareté ; aucune recharge, chaque capacité sert une fois par match', () => {
    expect(RARITY_COST).toEqual({ common: 2, rare: 3, legendary: 5, mythic: 7 });
    expect(RARITY_COOLDOWN).toEqual({ common: 0, rare: 0, legendary: 0, mythic: 0 });
    for (const ability of ABILITIES) expect(statsAtLevel(ability, 1).cost).toBe(RARITY_COST[ability.rarity]);
  });

  test('un descriptif ne contient aucun chiffre : les valeurs dépendent du niveau', () => {
    for (const ability of ABILITIES) expect(ability.description).not.toMatch(/\d/);
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
