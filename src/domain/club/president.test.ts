import { describe, expect, test } from 'bun:test';
import type { Club, Division } from '../types';
import { createRng } from '../core/rng';
import {
  confidenceAfterMatch,
  isFired,
  matchExpectation,
  reviewSeason,
  seasonObjective,
  sponsorMoodAfterMatch,
  streakEffect,
} from './president';

const division: Division = {
  id: 'd5',
  name: 'District',
  tier: 5,
  clubIds: Array.from({ length: 10 }, (_, index) => `c${index}`),
  promoted: 2,
  relegated: 2,
};

/** Le club `c0` est le plus coté, `c9` le moins coté. */
const clubs: Record<string, Club> = Object.fromEntries(
  division.clubIds.map((id, index) => [id, { id, name: `Club ${id}`, reputation: 100 - index * 10 } as Club]),
);

describe('objectifs du président (CLUB-04)', () => {
  test('les gros visent le titre, les petits le maintien', () => {
    const top = seasonObjective({ club: clubs.c0!, division, clubs, rng: createRng(1) });
    const bottom = seasonObjective({ club: clubs.c9!, division, clubs, rng: createRng(1) });
    expect(top.league).toBe('title');
    expect(top.targetPosition).toBe(1);
    expect(bottom.league).toBe('survival');
    expect(bottom.targetPosition).toBe(8);
    expect(top.cupRoundsToWin).toBeGreaterThan(bottom.cupRoundsToWin);
    expect(top.speech).not.toContain('{');
  });

  test('pas de montée possible en élite', () => {
    const elite = { ...division, tier: 1, promoted: 0 };
    expect(seasonObjective({ club: clubs.c2!, division: elite, clubs, rng: createRng(1) }).league).toBe('midTable');
    expect(seasonObjective({ club: clubs.c2!, division, clubs, rng: createRng(1) }).league).toBe('promotion');
  });

  test('bilan de fin de saison comparé à l’objectif', () => {
    const objective = seasonObjective({ club: clubs.c9!, division, clubs, rng: createRng(1) });
    expect(reviewSeason(objective, { finalPosition: 7, cupRoundsWon: 1 }).confidenceDelta).toBeGreaterThan(0);
    const failure = reviewSeason(objective, { finalPosition: 10, cupRoundsWon: 0 });
    expect(failure.leagueMet).toBe(false);
    expect(failure.confidenceDelta).toBeLessThan(0);
  });
});

describe('confiance du président (CLUB-05)', () => {
  test('une défaite du favori coûte plus cher qu’une défaite de l’outsider', () => {
    const favourite = confidenceAfterMatch(50, { outcome: 'loss', expectation: 'favourite', goalDifference: -1 });
    const underdog = confidenceAfterMatch(50, { outcome: 'loss', expectation: 'underdog', goalDifference: -1 });
    expect(favourite.confidence).toBeLessThan(underdog.confidence);
    expect(matchExpectation(80, 40, false)).toBe('favourite');
    expect(matchExpectation(40, 80, true)).toBe('underdog');
  });

  test('le coach est licencié quand la confiance tombe à zéro', () => {
    const afterThrashing = confidenceAfterMatch(5, { outcome: 'loss', expectation: 'favourite', goalDifference: -6 });
    expect(afterThrashing.confidence).toBe(0);
    expect(isFired(afterThrashing.confidence)).toBe(true);
    expect(isFired(1)).toBe(false);
  });

  test('les sponsors suivent les résultats', () => {
    expect(sponsorMoodAfterMatch(50, 'win')).toBeGreaterThan(50);
    expect(sponsorMoodAfterMatch(50, 'loss')).toBeLessThan(50);
    expect(sponsorMoodAfterMatch(50, 'draw')).toBe(50);
  });
});

describe('séries de résultats (CLUB-05)', () => {
  test('à partir de 3 victoires ou défaites de suite, chaque match pèse plus lourd', () => {
    expect(streakEffect({ wins: 2, losses: 0 })).toEqual({ confidence: 0, sponsorMood: 0 });
    expect(streakEffect({ wins: 3, losses: 0 })).toEqual({ confidence: 2, sponsorMood: 2 });
    expect(streakEffect({ wins: 0, losses: 4 })).toEqual({ confidence: -2, sponsorMood: -2 });
  });

  test('les sponsors suivent les résultats', () => {
    expect(sponsorMoodAfterMatch(50, 'win')).toBe(54);
    expect(sponsorMoodAfterMatch(50, 'draw')).toBe(50);
    expect(sponsorMoodAfterMatch(50, 'loss')).toBe(46);
  });
});
