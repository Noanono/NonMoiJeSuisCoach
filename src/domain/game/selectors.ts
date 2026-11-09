import type { ClubOutlook } from '../club/model';
import { seasonWeek, type SeasonWeek } from '../league/calendar';
import type { Club, Division, Fixture, Player } from '../types';
import type { GameState } from './state';

export function humanClub(state: GameState): Club {
  const club = state.clubs[state.humanClubId];
  if (!club) throw new Error('Club du coach introuvable');
  return club;
}

export function divisionOf(state: GameState, clubId: string): Division {
  const division = state.divisions.find((candidate) => candidate.clubIds.includes(clubId));
  if (!division) throw new Error(`Division introuvable pour ${clubId}`);
  return division;
}

export function humanDivision(state: GameState): Division {
  return divisionOf(state, state.humanClubId);
}

export function clubPlayers(state: GameState, clubId: string): Player[] {
  const club = state.clubs[clubId];
  if (!club) return [];
  return club.playerIds.map((id) => state.players[id]).filter((player): player is Player => player !== undefined);
}

export function humanSquad(state: GameState): Player[] {
  return clubPlayers(state, state.humanClubId);
}

export function currentWeek(state: GameState): SeasonWeek {
  return seasonWeek(state.week);
}

/** Tous les matchs (championnat et coupe) programmés cette semaine. */
export function weekFixtures(state: GameState): Fixture[] {
  const week = currentWeek(state);
  if (week.kind === 'league') return state.fixtures.filter((fixture) => fixture.week === state.week);
  if (week.kind === 'cup') return state.cup.fixtures.filter((fixture) => fixture.round === week.round);
  return [];
}

/** Match du coach cette semaine, s'il en a un. */
export function humanFixture(state: GameState): Fixture | null {
  return (
    weekFixtures(state).find((fixture) => fixture.homeId === state.humanClubId || fixture.awayId === state.humanClubId) ??
    null
  );
}

export function outlookOf(state: GameState): ClubOutlook {
  return { ...state.outlook, budget: humanClub(state).budget };
}

/** Réécrit les jauges du club après une fonction du module club. */
export function writeOutlook(state: GameState, outlook: ClubOutlook): void {
  humanClub(state).budget = outlook.budget;
  state.outlook = { presidentConfidence: outlook.presidentConfidence, sponsorMood: outlook.sponsorMood };
}

export function replacePlayers(state: GameState, players: readonly Player[]): void {
  for (const player of players) state.players[player.id] = player;
}
