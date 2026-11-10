import type { Rng } from '../core/rng';
import type { Position } from '../types';

/** Passes décisives (UNIV-08) : la plupart des buts ont un passeur, choisi selon son poste. */
export const ASSIST_CHANCE = 0.8;
const ASSIST_WEIGHTS: Record<Position, number> = { GK: 0.2, DEF: 1, MID: 3, ATT: 2 };

/** Tire le passeur parmi les coéquipiers (le buteur exclu par l'appelant), ou personne. */
export function pickAssister<T>(rng: Rng, teammates: readonly T[], lineOf: (player: T) => Position): T | undefined {
  if (teammates.length === 0 || !rng.chance(ASSIST_CHANCE)) return undefined;
  const total = teammates.reduce((sum, player) => sum + ASSIST_WEIGHTS[lineOf(player)], 0);
  let roll = rng.next() * total;
  for (const player of teammates) {
    roll -= ASSIST_WEIGHTS[lineOf(player)];
    if (roll < 0) return player;
  }
  return teammates[teammates.length - 1];
}
