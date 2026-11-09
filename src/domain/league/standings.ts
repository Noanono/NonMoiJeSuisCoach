import type { Fixture, StandingRow } from '../types';

/** Barème du championnat (UNIV-05). */
export const POINTS_FOR_WIN = 3;
export const POINTS_FOR_DRAW = 1;

/**
 * Classement d'un championnat à partir des matchs joués (UNIV-05) : points, puis différence de buts,
 * puis buts marqués. À égalité parfaite, l'ordre de `clubIds` est conservé.
 * Les matchs de coupe, non joués ou impliquant un club hors liste sont ignorés.
 */
export function computeStandings(clubIds: readonly string[], fixtures: readonly Fixture[]): StandingRow[] {
  const rows = new Map(clubIds.map((clubId) => [clubId, emptyRow(clubId)]));
  for (const fixture of fixtures) {
    const home = rows.get(fixture.homeId);
    const away = rows.get(fixture.awayId);
    if (fixture.competition !== 'league' || !fixture.result || !home || !away) continue;
    recordResult(home, fixture.result.homeGoals, fixture.result.awayGoals);
    recordResult(away, fixture.result.awayGoals, fixture.result.homeGoals);
  }
  const order = new Map(clubIds.map((clubId, index) => [clubId, index]));
  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      goalDifference(b) - goalDifference(a) ||
      b.goalsFor - a.goalsFor ||
      order.get(a.clubId)! - order.get(b.clubId)!,
  );
}

export function goalDifference(row: StandingRow): number {
  return row.goalsFor - row.goalsAgainst;
}

function emptyRow(clubId: string): StandingRow {
  return { clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

/** Met à jour la ligne du club (mutation locale à `computeStandings`). */
function recordResult(row: StandingRow, scored: number, conceded: number): void {
  row.played++;
  row.goalsFor += scored;
  row.goalsAgainst += conceded;
  if (scored > conceded) {
    row.won++;
    row.points += POINTS_FOR_WIN;
  } else if (scored === conceded) {
    row.drawn++;
    row.points += POINTS_FOR_DRAW;
  } else {
    row.lost++;
  }
}
