import { ABILITIES } from '../abilities/catalog';
import type { Rng } from '../core/rng';
import { isAvailable } from '../player/rating';
import type { Position } from '../types';
import { generatePlayer } from '../world/playerGenerator';
import { clubPlayers } from './selectors';
import type { GameState } from './state';

/** Onze titulaires et deux remplaçants : le minimum pour jouer un match (EFF-03). */
const MIN_AVAILABLE_PLAYERS = 13;
/** Les dépanneurs ont le niveau d'un habitué de la buvette. */
const STAND_IN_REPUTATION_RATIO = 0.6;
const STAND_IN_AGE = 34;

/**
 * Quand un club n'a plus assez de joueurs disponibles (blessures, suspensions, refus de jouer),
 * il fait signer des dépanneurs : le cousin du président, l'habitué du comptoir…
 */
export function callUpStandIns(state: GameState, clubId: string, rng: Rng): number {
  const club = state.clubs[clubId];
  if (!club) return 0;
  let calledUp = 0;
  while (needsStandIn(state, clubId)) {
    const standIn = generatePlayer({
      rng,
      position: neededPosition(state, clubId),
      reputation: Math.round(club.reputation * STAND_IN_REPUTATION_RATIO),
      clubId,
      abilityPool: ABILITIES,
      excludedAbilityIds: clubPlayers(state, clubId).map((player) => player.ability.abilityId),
      age: STAND_IN_AGE,
    });
    state.players[standIn.id] = standIn;
    club.playerIds.push(standIn.id);
    calledUp += 1;
  }
  return calledUp;
}

function needsStandIn(state: GameState, clubId: string): boolean {
  const available = clubPlayers(state, clubId).filter(isAvailable);
  return available.length < MIN_AVAILABLE_PLAYERS || !available.some((player) => player.position === 'GK');
}

/** Poste le plus dégarni parmi les joueurs disponibles, gardien d'abord. */
function neededPosition(state: GameState, clubId: string): Position {
  const available = clubPlayers(state, clubId).filter(isAvailable);
  const count = (position: Position) => available.filter((player) => player.position === position).length;
  if (count('GK') === 0) return 'GK';
  const needs: [Position, number][] = [
    ['DEF', 4 - count('DEF')],
    ['MID', 4 - count('MID')],
    ['ATT', 2 - count('ATT')],
  ];
  return needs.reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}
