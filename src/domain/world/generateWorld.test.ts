import { describe, expect, test } from 'bun:test';
import { validateLineup } from '../league/lineup';
import { TEST_ABILITY_POOL } from './fixtures';
import { abbreviate, generateWorld } from './generateWorld';

const world = generateWorld({ seed: 2026, abilityPool: TEST_ABILITY_POOL });
const clubs = Object.values(world.clubs);

describe('génération du monde', () => {
  test('4 divisions de 10 clubs, de l’élite au district (UNIV-03)', () => {
    expect(world.divisions.map((division) => division.tier)).toEqual([1, 2, 3, 4]);
    for (const division of world.divisions) {
      expect(division.clubIds).toHaveLength(10);
      for (const id of division.clubIds) expect(world.clubs[id]!.divisionId).toBe(division.id);
    }
    expect(world.divisions[0]!.promoted).toBe(0);
    expect(world.divisions[3]!.relegated).toBe(0);
  });

  test('40 clubs aux noms et abréviations uniques (UNIV-01)', () => {
    expect(clubs).toHaveLength(40);
    expect(new Set(clubs.map((club) => club.name)).size).toBe(40);
    expect(new Set(clubs.map((club) => club.shortName)).size).toBe(40);
  });

  test('la réputation baisse avec la division', () => {
    const averages = world.divisions.map(
      (division) => division.clubIds.reduce((sum, id) => sum + world.clubs[id]!.reputation, 0) / division.clubIds.length,
    );
    for (let i = 1; i < averages.length; i++) expect(averages[i]!).toBeLessThan(averages[i - 1]!);
    const budgets = world.divisions.map((division) => world.clubs[division.clubIds[0]!]!.budget);
    expect(budgets[0]!).toBeGreaterThan(budgets[3]!);
  });

  test('le club du coach démarre en district, dans la boue (UNIV-02)', () => {
    const humans = clubs.filter((club) => club.isHuman);
    expect(humans).toHaveLength(1);
    expect(humans[0]!.divisionId).toBe(world.divisions[3]!.id);
    expect(humans[0]!.stadium).toContain('boueux');
    expect(humans[0]!.stadium).toContain('vestiaires qui fuient');
  });

  test('chaque club a 18 joueurs aux capacités uniques et une composition valide (CAP-02, EFF-03)', () => {
    expect(Object.keys(world.players)).toHaveLength(40 * 18);
    for (const club of clubs) {
      const squad = club.playerIds.map((id) => world.players[id]!);
      expect(squad).toHaveLength(18);
      expect(squad.every((player) => player.clubId === club.id)).toBe(true);
      expect(new Set(squad.map((player) => player.ability.abilityId)).size).toBe(18);
      expect(validateLineup(club.lineup!, squad)).toEqual([]);
    }
  });

  test('même graine, même monde', () => {
    expect(generateWorld({ seed: 2026, abilityPool: TEST_ABILITY_POOL })).toEqual(world);
  });

  test('nom de club choisi par le joueur', () => {
    const custom = generateWorld({ seed: 1, abilityPool: TEST_ABILITY_POOL, humanClubName: 'Les Gros Mollets' });
    const human = Object.values(custom.clubs).find((club) => club.isHuman)!;
    expect(human.name).toBe('Les Gros Mollets');
    expect(human.shortName).toBe('LGM');
    expect(human.divisionId).toBe(custom.divisions[3]!.id);
  });

  test('abréviations de 3 ou 4 lettres', () => {
    expect(abbreviate('Étoile Sportive de la Buvette Fermée')).toBe('ESDL');
    expect(abbreviate('Zob')).toBe('ZOB');
    expect(abbreviate('Ok')).toBe('OKX');
  });
});
