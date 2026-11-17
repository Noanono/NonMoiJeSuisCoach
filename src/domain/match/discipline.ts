/**
 * Fautes et cartons (MATCH-08), communs au match en direct et à la simulation rapide :
 * mêmes taux partout, pour que les clubs IA subissent autant de suspensions que le coach.
 *
 * Environ 6 % de rouges par équipe et par match, comme dans les championnats réels. Le risque
 * monte avec la fatigue du fautif, ses malus de concentration et l'ambiance d'un derby ;
 * un joueur déjà averti lève le pied.
 */
import { clamp } from '../core/rng';
import type { Position } from '../types';

/** Faute par équipe et par minute. */
export const FOUL_RATE = 0.11;
/** Le pressing haut provoque plus de fautes. */
export const HIGH_PRESS_FOULS = 1.15;
export const FOULER_WEIGHTS: Record<Position, number> = { GK: 0.1, DEF: 3, MID: 2, ATT: 1 };

const YELLOW_ON_FOUL = 0.1;
const RED_ON_FOUL = 0.0025;
/** Un joueur épuisé arrive en retard sur tout : jusqu'à +60 % de cartons. */
const FATIGUE_CARD_FACTOR = 0.6;
/** Un derby échauffe les esprits. */
const DERBY_CARD_FACTOR = 1.3;
/** Un joueur averti fait attention : deux fois moins de cartons. */
const BOOKED_CARD_FACTOR = 0.5;

export const SUSPENSION_SECOND_YELLOW = 1;
export const SUSPENSION_DIRECT_RED = 2;

export interface FoulContext {
  /** Fatigue du fautif, 0 à 100. */
  fatigue: number;
  /** Malus de concentration en cours (0,4 = −40 %). */
  distraction: number;
  derby: boolean;
  /** Déjà averti dans ce match. */
  booked: boolean;
}

/** Chances qu'une faute vaille un jaune ou un rouge direct. */
export function cardChances({ fatigue, distraction, derby, booked }: FoulContext): { yellow: number; red: number } {
  const temper = (1 + (clamp(fatigue, 0, 100) / 100) * FATIGUE_CARD_FACTOR) * (1 + clamp(distraction, 0, 1)) * (derby ? DERBY_CARD_FACTOR : 1);
  return { yellow: YELLOW_ON_FOUL * temper * (booked ? BOOKED_CARD_FACTOR : 1), red: RED_ON_FOUL * temper };
}

export function foulRate(highPress: boolean): number {
  return clamp(FOUL_RATE * (highPress ? HIGH_PRESS_FOULS : 1), 0, 1);
}
