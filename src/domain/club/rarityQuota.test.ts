import { describe, expect, test } from 'bun:test';
import { ABILITIES, getAbility } from '../abilities/catalog';
import { createRng } from '../core/rng';
import { autoPickLineup, setLineup } from '../game/actions';
import { humanLineupErrors } from '../game/matches';
import { newGame } from '../game/newGame';
import { divisionOf, humanClub, humanSquad } from '../game/selectors';
import { callUpStandIns } from '../game/standIns';
import { autoLineup } from '../league/lineup';
import { countRarities, quotaErrors, quotaFilter, rarityLimits } from './rarityQuota';

const rarityOf = (id: string) => getAbility(id).rarity;
const firstOf = (rarity: string) => ABILITIES.filter((ability) => ability.rarity === rarity);

describe('quotas de rareté sur la feuille de match (CAP-24)', () => {
  test('barème souple : plus on monte, plus on peut aligner de raretés', () => {
    expect(rarityLimits(4)).toEqual({ rare: 3, legendary: 0, mythic: 0 });
    expect(rarityLimits(3)).toEqual({ rare: 5, legendary: 2, mythic: 0 });
    expect(rarityLimits(2)).toEqual({ rare: 6, legendary: 3, mythic: 1 });
    expect(rarityLimits(1)).toEqual({ rare: 9, legendary: 4, mythic: 2 });
  });

  test('une compo qui dépasse ne peut pas jouer ; l’adjoint en refait une dans les quotas', () => {
    const state = newGame({ seed: 80 });
    const squad = humanSquad(state);
    // Cinq joueurs rares dans un effectif de District : l'achat est permis, la compo non.
    squad.slice(0, 5).forEach((player, index) => (player.ability = { ...player.ability, abilityId: firstOf('rare').filter((ability) => ability.position === 'BENCH' || ability.position === 'ANY' || ability.position === player.position)[index]!.id }));
    const lineup = humanClub(state).lineup!;
    setLineup(state, { ...lineup, starters: lineup.starters, bench: [...new Set([...lineup.bench, ...squad.slice(0, 5).map((player) => player.id)])].filter((id) => !lineup.starters.includes(id)).slice(0, 7) });
    const listed = [...humanClub(state).lineup!.starters, ...humanClub(state).lineup!.bench].map((id) => state.players[id]!);
    if (countRarities(listed, rarityOf).rare > 3) expect(humanLineupErrors(state).some((error) => error.code === 'rarityQuota')).toBe(true);
    autoPickLineup(state);
    expect(humanLineupErrors(state).filter((error) => error.code === 'rarityQuota')).toEqual([]);
    const after = [...humanClub(state).lineup!.starters, ...humanClub(state).lineup!.bench].map((id) => state.players[id]!);
    expect(quotaErrors(after, divisionOf(state, state.humanClubId).tier, rarityOf)).toEqual([]);
  });

  test('la compo automatique respecte le quota', () => {
    const state = newGame({ seed: 81 });
    const fits = quotaFilter(4, rarityOf);
    const lineup = autoLineup(humanSquad(state), '4-4-2', undefined, fits);
    const listed = [...lineup.starters, ...lineup.bench].map((id) => state.players[id]!);
    expect(quotaErrors(listed, 4, rarityOf)).toEqual([]);
    expect(lineup.starters.filter(Boolean)).toHaveLength(11);
  });

  test('trop de raretés pour aligner une équipe : des dépanneurs à capacité commune signent', () => {
    const state = newGame({ seed: 82 });
    const legendaries = firstOf('legendary');
    for (const [index, player] of humanSquad(state).entries()) {
      const fitting = legendaries.filter((ability) => ability.position === 'BENCH' || ability.position === 'ANY' || ability.position === player.position);
      if (index < 12 && fitting[index % fitting.length]) player.ability = { ...player.ability, abilityId: fitting[index % fitting.length]!.id };
    }
    const before = humanSquad(state).length;
    const signed = callUpStandIns(state, state.humanClubId, createRng(1));
    expect(signed).toBeGreaterThan(0);
    const newcomers = humanSquad(state).slice(before);
    expect(newcomers.every((player) => rarityOf(player.ability.abilityId) === 'common')).toBe(true);
    autoPickLineup(state);
    expect(humanLineupErrors(state)).toEqual([]);
  });
});
