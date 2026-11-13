import type { FinanceLine } from '../club/finance';
import type { ClubOutlook } from '../club/model';
import type { SeasonObjective } from '../club/president';
import type { IncomingOffer } from '../club/transfers';
import type { CupState } from '../league/cup';
import type { Club, Division, Fixture, Player } from '../types';
import type { CoachState } from './coaches';
import type { Difficulty } from './difficulty';

/** Version du format de partie, à incrémenter à chaque changement incompatible de la sauvegarde. */
export const GAME_VERSION = 5;

export type GameStatus = 'playing' | 'fired';

export interface PendingDialogue {
  dialogueId: string;
}

export interface SeasonRecord {
  season: number;
  /** Club entraîné cette saison-là (le coach peut en changer après un licenciement). */
  clubName?: string;
  divisionName: string;
  position: number;
  cupRoundsWon: number;
  verdict: string;
  /** Récompenses individuelles de la division. */
  awards?: string[];
  /** Primes de la saison : classement et coupe. */
  prizeMoney?: number;
}

/**
 * Partie complète, sérialisable telle quelle dans une sauvegarde (TECH-03).
 * Les commandes de `src/domain/game` modifient cet objet en place : une partie pèse
 * plusieurs centaines de joueurs, la recopier à chaque action serait du gaspillage.
 */
export interface GameState {
  version: number;
  /** État du générateur aléatoire, pour reprendre exactement la même suite. */
  rngState: number;
  season: number;
  /** Semaine courante de la saison, de 1 à SEASON_WEEKS. */
  week: number;
  humanClubId: string;
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  divisions: Division[];
  /** Matchs de championnat de la saison en cours, toutes divisions. */
  fixtures: Fixture[];
  cup: CupState;
  outlook: Omit<ClubOutlook, 'budget'>;
  objective: SeasonObjective;
  offers: IncomingOffer[];
  dialogue: PendingDialogue | null;
  recentDialogueIds: string[];
  lastFinance: FinanceLine[];
  /** Joueurs ayant joué le match de la semaine, remplaçants entrés compris. */
  lastAppearances: string[];
  streak: { wins: number; losses: number };
  /** Fil d'actualité de la semaine (messages du staff). */
  news: string[];
  history: SeasonRecord[];
  status: GameStatus;
  difficulty: Difficulty;
  /** Clubs qui proposent un poste après un licenciement (CLUB-05). */
  jobOffers: string[];
  /** Rival de la saison (UNIV-09). */
  rivalId: string | null;
  /** Reroll de capacité payé, en attente du choix du coach (CAP-23). Absent des anciennes sauvegardes. */
  abilityReroll?: AbilityRerollOffer | null;
  /** Partie multijoueur (MULTI-01) : la fiche de chaque coach ; absent en solo. */
  coaches?: CoachState[];
  /** Coach dont les champs sont actuellement à la racine de la partie. */
  focusedCoachId?: string;
}

/** Les 3 capacités proposées après un reroll payé (CAP-23). */
export interface AbilityRerollOffer {
  playerId: string;
  abilityIds: string[];
  price: number;
}
