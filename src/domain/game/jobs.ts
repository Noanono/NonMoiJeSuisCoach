import type { Rng } from '../core/rng';
import { humanClub } from './selectors';
import type { GameState } from './state';

/** Offres d'emploi après un licenciement (CLUB-05) : trois clubs moins cotés que celui qu'on quitte. */

export const JOB_OFFER_COUNT = 3;
/** On tire parmi les clubs les plus proches en réputation, sous celle du club quitté. */
const CANDIDATE_POOL = 8;

export function pickJobOffers(state: GameState, rng: Rng): string[] {
  const current = humanClub(state);
  const others = Object.values(state.clubs).filter((club) => !club.isHuman);
  const lower = others.filter((club) => club.reputation <= current.reputation).sort((a, b) => b.reputation - a.reputation);
  const pool = (lower.length >= JOB_OFFER_COUNT ? lower : [...others].sort((a, b) => a.reputation - b.reputation)).slice(0, CANDIDATE_POOL);
  const offers: string[] = [];
  while (offers.length < JOB_OFFER_COUNT && pool.length > 0) offers.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]!.id);
  return offers;
}
