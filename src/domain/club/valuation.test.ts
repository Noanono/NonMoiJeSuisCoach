import { describe, expect, test } from 'bun:test';
import { makePlayer } from '../testing/fixtures';
import { overall } from '../player/rating';
import { playerValue, potentialFactor } from './valuation';

describe('valeur et potentiel (CLUB-08)', () => {
  test('à note égale, un jeune à fort potentiel vaut nettement plus', () => {
    const prospect = makePlayer({ age: 19 });
    const rating = overall(prospect);
    const capped = { ...prospect, potential: rating };
    const promising = { ...prospect, potential: rating + 15 };
    expect(playerValue(promising, 'common')).toBeGreaterThan(1.8 * playerValue(capped, 'common'));
  });

  test('le potentiel pèse de moins en moins avec l’âge, plus du tout après 27 ans', () => {
    const at = (age: number) => {
      const player = makePlayer({ age });
      return potentialFactor({ ...player, potential: overall(player) + 10 });
    };
    expect(at(20)).toBeGreaterThan(at(23));
    expect(at(23)).toBeGreaterThan(at(26));
    expect(at(26)).toBeGreaterThan(1);
    expect(at(29)).toBe(1);
  });

  test('le bonus de potentiel est plafonné', () => {
    const player = makePlayer({ age: 18 });
    expect(potentialFactor({ ...player, potential: 99 }, 30)).toBe(2.5);
  });
});
