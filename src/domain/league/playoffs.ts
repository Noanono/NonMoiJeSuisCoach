import type { Division, Fixture, StandingRow } from '../types';
import { fixtureWinnerId } from './cup';
import type { DivisionMove } from './promotion';

/**
 * Barrages d'accession (UNIV-04) : après la dernière journée, le premier non promu de chaque division
 * (le 3e) affronte le premier relégable évité de la division du dessus (l'antépénultième, 8e sur 10).
 * Match sec chez le club de la division supérieure, tirs au but en cas d'égalité ; le vainqueur
 * joue la saison suivante dans la division supérieure.
 */

export interface PlayoffPairing {
  upperDivisionId: string;
  lowerDivisionId: string;
  /** Antépénultième de la division supérieure : il défend sa place. */
  upperClubId: string;
  /** 3e de la division inférieure : il tente de monter. */
  lowerClubId: string;
}

export function playoffPairings(divisions: readonly Division[], standings: Readonly<Record<string, readonly StandingRow[]>>): PlayoffPairing[] {
  const byTier = new Map(divisions.map((division) => [division.tier, division]));
  const pairings: PlayoffPairing[] = [];
  for (const lower of divisions) {
    const upper = byTier.get(lower.tier - 1);
    if (!upper || lower.promoted <= 0 || upper.relegated <= 0) continue;
    const upperTable = standings[upper.id] ?? [];
    const lowerTable = standings[lower.id] ?? [];
    const upperClub = upperTable[upperTable.length - upper.relegated - 1];
    const lowerClub = lowerTable[lower.promoted];
    if (!upperClub || !lowerClub) continue;
    pairings.push({ upperDivisionId: upper.id, lowerDivisionId: lower.id, upperClubId: upperClub.clubId, lowerClubId: lowerClub.clubId });
  }
  return pairings;
}

/** Place d'un club en barrage dans sa division, s'il y en a une (3e pour monter, antépénultième pour se maintenir). */
export function playoffZone(division: Division, hasUpper: boolean, hasLower: boolean, rank: number): 'up' | 'down' | null {
  const size = division.clubIds.length;
  if (hasUpper && division.promoted > 0 && rank === division.promoted + 1) return 'up';
  if (hasLower && division.relegated > 0 && rank === size - division.relegated) return 'down';
  return null;
}

/** Un match de barrage par paire, chez le club de la division supérieure. */
export function createPlayoffFixtures(pairings: readonly PlayoffPairing[], season: number, week: number): Fixture[] {
  return pairings.map((pairing) => ({
    id: `s${season}-barrage-${pairing.lowerDivisionId}`,
    competition: 'playoff',
    divisionId: pairing.lowerDivisionId,
    round: 1,
    week,
    homeId: pairing.upperClubId,
    awayId: pairing.lowerClubId,
    result: null,
  }));
}

/** Mouvements dus aux barrages : quand le club d'en bas gagne, les deux clubs échangent leur division. */
export function playoffMoves(fixtures: readonly Fixture[], divisions: readonly Division[]): DivisionMove[] {
  const divisionOf = new Map(divisions.flatMap((division) => division.clubIds.map((clubId) => [clubId, division.id] as const)));
  return fixtures
    .filter((fixture) => fixture.competition === 'playoff' && fixture.result)
    .flatMap((fixture) => {
      if (fixtureWinnerId(fixture) !== fixture.awayId) return [];
      const upperId = divisionOf.get(fixture.homeId);
      const lowerId = divisionOf.get(fixture.awayId);
      if (!upperId || !lowerId) return [];
      return [
        { clubId: fixture.awayId, fromDivisionId: lowerId, toDivisionId: upperId, kind: 'promotion' as const },
        { clubId: fixture.homeId, fromDivisionId: upperId, toDivisionId: lowerId, kind: 'relegation' as const },
      ];
    });
}
