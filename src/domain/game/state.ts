import type { FinanceLine } from '../club/finance';
import type { ClubOutlook } from '../club/model';
import type { SeasonObjective } from '../club/president';
import type { IncomingOffer } from '../club/transfers';
import type { CupState } from '../league/cup';
import type { Club, Division, Fixture, Player } from '../types';

/** Version du format de partie, à incrémenter à chaque changement incompatible de la sauvegarde. */
export const GAME_VERSION = 3;

export type GameStatus = 'playing' | 'fired';

export interface PendingDialogue {
  dialogueId: string;
}

export interface SeasonRecord {
  season: number;
  divisionName: string;
  position: number;
  cupRoundsWon: number;
  verdict: string;
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
}
