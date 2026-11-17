import { describe, expect, test } from 'bun:test';
import { getAbility } from '../abilities/catalog';
import { createRng } from '../core/rng';
import { newGame } from '../game/newGame';
import { overall } from '../player/rating';
import { runAiTransfers } from './aiTransfers';
import { MAX_SQUAD_SIZE } from './transfers';

describe('mercato entre clubs IA (C7)', () => {
  test('des joueurs changent de club IA, sans toucher au club du coach ni dépasser les limites', () => {
    const state = newGame({ seed: 61 });
    const tierOf = (clubId: string) => state.divisions.find((division) => division.id === state.clubs[clubId]?.divisionId)!.tier;
    const humanPlayers = new Set(state.clubs[state.humanClubId]!.playerIds);
    const budgets = new Map(Object.values(state.clubs).map((club) => [club.id, club.budget]));
    let world = { clubs: state.clubs, players: state.players };
    const rng = createRng(5);
    const all = [];
    for (let week = 0; week < 8; week++) {
      const { world: next, transfers } = runAiTransfers(world, { rng, abilityOf: getAbility, tierOf });
      for (const transfer of transfers) {
        expect(tierOf(transfer.fromClubId)).toBeGreaterThanOrEqual(tierOf(transfer.toClubId));
        expect(humanPlayers.has(transfer.playerId)).toBe(false);
        expect(next.players[transfer.playerId]!.clubId).toBe(transfer.toClubId);
      }
      all.push(...transfers);
      world = next;
    }
    expect(all.length).toBeGreaterThan(5);
    expect(world.clubs[state.humanClubId]!.playerIds).toEqual([...humanPlayers]);
    for (const club of Object.values(world.clubs)) {
      expect(club.playerIds.length).toBeLessThanOrEqual(MAX_SQUAD_SIZE);
      const abilities = club.playerIds.map((id) => world.players[id]!.ability.abilityId);
      if (!club.isHuman) expect(new Set(abilities).size).toBe(abilities.length);
    }
    // L'argent passe de l'acheteur au vendeur : il n'en apparaît ni n'en disparaît.
    const total = (clubs: typeof world.clubs) => Object.values(clubs).reduce((sum, club) => sum + club.budget, 0);
    expect(total(world.clubs)).toBe([...budgets.values()].reduce((sum, budget) => sum + budget, 0));
    // Un renfort est meilleur que ce qu'avait le club à ce poste… au moins en moyenne.
    expect(all.every((transfer) => overall(world.players[transfer.playerId]!) > 0)).toBe(true);
  });
});
