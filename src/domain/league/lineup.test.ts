import { describe, expect, test } from 'bun:test';
import type { Lineup, Player } from '../types';
import { createRng } from '../core/rng';
import { FORMATION_SLOTS, FORMATIONS } from '../player/rating';
import { generateSquad } from '../world/playerGenerator';
import { TEST_ABILITY_POOL } from '../world/fixtures';
import { autoLineup, validateLineup } from './lineup';

const squad = generateSquad({ rng: createRng(42), reputation: 50, clubId: 'c1', abilityPool: TEST_ABILITY_POOL });
const byId = new Map(squad.map((player) => [player.id, player]));

describe('composition automatique (EFF-03)', () => {
  test('11 titulaires valides avec un gardien dans les cages, pour chaque formation', () => {
    for (const formation of FORMATIONS) {
      const lineup = autoLineup(squad, formation);
      expect(lineup.starters).toHaveLength(11);
      expect(byId.get(lineup.starters[0]!)!.position).toBe('GK');
      expect(validateLineup(lineup, squad)).toEqual([]);
    }
  });

  test('chaque titulaire joue à son poste quand l’effectif le permet', () => {
    const lineup = autoLineup(squad, '4-4-2');
    lineup.starters.forEach((id, index) => expect(byId.get(id)!.position).toBe(FORMATION_SLOTS['4-4-2'][index]!));
  });

  test('banc de 7 joueurs maximum, sans titulaire', () => {
    const lineup = autoLineup(squad, '4-3-3');
    expect(lineup.bench.length).toBeLessThanOrEqual(7);
    for (const id of lineup.bench) expect(lineup.starters).not.toContain(id);
  });

  test('les blessés et suspendus ne sont pas alignés', () => {
    const keepers = squad.filter((player) => player.position === 'GK');
    const injured: Player = { ...keepers[0]!, injuryWeeks: 2 };
    const withInjury = squad.map((player) => (player.id === injured.id ? injured : player));
    const lineup = autoLineup(withInjury, '4-4-2');
    expect([...lineup.starters, ...lineup.bench]).not.toContain(injured.id);
    expect(lineup.starters[0]).toBe(keepers[1]!.id);
  });
});

describe('validation de la composition', () => {
  const valid = autoLineup(squad, '4-4-2');
  const codes = (lineup: Lineup, players: readonly Player[] = squad) =>
    validateLineup(lineup, players).map((error) => error.code);

  test('trop de titulaires', () => {
    const errors = validateLineup({ ...valid, starters: [...valid.starters, valid.bench[0]!], bench: valid.bench.slice(1) }, squad);
    expect(errors.map((error) => error.code)).toEqual(['tooManyStarters']);
    expect(errors[0]!.message).toBe('Tu as mis 12 joueurs. Même nous on a vu.');
  });

  test('pas assez de titulaires', () => {
    expect(codes({ ...valid, starters: valid.starters.slice(0, 10) })).toContain('notEnoughStarters');
  });

  test('joueur aligné deux fois', () => {
    expect(codes({ ...valid, bench: [valid.starters[3]!] })).toContain('duplicatePlayer');
  });

  test('joueur indisponible ou inconnu', () => {
    const suspended = squad.map((player) => (player.id === valid.starters[5] ? { ...player, suspendedMatches: 1 } : player));
    expect(codes(valid, suspended)).toContain('unavailablePlayer');
    expect(codes({ ...valid, bench: ['inconnu'] })).toContain('unknownPlayer');
  });

  test('pas de gardien dans les cages', () => {
    const swapped = [valid.starters[1]!, valid.starters[0]!, ...valid.starters.slice(2)];
    expect(codes({ ...valid, starters: swapped })).toEqual(['noGoalkeeper']);
  });

  test('banc trop chargé', () => {
    const bigSquad = [...squad, { ...squad[0]!, id: 'renfort' }];
    const others = bigSquad.map((player) => player.id).filter((id) => !valid.starters.includes(id));
    expect(others).toHaveLength(8);
    expect(codes({ ...valid, bench: others }, bigSquad)).toEqual(['benchTooLarge']);
  });
});
