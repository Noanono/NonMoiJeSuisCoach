import type { AbilityContext } from '../abilities/progression';
import type { FinanceLine } from '../club/finance';
import type { ClubOutlook } from '../club/model';
import type { SeasonObjective } from '../club/president';
import type { IncomingOffer } from '../club/transfers';
import type { CupState } from '../league/cup';
import type { Club, Division, Fixture, HouseRule, Player, PressArticle, TeamNight } from '../types';

/** Version du format de partie, à incrémenter à chaque changement incompatible de la sauvegarde. */
export const GAME_VERSION = 1;

export type GameStatus = 'playing' | 'fired';

export interface PendingDialogue {
  dialogueId: string;
  playerId: string | null;
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
  houseRules: HouseRule[];
  /** Soirée d'équipe choisie pour la semaine (FRAS-06). */
  teamNight: TeamNight;
  /** Contexte des capacités pour le prochain match (CAP-14). */
  abilityContext: AbilityContext;
  press: PressArticle[];
  offers: IncomingOffer[];
  dialogue: PendingDialogue | null;
  recentDialogueIds: string[];
  /** Amendes infligées aux joueurs cette semaine, encaissées au bilan (FRAS-02). */
  finesCollected: number;
  /** Amendes payées par le club cette semaine (streaker, fumigène…). */
  finesPaid: number;
  lastFinance: FinanceLine[];
  streak: { wins: number; losses: number };
  /** Fil d'actualité de la semaine (messages du staff). */
  news: string[];
  history: SeasonRecord[];
  status: GameStatus;
}
