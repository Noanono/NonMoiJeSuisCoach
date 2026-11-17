import type { Division, Fixture } from '../types';
import type { Rng } from '../core/rng';
import { shuffled } from '../world/random';
import { leagueRoundWeek } from './calendar';

export interface Pairing {
  homeId: string;
  awayId: string;
}

/**
 * Aller-retour complet par la méthode du cercle (tables de Berger), UNIV-05.
 * Chaque club joue une fois par journée (sauf exempt si le nombre de clubs est impair),
 * et ne joue jamais plus de deux fois de suite à domicile ou à l'extérieur.
 */
export function doubleRoundRobin(clubIds: readonly string[]): Pairing[][] {
  const firstLeg = singleRoundRobin(clubIds);
  // Le retour commence par l'inverse de la 2e journée : sans ça, certains clubs enchaîneraient
  // trois matchs au même endroit à la charnière aller-retour.
  const returnLeg = [...firstLeg.slice(1), ...firstLeg.slice(0, 1)].map((round) =>
    round.map(({ homeId, awayId }) => ({ homeId: awayId, awayId: homeId })),
  );
  return [...firstLeg, ...returnLeg];
}

function singleRoundRobin(clubIds: readonly string[]): Pairing[][] {
  const slots: (string | null)[] = clubIds.length % 2 === 0 ? [...clubIds] : [...clubIds, null];
  const size = slots.length;
  const rotating = size - 1;
  const fixed = slots[rotating] ?? null;
  const rounds: Pairing[][] = [];

  for (let round = 0; round < rotating; round++) {
    const pairs: [string | null, string | null][] = [round % 2 === 0 ? [slots[round]!, fixed] : [fixed, slots[round]!]];
    for (let offset = 1; offset < size / 2; offset++) {
      const first = slots[(round + offset) % rotating]!;
      const second = slots[(round - offset + rotating) % rotating]!;
      pairs.push(offset % 2 === 1 ? [first, second] : [second, first]);
    }
    rounds.push(pairs.filter(isPlayable).map(([homeId, awayId]) => ({ homeId, awayId })));
  }
  return rounds;
}

function isPlayable(pair: [string | null, string | null]): pair is [string, string] {
  return pair[0] !== null && pair[1] !== null;
}

export interface LeagueFixturesOptions {
  division: Division;
  /** Numéro de saison, pour des identifiants de match uniques d'une saison à l'autre. */
  season: number;
  /** Mélange l'ordre des clubs pour varier le calendrier d'une saison à l'autre. */
  rng?: Rng;
}

/** Matchs de championnat d'une division, placés sur les semaines du calendrier. */
export function generateLeagueFixtures({ division, season, rng }: LeagueFixturesOptions): Fixture[] {
  const clubIds = rng ? shuffled(rng, division.clubIds) : division.clubIds;
  return doubleRoundRobin(clubIds).flatMap((pairings, index) => {
    const round = index + 1;
    return pairings.map(({ homeId, awayId }, match) => ({
      id: `s${season}-${division.id}-j${round}-m${match + 1}`,
      competition: 'league' as const,
      divisionId: division.id,
      round,
      week: leagueRoundWeek(round),
      homeId,
      awayId,
      result: null,
    }));
  });
}
