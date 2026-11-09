import type { Club, Division, StandingRow } from '../types';

export interface DivisionMove {
  clubId: string;
  fromDivisionId: string;
  toDivisionId: string;
  kind: 'promotion' | 'relegation';
}

/**
 * Montées et descentes de fin de saison entre divisions adjacentes (UNIV-04) :
 * les `promoted` premiers montent d'un rang, les `relegated` derniers descendent.
 * L'élite ne monte nulle part, le district ne descend nulle part.
 * `standings` : classement final de chaque division, indexé par identifiant de division.
 */
export function computeDivisionMoves(
  divisions: readonly Division[],
  standings: Readonly<Record<string, readonly StandingRow[]>>,
): DivisionMove[] {
  const byTier = new Map(divisions.map((division) => [division.tier, division]));
  return divisions.flatMap((division) => {
    const table = standings[division.id];
    if (!table) throw new Error(`Classement manquant pour la division ${division.id}`);
    const upper = byTier.get(division.tier - 1);
    const lower = byTier.get(division.tier + 1);
    const promoted = upper ? table.slice(0, division.promoted).map((row) => move(row, division, upper, 'promotion')) : [];
    const relegated = lower
      ? table.slice(table.length - division.relegated).map((row) => move(row, division, lower, 'relegation'))
      : [];
    return [...promoted, ...relegated];
  });
}

function move(row: StandingRow, from: Division, to: Division, kind: DivisionMove['kind']): DivisionMove {
  return { clubId: row.clubId, fromDivisionId: from.id, toDivisionId: to.id, kind };
}

export interface AppliedMoves {
  divisions: Division[];
  clubs: Record<string, Club>;
}

/** Applique les mouvements sans modifier les entrées : renvoie de nouvelles divisions et de nouveaux clubs. */
export function applyDivisionMoves(
  divisions: readonly Division[],
  clubs: Readonly<Record<string, Club>>,
  moves: readonly DivisionMove[],
): AppliedMoves {
  const destination = new Map(moves.map((entry) => [entry.clubId, entry.toDivisionId]));
  const updatedDivisions = divisions.map((division) => ({
    ...division,
    clubIds: [
      ...division.clubIds.filter((clubId) => !destination.has(clubId)),
      ...moves.filter((entry) => entry.toDivisionId === division.id).map((entry) => entry.clubId),
    ],
  }));
  const updatedClubs = { ...clubs };
  for (const [clubId, divisionId] of destination) {
    const club = clubs[clubId];
    if (club) updatedClubs[clubId] = { ...club, divisionId };
  }
  return { divisions: updatedDivisions, clubs: updatedClubs };
}
