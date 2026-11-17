import { describe, expect, test } from 'bun:test';
import { getAbility } from '../abilities/catalog';
import { createRng } from '../core/rng';
import { isTransferWindowOpen } from '../league/calendar';
import { summarize } from '../match';
import { overall } from '../player/rating';
import { foreignClubId, NATIONS } from '../world/nations';
import { applyFriendlySummary, declineFriendly, foreignTeamSheet, pendingFriendly, startFriendlyMatch } from './friendly';
import { humanLineupErrors } from './matches';
import { newGame } from './newGame';
import { humanClub, humanFixtureAt, humanSquad } from './selectors';
import { autoPickLineup } from './actions';
import { advanceWeek, withRng } from './week';

function atFriendlyWeek(seed: number) {
  const state = newGame({ seed });
  const friendly = state.friendly!;
  while (state.week < friendly.week) advanceWeek(state);
  if (humanLineupErrors(state).length > 0) autoPickLineup(state);
  return state;
}

describe('équipes étrangères (UNIV-10)', () => {
  test('un amical par saison, la première semaine de mercato sans match du coach', () => {
    const state = newGame({ seed: 110 });
    const friendly = state.friendly!;
    expect(friendly.status).toBe('pending');
    expect(isTransferWindowOpen(friendly.week)).toBe(true);
    expect(humanFixtureAt(state, friendly.week)).toBeNull();
    expect(Object.keys(NATIONS)).toContain(friendly.nationId);
  });

  test('l’équipe étrangère : noms et trombines du pays, rien que ses deux capacités, et 5 à 8 points de plus que le onze du coach', () => {
    const state = newGame({ seed: 111 });
    const coachLevel = humanSquad(state).map(overall).sort((a, b) => b - a).slice(0, 11).reduce((sum, value) => sum + value, 0) / 11;
    for (const nation of Object.values(NATIONS)) {
      const sheet = foreignTeamSheet(state, nation.id, createRng(3));
      expect(sheet.clubId).toBe(foreignClubId(nation.id));
      const players = [...sheet.starters, ...sheet.bench];
      expect(players.every((player) => player.nationality === nation.id)).toBe(true);
      expect(players.every((player) => (nation.lastNames.length > 0 ? nation.lastNames.includes(player.lastName) : nation.firstNames.includes(player.lastName)))).toBe(true);
      const abilities = players.map((player) => player.ability.abilityId);
      for (const id of nation.abilityIds) expect(abilities).toContain(id);
      // Seulement les capacités de leur pays, remplaçants compris.
      expect(abilities.every((id) => nation.abilityIds.includes(id))).toBe(true);
      const average = sheet.starters.reduce((sum, player) => sum + overall(player), 0) / sheet.starters.length;
      expect(average).toBeGreaterThan(coachLevel + 2);
      expect(average).toBeLessThan(coachLevel + 12);
    }
  });

  test('une victoire rapporte un jeune du pays, avec une capacité étrangère', () => {
    const state = atFriendlyWeek(112);
    const friendly = pendingFriendly(state)!;
    const match = withRng(state, (rng) => startFriendlyMatch(state, rng));
    const summary = { ...summarize(match), homeGoals: 3, awayGoals: 1 };
    const before = humanSquad(state).length;
    withRng(state, (rng) => applyFriendlySummary(state, summary, rng));
    expect(friendly.status).toBe('won');
    const gift = state.players[friendly.giftId!]!;
    expect(humanSquad(state)).toHaveLength(before + 1);
    expect(gift.nationality).toBe(friendly.nationId);
    expect(getAbility(gift.ability.abilityId).rarity).toBe('foreign');
    expect(NATIONS[friendly.nationId].abilityIds).toContain(gift.ability.abilityId);
    expect(gift.age).toBeLessThanOrEqual(19);
    expect(gift.potential).toBeGreaterThan(overall(gift));
    expect(humanClub(state).playerIds).toContain(gift.id);
  });

  test('un amical non joué est annulé à la fin de sa semaine ; décliner l’annule tout de suite', () => {
    const state = atFriendlyWeek(113);
    const friendly = pendingFriendly(state)!;
    declineFriendly(state);
    expect(friendly.status).toBe('declined');
    expect(pendingFriendly(state)).toBeNull();
  });
});
