import { describe, expect, test } from 'bun:test';
import { makePlayer } from '../testing/fixtures';
import { applyBalance, balanceTotal, wageBill, weeklyBalance, type WeeklyFinanceInput } from './finance';
import { askingSalary, playerValue } from './valuation';
import type { Club } from '../types';

const baseWeek: WeeklyFinanceInput = {
  divisionTier: 5,
  sponsorMood: 50,
  matchOutcome: 'win',
  homeMatch: true,
  wageBill: 1_000,
};

const club: Club = {
  id: 'c1',
  name: 'AS Saint-Pastis',
  shortName: 'ASSP',
  divisionId: 'd5',
  reputation: 20,
  budget: 10_000,
  playerIds: [],
  lineup: null,
  isHuman: true,
  stadium: 'Stade de la Buvette',
};

const amountOf = (label: string, input: WeeklyFinanceInput) =>
  weeklyBalance(input).find((line) => line.label === label)?.amount ?? 0;

describe('bilan hebdomadaire (CLUB-01)', () => {
  test('recettes et salaires apparaissent comme lignes signées', () => {
    expect(amountOf('Sponsors', baseWeek)).toBeGreaterThan(0);
    expect(amountOf('Salaires', baseWeek)).toBe(-1_000);
  });

  test('pas de buvette à l’extérieur', () => {
    expect(amountOf('Buvette', { ...baseWeek, homeMatch: false })).toBe(0);
    expect(amountOf('Buvette', baseWeek)).toBeGreaterThan(0);
  });

  test('les sponsors paient plus en division supérieure et quand ils sont contents', () => {
    expect(amountOf('Sponsors', { ...baseWeek, divisionTier: 1 })).toBeGreaterThan(amountOf('Sponsors', baseWeek));
    expect(amountOf('Sponsors', { ...baseWeek, sponsorMood: 90 })).toBeGreaterThan(amountOf('Sponsors', baseWeek));
  });

  test('le bilan est appliqué au budget', () => {
    const lines = weeklyBalance(baseWeek);
    expect(applyBalance(club, lines).budget).toBe(club.budget + balanceTotal(lines));
  });

  test('la masse salariale additionne les salaires', () => {
    expect(wageBill([makePlayer({ salary: 100 }), makePlayer({ id: 'p2', salary: 250 })])).toBe(350);
  });
});

describe('valeur marchande (CLUB-08)', () => {
  test('à note égale, un légendaire vaut nettement plus qu’un commun', () => {
    const player = makePlayer();
    expect(playerValue(player, 'legendary')).toBeGreaterThanOrEqual(playerValue(player, 'common') * 2.5);
    expect(playerValue(player, 'rare')).toBeGreaterThan(playerValue(player, 'common'));
  });

  test('la note, la jeunesse et le potentiel augmentent la valeur', () => {
    const player = makePlayer();
    const better = makePlayer({ attributes: { ...player.attributes, shooting: 95 } });
    expect(playerValue(better, 'common')).toBeGreaterThan(playerValue(player, 'common'));
    expect(playerValue(makePlayer({ age: 35 }), 'common')).toBeLessThan(playerValue(player, 'common'));
    expect(playerValue(makePlayer({ age: 19, potential: 85 }), 'common')).toBeGreaterThan(
      playerValue(makePlayer({ age: 19, potential: 50 }), 'common'),
    );
  });

  test('le salaire demandé suit la valeur', () => {
    const star = makePlayer({ attributes: { ...makePlayer().attributes, shooting: 99, speed: 90 } });
    expect(askingSalary(star, 'legendary')).toBeGreaterThan(askingSalary(makePlayer(), 'common'));
  });
});
