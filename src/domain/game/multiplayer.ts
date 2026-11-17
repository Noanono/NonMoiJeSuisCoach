/**
 * Partie multijoueur en réseau local (MULTI-01 à MULTI-03) : création de la ligue entre amis,
 * arrivée d'un joueur en cours de partie.
 */
import { NEUTRAL_SPONSOR_MOOD } from '../club/model';
import { seasonObjective } from '../club/president';
import { overall } from '../player/rating';
import { abbreviate } from '../world/generateWorld';
import { shuffled } from '../world/random';
import type { Club } from '../types';
import { COACH_FIELDS, focusCoach, syncFocus, type CoachState } from './coaches';
import { DIFFICULTIES, type Difficulty } from './difficulty';
import { createGame } from './newGame';
import { chooseRival, startSeason } from './season';
import { clubPlayers, divisionOf, humanDivision } from './selectors';
import type { GameState } from './state';
import { withRng } from './week';

export interface CoachSignup {
  /** Identifiant stable du joueur (choisi par le client). */
  id: string;
  /** Nom du coach, affiché aux autres. */
  name: string;
  /** Nom de son club. */
  clubName: string;
}

export const MAX_COACHES = 10;

/** Problème d'inscription (nom vide, déjà pris…), `null` si tout va bien. */
export function signupError(state: GameState | null, signups: readonly CoachSignup[], signup: CoachSignup): string | null {
  const name = signup.name.trim();
  const clubName = signup.clubName.trim();
  if (!name) return 'Il te faut un nom de coach.';
  if (!clubName) return 'Il te faut un nom de club.';
  const others = signups.filter((other) => other.id !== signup.id);
  if (others.some((other) => other.name.trim().toLowerCase() === name.toLowerCase())) return 'Ce nom de coach est déjà pris.';
  const takenClubNames = [...others.map((other) => other.clubName), ...(state ? Object.values(state.clubs).map((club) => club.name) : [])];
  if (takenClubNames.some((taken) => taken.trim().toLowerCase() === clubName.toLowerCase())) return 'Ce nom de club est déjà pris.';
  if (!state && others.length >= MAX_COACHES) return `La ligue est pleine : ${MAX_COACHES} coachs au maximum.`;
  return null;
}

/**
 * Nouvelle ligue entre amis (MULTI-02) : chaque coach crée son club, tous dans la division de départ.
 * Le premier inscrit prend le club du coach solo, les autres remplacent des clubs IA de la même division.
 */
export function newMultiplayerGame({ seed, coaches, difficulty = 'normal' }: { seed: number; coaches: readonly CoachSignup[]; difficulty?: Difficulty }): GameState {
  const [first, ...others] = coaches;
  if (!first) throw new Error('Il faut au moins un coach.');
  const { state, rng } = createGame({ seed, clubName: first.clubName, difficulty });
  const division = humanDivision(state);
  const available = shuffled(rng, division.clubIds.filter((id) => id !== state.humanClubId));
  if (others.length > available.length) throw new Error(`Trop de coachs : ${division.clubIds.length} clubs par division.`);
  const records: CoachState[] = [coachRecord(state, first, state.humanClubId)];
  others.forEach((signup, index) => {
    const club = state.clubs[available[index]!]!;
    takeOverClub(state, club, signup.clubName);
    records.push({ ...coachRecord(state, signup, club.id), news: [welcome(club)] });
  });
  state.coaches = records;
  state.focusedCoachId = first.id;
  startSeason(state, rng);
  state.rngState = rng.state();
  return state;
}

/**
 * Un ami arrive en cours de partie (MULTI-03) : il récupère le club IA le plus faible du monde
 * et le renomme. Son président lui fixe un objectif et un rival pour la fin de saison.
 */
export function joinMidGame(state: GameState, signup: CoachSignup): string {
  if (!state.coaches) throw new Error('Partie solo : pas de place pour un deuxième coach.');
  if (state.coaches.some((coach) => coach.id === signup.id)) throw new Error('Ce coach est déjà dans la partie.');
  const weakest = Object.values(state.clubs)
    .filter((club) => !club.isHuman)
    .sort((a, b) => clubLevel(state, a) - clubLevel(state, b))[0];
  if (!weakest) throw new Error('Plus aucun club libre.');
  takeOverClub(state, weakest, signup.clubName);
  syncFocus(state);
  const record: CoachState = { ...coachRecord(state, signup, weakest.id), news: [welcome(weakest)] };
  state.coaches.push(record);
  const previous = state.focusedCoachId!;
  focusCoach(state, record.id);
  withRng(state, (rng) => {
    state.objective = seasonObjective({ club: weakest, division: divisionOf(state, weakest.id), clubs: state.clubs, rng });
    state.rivalId = chooseRival(state, rng);
  });
  state.news.push(`Le président : « ${state.objective.speech} »`);
  focusCoach(state, previous);
  return weakest.id;
}

/** Niveau d'un club pour trouver le plus faible : moyenne de ses 11 meilleurs joueurs, puis sa division. */
function clubLevel(state: GameState, club: Club): number {
  const ratings = clubPlayers(state, club.id)
    .map(overall)
    .sort((a, b) => b - a)
    .slice(0, 11);
  const average = ratings.length > 0 ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : 0;
  return average - divisionOf(state, club.id).tier * 0.001;
}

/** Un coach humain prend la tête d'un club : nouveau nom, budget selon la difficulté, effectif connu. */
function takeOverClub(state: GameState, club: Club, clubName: string): void {
  const name = clubName.trim();
  club.name = name;
  club.shortName = abbreviate(name);
  club.isHuman = true;
  club.budget = Math.round(club.budget * DIFFICULTIES[state.difficulty].budgetFactor);
  for (const playerId of club.playerIds) {
    const player = state.players[playerId];
    if (player) player.ability.revealed = true;
  }
}

function welcome(club: Club): string {
  return `Bienvenue à ${club.name}. Terrain boueux, buvette en préfabriqué, vestiaires qui fuient. C'est chez toi.`;
}

/** Fiche d'un coach qui débute : champs neufs, ceux du solo pour le premier coach. */
function coachRecord(state: GameState, signup: CoachSignup, clubId: string): CoachState {
  const fresh: Pick<GameState, (typeof COACH_FIELDS)[number]> = {
    outlook: { presidentConfidence: DIFFICULTIES[state.difficulty].startConfidence, sponsorMood: NEUTRAL_SPONSOR_MOOD },
    objective: { league: 'survival', targetPosition: 0, cupRoundsToWin: 0, speech: '' },
    offers: [],
    dialogue: null,
    recentDialogueIds: [],
    abilityReroll: null,
    lastFinance: [],
    lastAppearances: [],
    streak: { wins: 0, losses: 0 },
    news: [],
    history: [],
    status: 'playing',
    jobOffers: [],
    rivalId: null,
  };
  const base = clubId === state.humanClubId && !state.coaches ? Object.fromEntries(COACH_FIELDS.map((field) => [field, state[field]])) : fresh;
  return { id: signup.id, name: signup.name.trim(), clubId, ...(base as typeof fresh) };
}
