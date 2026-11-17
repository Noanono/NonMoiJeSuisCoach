/**
 * Lectures pour l'UI, sans effet de bord.
 */
import { findPlayer, requirePlayer, UNTIL_FINAL_WHISTLE } from './state';
import type { ActiveStat, MatchState } from './types';

/** Ce qu'un effet visible touche : une stat, ou une protection (bouclier, immunité à la mise au sol). */
export type EffectStat = ActiveStat | 'shield' | 'steady';

export interface ActiveEffectView {
  label: string;
  stat: EffectStat;
  /** Pour un bouclier : charges restantes. */
  value: number;
  /** Marquage (M1) : nom du marqueur. */
  markedBy?: string;
  /** Minutes restantes, `null` = jusqu'à la fin du match. */
  remaining: number | null;
}

/** Effets actifs d'un joueur avec leur compte à rebours (CAP-09). */
export function activeEffects(state: MatchState, playerId: string): ActiveEffectView[] {
  const player = requirePlayer(state, playerId);
  const remaining = (endsAt: number) => (endsAt >= UNTIL_FINAL_WHISTLE ? null : endsAt - state.elapsed);
  const views: ActiveEffectView[] = player.effects.filter((effect) => !effect.quiet).map((effect) => {
    const marker = effect.markerId ? findPlayer(state, effect.markerId) : undefined;
    return { label: effect.label, stat: effect.stat, value: effect.value, remaining: remaining(effect.endsAt), ...(marker ? { markedBy: marker.name } : {}) };
  });
  // Protections (M7 et soins) : elles ne modifient aucune stat, mais le coach doit les voir.
  const shield = player.shield;
  if (shield && shield.charges > 0 && shield.until >= state.elapsed) views.push({ label: 'Bouclier', stat: 'shield', value: shield.charges, remaining: remaining(shield.until) });
  if (player.steadyUntil >= state.elapsed) views.push({ label: 'Indéboulonnable', stat: 'steady', value: 1, remaining: remaining(player.steadyUntil) });
  return views;
}
