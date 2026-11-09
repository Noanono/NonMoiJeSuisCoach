/**
 * Impact des capacités sur le match (CAP-10, MATCH-06) : estimation simple, à partir
 * des faits de jeu survenus pendant l'effet.
 */
import { clamp } from '../core/rng';
import { xpForActivation } from '../abilities/progression';
import type { ActivationRecord, MatchState, Side } from './types';

/** Points d'impact (0 à 1) par fait de jeu. */
export const IMPACT = {
  success: 0.1,
  goalScored: 0.5,
  chanceStopped: 0.1,
  actionCancelled: 0.4,
  knockout: 0.2,
  goalCancelled: 0.7,
} as const;

/** Période minimale pendant laquelle une activation instantanée est créditée. */
export const IMPACT_WINDOW_MINUTES = 5;

export function creditActivation(record: ActivationRecord, amount: number, note: string): void {
  record.impact = clamp(record.impact + amount, 0, 1);
  if (!record.notes.includes(note)) record.notes.push(note);
}

/** Crédite toutes les activations du camp dont l'effet est encore en cours. */
export function creditActive(state: MatchState, side: Side, amount: number, note: string): void {
  for (const record of state.activations) {
    if (record.side === side && record.activeUntil >= state.elapsed) {
      creditActivation(record, amount, note);
    }
  }
}

/** XP par joueur : chaque activation rapporte selon son impact (CAP-10). */
export function computeXpGains(state: MatchState): Record<string, number> {
  const gains: Record<string, number> = {};
  for (const record of state.activations) {
    gains[record.playerId] = (gains[record.playerId] ?? 0) + xpForActivation(record.impact);
  }
  return gains;
}
