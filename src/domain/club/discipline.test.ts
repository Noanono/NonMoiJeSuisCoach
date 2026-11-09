import { describe, expect, test } from 'bun:test';
import { createRng } from '../core/rng';
import { makePlayer } from '../testing/fixtures';
import { applyBalance, weeklyBalance } from './finance';
import { fineAmount, finePlayer, houseRuleMoralePenalty, isConcernedByRule } from './discipline';
import { applyPressArticle, humiliationEvent, writeArticle } from './press';
import type { Club } from '../types';

describe('règlement intérieur (FRAS-01)', () => {
  test('une règle ne concerne que les capacités portant ses tags', () => {
    expect(isConcernedByRule('noAlcoholEve', ['alcohol'])).toBe(true);
    expect(isConcernedByRule('noAlcoholEve', ['family'])).toBe(false);
    expect(houseRuleMoralePenalty(['alcohol'], ['curfew', 'noAlcoholEve'])).toBe(6);
    expect(houseRuleMoralePenalty([], ['curfew', 'noAlcoholEve'])).toBe(0);
  });
});

describe('amendes (FRAS-02)', () => {
  const club = { id: 'c1', budget: 1_000 } as Club;

  test('une amende crédite le budget et baisse le moral du joueur', () => {
    const player = makePlayer({ salary: 200, morale: 60 });
    const amount = fineAmount(player, 'heavy');
    const fine = finePlayer(player, amount, createRng(1));
    expect(fine.player.morale).toBeLessThan(60);
    expect(fine.events[0]?.kind).toBe('fine');

    const lines = weeklyBalance({
      divisionTier: 5,
      sponsorMood: 50,
      matchOutcome: null,
      homeMatch: false,
      teamNight: 'none',
      wageBill: 0,
      finesCollected: fine.income,
      finesPaid: 0,
    });
    const sponsors = lines.find((line) => line.label === 'Sponsors')?.amount ?? 0;
    expect(applyBalance(club, lines).budget).toBe(club.budget + sponsors + amount);
  });

  test('une amende salée finit par provoquer une rébellion', () => {
    const player = makePlayer({ salary: 100, morale: 10 });
    const rng = createRng(3);
    const outcomes = Array.from({ length: 20 }, () => finePlayer(player, 400, rng));
    const rebellion = outcomes.find((fine) => fine.rebelled);
    expect(rebellion).toBeDefined();
    expect(rebellion?.events.some((event) => event.kind === 'fineRebellion')).toBe(true);
  });
});

describe('presse locale (FRAS-03, FRAS-04)', () => {
  const context = (seed: number) => ({ week: 4, season: 1, clubName: 'AS Saint-Pastis', rng: createRng(seed) });

  test('une frasque produit une une avec le nom du joueur et un effet sur le président', () => {
    const article = writeArticle({ kind: 'maritalDrama', playerName: 'Jean-Mi Pastaga' }, context(2));
    expect(article.headline.length).toBeGreaterThan(10);
    expect(article.headline).not.toContain('{');
    expect(article.presidentDelta).toBeLessThan(0);
    const outlook = applyPressArticle({ budget: 0, presidentConfidence: 50, sponsorMood: 50 }, article);
    expect(outlook.presidentConfidence).toBe(40);
  });

  test('les titres varient et certains sponsors adorent le scandale', () => {
    const articles = Array.from({ length: 30 }, (_, seed) => writeArticle({ kind: 'streaker' }, context(seed)));
    expect(new Set(articles.map((article) => article.headline)).size).toBeGreaterThan(1);
    expect(articles.some((article) => article.sponsorDelta > 0)).toBe(true);
    expect(articles.some((article) => article.sponsorDelta < 0)).toBe(true);
  });

  test('seule une lourde défaite fait la une', () => {
    expect(humiliationEvent(1, 3)).toBeNull();
    expect(humiliationEvent(0, 6)).toEqual({ kind: 'humiliatingDefeat', score: '0-6' });
  });
});
