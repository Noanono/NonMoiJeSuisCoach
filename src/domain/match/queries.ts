/**
 * Lectures pour l'UI, sans effet de bord.
 */
import { requirePlayer, UNTIL_FINAL_WHISTLE } from './state';
import type { ActiveStat, MatchState } from './types';

export interface ActiveEffectView {
  label: string;
  stat: ActiveStat;
  value: number;
  /** Minutes restantes, `null` = jusqu'à la fin du match. */
  remaining: number | null;
}

/** Effets actifs d'un joueur avec leur compte à rebours (CAP-09). */
export function activeEffects(state: MatchState, playerId: string): ActiveEffectView[] {
  return requirePlayer(state, playerId).effects.filter((effect) => !effect.quiet).map((effect) => ({
    label: effect.label,
    stat: effect.stat,
    value: effect.value,
    remaining: effect.endsAt >= UNTIL_FINAL_WHISTLE ? null : effect.endsAt - state.elapsed,
  }));
}
