/**
 * Petites vues calculées pour les écrans de gestion : forme récente, libellé de la semaine,
 * prochaine fenêtre de mercato, tri des tableaux. Fonctions pures, testées à part.
 */
import { outcomeFor } from '../../domain/game';
import { SEASON_CALENDAR, type SeasonWeek } from '../../domain/league/calendar';
import { cupRoundName, type CupState } from '../../domain/league/cup';
import type { Fixture } from '../../domain/types';

export type FormLetter = 'V' | 'N' | 'D';

const FORM_LETTER = { win: 'V', draw: 'N', loss: 'D' } as const;
/** Nombre de matchs affichés dans la forme récente. */
export const FORM_LENGTH = 5;

/** Derniers résultats d'un club, championnat et coupe, du plus ancien au plus récent. */
export function recentForm(fixtures: readonly Fixture[], clubId: string, length = FORM_LENGTH): FormLetter[] {
  return fixtures
    .filter((fixture) => fixture.result && (fixture.homeId === clubId || fixture.awayId === clubId))
    .sort((a, b) => a.week - b.week)
    .slice(-length)
    .map((fixture) => FORM_LETTER[outcomeFor(fixture, clubId)!]);
}

/** Ce qui se joue cette semaine, en clair. */
export function weekLabel(week: SeasonWeek, cup: CupState): string {
  switch (week.kind) {
    case 'transferWindow':
      return 'Mercato ouvert';
    case 'league':
      return `Journée ${week.round} de championnat`;
    case 'cup':
      return `Coupe : ${cupRoundName(cup, week.round)}`;
  }
}

/** Prochaine semaine de mercato après `week` dans la saison, `null` s'il faut attendre la saison suivante. */
export function nextTransferWindowWeek(week: number): number | null {
  return SEASON_CALENDAR.find((entry) => entry.week > week && entry.kind === 'transferWindow')?.week ?? null;
}

/** Dernière semaine de la fenêtre de mercato ouverte en `week`. */
export function transferWindowLastWeek(week: number): number {
  let last = week;
  while (SEASON_CALENDAR[last]?.kind === 'transferWindow') last += 1;
  return last;
}

/** Tranches d'âge du mercato. */
export const AGE_BANDS = [
  { id: 'under22', label: 'Moins de 22 ans', min: 0, max: 21 },
  { id: '22to27', label: '22 à 27 ans', min: 22, max: 27 },
  { id: '28to31', label: '28 à 31 ans', min: 28, max: 31 },
  { id: 'over31', label: '32 ans et plus', min: 32, max: Number.POSITIVE_INFINITY },
] as const;

export type AgeBandId = (typeof AGE_BANDS)[number]['id'];

export function inAgeBand(age: number, id: AgeBandId): boolean {
  const band = AGE_BANDS.find((candidate) => candidate.id === id)!;
  return age >= band.min && age <= band.max;
}

export type SortDirection = 'asc' | 'desc';

/** Trie une copie des lignes selon une clé numérique ou textuelle (tri français pour le texte). */
export function sortRows<Row>(rows: readonly Row[], key: (row: Row) => number | string, direction: SortDirection): Row[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = key(a);
    const right = key(b);
    const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'fr');
    return order * factor;
  });
}
