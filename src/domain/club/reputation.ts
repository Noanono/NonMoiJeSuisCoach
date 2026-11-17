/**
 * Réputation des clubs (C5) : elle suit les résultats. Elle décide du niveau des jeunes du centre
 * de formation, des objectifs du président, des offres d'emploi et des pronostics d'avant-match.
 */
import { clamp } from '../core/rng';

/** Écart de réputation entre le premier et le dernier d'une division, sur une saison. */
const RANK_SWING = 6;
const PROMOTION_BONUS = 5;
const RELEGATION_MALUS = 5;
/** Un tour de coupe gagné sur deux fait parler du club ; au plus ce bonus. */
const MAX_CUP_BONUS = 3;
/** Chaque saison, la réputation fait ce chemin vers la fourchette de sa nouvelle division. */
const DRIFT_TO_TIER = 0.2;
const MIN_REPUTATION = 1;
const MAX_REPUTATION = 100;

export interface SeasonOutcome {
  /** Place finale, 1 = premier. */
  position: number;
  clubCount: number;
  move: 'promotion' | 'relegation' | null;
  cupRoundsWon: number;
  /** Fourchette de réputation de la division où le club jouera la saison suivante. */
  nextTier: { min: number; max: number };
}

/** Nouvelle réputation après une saison. */
export function nextReputation(reputation: number, outcome: SeasonOutcome): number {
  const share = outcome.clubCount > 1 ? 1 - (outcome.position - 1) / (outcome.clubCount - 1) : 0.5;
  let next = reputation + (share - 0.5) * RANK_SWING;
  if (outcome.move === 'promotion') next += PROMOTION_BONUS;
  if (outcome.move === 'relegation') next -= RELEGATION_MALUS;
  next += Math.min(MAX_CUP_BONUS, Math.floor(outcome.cupRoundsWon / 2));
  const { min, max } = outcome.nextTier;
  if (next < min) next += (min - next) * DRIFT_TO_TIER;
  if (next > max) next -= (next - max) * DRIFT_TO_TIER;
  return clamp(Math.round(next), MIN_REPUTATION, MAX_REPUTATION);
}
