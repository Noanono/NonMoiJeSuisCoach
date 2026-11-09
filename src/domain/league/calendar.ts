import type { Fixture } from '../types';

/** Journées de championnat : 10 clubs par division, en aller-retour (UNIV-05). */
export const LEAGUE_ROUNDS = 18;
/** Tours de coupe : préliminaire, puis 32 clubs jusqu'à la finale (UNIV-06). */
export const CUP_ROUNDS = 6;
/** Durée de chaque fenêtre de mercato, en semaines (CLUB-02). */
const TRANSFER_WINDOW_WEEKS = 2;

export type SeasonWeek =
  | { week: number; kind: 'transferWindow' }
  | { week: number; kind: 'league'; round: number }
  | { week: number; kind: 'cup'; round: number };

export interface SeasonCalendarOptions {
  leagueRounds: number;
  cupRounds: number;
}

/**
 * Calendrier de saison : mercato d'été, matchs aller, mercato d'hiver à mi-saison (CLUB-02), matchs retour.
 * Les tours de coupe sont répartis régulièrement, chacun sur sa propre semaine, la finale clôt la saison.
 */
export function buildSeasonCalendar({ leagueRounds, cupRounds }: SeasonCalendarOptions): SeasonWeek[] {
  const weeks: SeasonWeek[] = [];
  const nextWeek = () => weeks.length + 1;
  const addTransferWindow = () => {
    for (let i = 0; i < TRANSFER_WINDOW_WEEKS; i++) weeks.push({ week: nextWeek(), kind: 'transferWindow' });
  };
  const midSeasonRound = Math.floor(leagueRounds / 2);
  let nextCupRound = 1;

  addTransferWindow();
  for (let round = 1; round <= leagueRounds; round++) {
    weeks.push({ week: nextWeek(), kind: 'league', round });
    while (nextCupRound <= cupRounds && cupSlot(nextCupRound, leagueRounds, cupRounds) === round) {
      weeks.push({ week: nextWeek(), kind: 'cup', round: nextCupRound++ });
    }
    if (round === midSeasonRound) addTransferWindow();
  }
  return weeks;
}

/** Journée de championnat après laquelle se joue un tour de coupe. */
function cupSlot(cupRound: number, leagueRounds: number, cupRounds: number): number {
  return Math.max(1, Math.round((leagueRounds * cupRound) / cupRounds));
}

export const SEASON_CALENDAR: readonly SeasonWeek[] = buildSeasonCalendar({
  leagueRounds: LEAGUE_ROUNDS,
  cupRounds: CUP_ROUNDS,
});

export const SEASON_WEEKS = SEASON_CALENDAR.length;

const LEAGUE_ROUND_WEEK = new Map<number, number>();
const CUP_ROUND_WEEK = new Map<number, number>();
for (const entry of SEASON_CALENDAR) {
  if (entry.kind === 'league') LEAGUE_ROUND_WEEK.set(entry.round, entry.week);
  if (entry.kind === 'cup') CUP_ROUND_WEEK.set(entry.round, entry.week);
}

/** Contenu d'une semaine de la saison (1 à SEASON_WEEKS). */
export function seasonWeek(week: number): SeasonWeek {
  const entry = SEASON_CALENDAR[week - 1];
  if (!entry) throw new Error(`Semaine ${week} hors calendrier (1 à ${SEASON_WEEKS})`);
  return entry;
}

/** Le mercato est ouvert en début de saison et à mi-saison (CLUB-02). */
export function isTransferWindowOpen(week: number): boolean {
  return SEASON_CALENDAR[week - 1]?.kind === 'transferWindow';
}

export function leagueRoundWeek(round: number): number {
  const week = LEAGUE_ROUND_WEEK.get(round);
  if (week === undefined) throw new Error(`Journée ${round} absente du calendrier`);
  return week;
}

export function cupRoundWeek(round: number): number {
  const week = CUP_ROUND_WEEK.get(round);
  if (week === undefined) throw new Error(`Tour de coupe ${round} absent du calendrier`);
  return week;
}

/** Matchs (championnat et coupe) programmés une semaine donnée. */
export function fixturesForWeek(fixtures: readonly Fixture[], week: number): Fixture[] {
  return fixtures.filter((fixture) => fixture.week === week);
}
