import { describe, expect, test } from 'bun:test';
import { ABILITIES, getAbility } from '../abilities/catalog';
import { createRng } from '../core/rng';
import { chooseRerolledAbility, rerollAbility } from '../game/actions';
import { newGame } from '../game/newGame';
import { humanClub, humanDivision, humanSquad } from '../game/selectors';
import { makePlayer } from '../testing/fixtures';
import { isAbilityCompatible } from '../world/playerGenerator';
import { drawRerollOptions, REROLL_MIN_PRICE, REROLL_OPTIONS, REROLL_PRICE_RATIO, rerollPrice } from './abilityReroll';
import { moneyFactorBetween } from './finance';
import { playerValue } from './valuation';

describe('reroll de capacité (CAP-23)', () => {
  test('le prix suit la valeur du joueur et la rareté, avec un plancher par division', () => {
    const star = makePlayer({ attributes: { speed: 85, technique: 85, physical: 85, shooting: 95, defense: 40, goalkeeping: 10 } });
    for (const rarity of ['common', 'rare', 'legendary', 'mythic'] as const) {
      expect(rerollPrice(star, rarity, 1)).toBe(Math.round((playerValue(star, rarity) * REROLL_PRICE_RATIO[rarity]) / 100) * 100);
    }
    const nobody = makePlayer({ attributes: { speed: 20, technique: 20, physical: 20, shooting: 20, defense: 20, goalkeeping: 5 } });
    expect(rerollPrice(nobody, 'common', 4)).toBe(REROLL_MIN_PRICE);
    expect(rerollPrice(nobody, 'common', 3)).toBe(REROLL_MIN_PRICE * moneyFactorBetween(4, 3));
  });

  test('3 capacités différentes, compatibles, hors effectif, de la même rareté ou d’un rang au-dessus', () => {
    const player = makePlayer({ position: 'DEF' });
    const excluded = new Set(['la-mobylette']);
    let upgrades = 0;
    let total = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      const options = drawRerollOptions(createRng(seed), player, 'common', ABILITIES, excluded);
      expect(options.length).toBe(REROLL_OPTIONS);
      expect(new Set(options.map((ability) => ability.id)).size).toBe(REROLL_OPTIONS);
      for (const ability of options) {
        expect(isAbilityCompatible(ability, 'DEF')).toBe(true);
        expect(excluded.has(ability.id)).toBe(false);
        expect(['common', 'rare']).toContain(ability.rarity);
        if (ability.rarity === 'rare') upgrades++;
        total++;
      }
    }
    // 6 % par proposition.
    expect(upgrades / total).toBeGreaterThan(0.045);
    expect(upgrades / total).toBeLessThan(0.075);
  });

  test('on paie avant de voir, la nouvelle capacité repart au niveau 1', () => {
    const state = newGame({ seed: 3, clubName: 'Test' });
    const player = humanSquad(state)[5]!;
    player.ability = { ...player.ability, level: 3, xp: 1000, revealed: true };
    const club = humanClub(state);
    club.budget = 1_000_000;
    const price = rerollPrice(player, getAbility(player.ability.abilityId).rarity, humanDivision(state).tier);
    expect(rerollAbility(state, player.id).ok).toBe(true);
    expect(club.budget).toBe(1_000_000 - price);
    const offer = state.abilityReroll!;
    expect(offer.abilityIds.length).toBe(3);
    // Pas de second tirage tant que le choix n'est pas fait.
    expect(rerollAbility(state, player.id).ok).toBe(false);
    expect(chooseRerolledAbility(state, 'pas-une-option').ok).toBe(false);
    expect(chooseRerolledAbility(state, offer.abilityIds[1]!).ok).toBe(true);
    expect(state.players[player.id]!.ability).toEqual({ abilityId: offer.abilityIds[1]!, level: 1, xp: 0, revealed: true });
    expect(state.abilityReroll).toBeNull();
  });

  test('garder l’ancienne capacité : rien ne change, l’argent est perdu', () => {
    const state = newGame({ seed: 4, clubName: 'Test' });
    const player = humanSquad(state)[2]!;
    player.ability.revealed = true;
    const before = { ...player.ability };
    humanClub(state).budget = 1_000_000;
    rerollAbility(state, player.id);
    expect(chooseRerolledAbility(state, null).ok).toBe(true);
    expect(state.players[player.id]!.ability).toEqual(before);
    expect(humanClub(state).budget).toBeLessThan(1_000_000);
  });

  test('refusé sans assez d’argent ou avec une capacité encore cachée', () => {
    const state = newGame({ seed: 5, clubName: 'Test' });
    const player = humanSquad(state)[0]!;
    player.ability.revealed = false;
    expect(rerollAbility(state, player.id).ok).toBe(false);
    player.ability.revealed = true;
    humanClub(state).budget = 0;
    expect(rerollAbility(state, player.id).ok).toBe(false);
    expect(state.abilityReroll ?? null).toBeNull();
  });
});

test('un mythique a toujours 3 propositions : on complète avec les rangs en dessous', () => {
  const player = makePlayer({ position: 'DEF', ability: { abilityId: 'le-miracle-du-kine', level: 1, xp: 0, revealed: true } });
  const options = drawRerollOptions(createRng(9), player, 'mythic', ABILITIES, new Set(['le-miracle-du-kine']));
  expect(options.length).toBe(REROLL_OPTIONS);
  expect(options.some((ability) => ability.rarity === 'mythic')).toBe(true);
});
