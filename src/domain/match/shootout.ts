/**
 * Tirs au but en coupe (UNIV-06) : 5 tirs chacun, puis mort subite.
 */
import type { Rng } from '../core/rng';
import { clamp } from '../core/rng';
import type { ShootoutResult } from './types';

const ROUNDS = 5;
const MAX_SUDDEN_DEATH_ROUNDS = 20;
const BASE_SHOOTOUT_CONVERSION = 0.75;
/** Écart tireurs/gardien (points de note) traduit en probabilité. */
const SKILL_WEIGHT = 0.004;
const MIN_SHOOTOUT_CONVERSION = 0.5;
const MAX_SHOOTOUT_CONVERSION = 0.92;
const COIN_TOSS = 0.5;

/** Probabilité de marquer un tir au but : tireurs moyens contre gardien adverse. */
export function shootoutConversion(shooters: number, keeper: number): number {
  return clamp(
    BASE_SHOOTOUT_CONVERSION + (shooters - keeper) * SKILL_WEIGHT,
    MIN_SHOOTOUT_CONVERSION,
    MAX_SHOOTOUT_CONVERSION,
  );
}

export function runShootout(rng: Rng, homeConversion: number, awayConversion: number): ShootoutResult {
  let home = 0;
  let away = 0;
  for (let round = 0; round < ROUNDS; round++) {
    if (rng.chance(homeConversion)) home++;
    if (rng.chance(awayConversion)) away++;
  }
  for (let round = 0; home === away && round < MAX_SUDDEN_DEATH_ROUNDS; round++) {
    if (rng.chance(homeConversion)) home++;
    if (rng.chance(awayConversion)) away++;
  }
  if (home === away) {
    if (rng.chance(COIN_TOSS)) home++;
    else away++;
  }
  return { home, away, winner: home > away ? 'home' : 'away' };
}
