/**
 * Plusieurs coachs humains dans la même partie (MULTI-01). La partie garde sa forme solo : ses champs
 * « du coach » (président, offres, dialogue, actualité…) sont ceux du coach « au focus ». Chaque coach a
 * sa fiche dans `coaches` ; changer de focus range la fiche du coach courant et charge celle d'un autre.
 * En solo, `coaches` est absent : tout se passe comme avant, sans rien changer aux sauvegardes.
 */
import type { GameState } from './state';

/** Champs propres à un coach, recopiés entre la partie et sa fiche au changement de focus. */
export const COACH_FIELDS = [
  'outlook',
  'objective',
  'offers',
  'dialogue',
  'recentDialogueIds',
  'abilityReroll',
  'lastFinance',
  'lastAppearances',
  'streak',
  'news',
  'history',
  'status',
  'jobOffers',
  'rivalId',
] as const satisfies readonly (keyof GameState)[];

type CoachField = (typeof COACH_FIELDS)[number];

export type CoachState = { id: string; name: string; clubId: string } & Pick<GameState, CoachField>;

export function isMultiplayer(state: GameState): boolean {
  return (state.coaches?.length ?? 0) > 0;
}

/** Identifiant du coach au focus (`solo` en partie solo). */
export function focusedCoachId(state: GameState): string {
  return state.focusedCoachId ?? 'solo';
}

/** Recopie les champs du coach au focus dans sa fiche (avant une sauvegarde, un envoi ou un changement de focus). */
export function syncFocus(state: GameState): void {
  const coach = state.coaches?.find((candidate) => candidate.id === state.focusedCoachId);
  if (!coach) return;
  coach.clubId = state.humanClubId;
  for (const field of COACH_FIELDS) (coach as Record<CoachField, unknown>)[field] = state[field];
}

/** Met un coach au focus : la partie se lit et se joue alors de son point de vue. */
export function focusCoach(state: GameState, coachId: string): void {
  if (!state.coaches || state.focusedCoachId === coachId) return;
  const coach = state.coaches.find((candidate) => candidate.id === coachId);
  if (!coach) throw new Error(`Coach inconnu : ${coachId}`);
  syncFocus(state);
  state.focusedCoachId = coach.id;
  state.humanClubId = coach.clubId;
  for (const field of COACH_FIELDS) (state as Record<CoachField, unknown>)[field] = coach[field];
}

/** Exécute `command` du point de vue d'un coach, puis rend le focus au coach d'avant. */
export function asCoach<T>(state: GameState, coachId: string, command: () => T): T {
  const previous = state.focusedCoachId;
  focusCoach(state, coachId);
  try {
    return command();
  } finally {
    if (previous) focusCoach(state, previous);
  }
}

/** Exécute `command` pour chaque coach, tour à tour au focus. En solo, une seule fois. */
export function forEachCoach(state: GameState, command: () => void): void {
  if (!state.coaches) {
    command();
    return;
  }
  for (const coach of state.coaches.map((entry) => entry.id)) asCoach(state, coach, command);
}

/** Coach qui dirige ce club, s'il y en a un (en solo : le coach, si c'est son club). */
export function coachOfClub(state: GameState, clubId: string): string | null {
  if (!state.coaches) return clubId === state.humanClubId ? 'solo' : null;
  syncFocus(state);
  return state.coaches.find((coach) => coach.clubId === clubId)?.id ?? null;
}

/** Exécute `command` du point de vue du coach de ce club ; rien si le club n'a pas de coach humain. */
export function asCoachOfClub(state: GameState, clubId: string, command: () => void): void {
  const coach = coachOfClub(state, clubId);
  if (coach === null) return;
  if (!state.coaches) command();
  else asCoach(state, coach, command);
}
