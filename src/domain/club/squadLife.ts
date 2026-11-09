import type { Player } from '../types';
import { clampGauge } from './model';

/** Vie de l'effectif entre deux matchs (EFF-04, EFF-05) : récupération, blessures, suspensions. */

/** Fatigue effacée en une semaine (EFF-04). */
const REST_RECOVERY = 50;
const PLAYED_RECOVERY = 35;

export interface WeeklySquadInput {
  squad: readonly Player[];
  /** Joueurs ayant joué le match de la semaine. */
  appearances: readonly string[];
  /** Le coach avait un match cette semaine. */
  matchPlayed: boolean;
}

/**
 * Le match de la semaine est purgé par les suspendus qui ne l'ont pas joué ;
 * un joueur qui a joué et porte une suspension vient de la recevoir.
 */
function serveSuspension(player: Player, played: boolean, matchPlayed: boolean): number {
  return matchPlayed && !played && player.suspendedMatches > 0 ? player.suspendedMatches - 1 : player.suspendedMatches;
}

/** Semaine de l'effectif, appelée après le match de la semaine. */
export function weeklySquadUpdate({ squad, appearances, matchPlayed }: WeeklySquadInput): Player[] {
  const appeared = new Set(appearances);
  return squad.map((player) => {
    const played = appeared.has(player.id);
    return {
      ...player,
      fatigue: clampGauge(player.fatigue - (played ? PLAYED_RECOVERY : REST_RECOVERY)),
      injuryWeeks: Math.max(0, player.injuryWeeks - 1),
      suspendedMatches: serveSuspension(player, played, matchPlayed),
    };
  });
}
