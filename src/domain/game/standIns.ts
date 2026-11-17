import { ABILITIES, getAbility } from '../abilities/catalog';
import { countRarities, rarityLimits } from '../club/rarityQuota';
import type { Rng } from '../core/rng';
import { isAvailable } from '../player/rating';
import type { Position } from '../types';
import { generatePlayer, isAbilityCompatible } from '../world/playerGenerator';
import { clubPlayers, divisionOf } from './selectors';
import type { GameState } from './state';

/** Onze titulaires et deux remplaçants : le minimum pour jouer un match (EFF-03). */
const MIN_AVAILABLE_PLAYERS = 13;
/** Les dépanneurs ont le niveau d'un habitué de la buvette. */
const STAND_IN_REPUTATION_RATIO = 0.6;
const STAND_IN_AGE = 34;
const MAX_STAND_INS_AT_ONCE = 13;

/** Les dépanneurs n'ont qu'une capacité commune : ils ne comptent jamais dans les quotas de rareté (CAP-24). */
const STAND_IN_ABILITIES = ABILITIES.filter((ability) => ability.rarity === 'common');

/**
 * Quand un club n'a plus assez de joueurs disponibles et alignables (blessures, suspensions, quotas
 * de rareté), il fait signer des dépanneurs : le cousin du président, l'habitué du comptoir…
 */
export function callUpStandIns(state: GameState, clubId: string, rng: Rng): number {
  const club = state.clubs[clubId];
  if (!club) return 0;
  let calledUp = 0;
  // Garde-fou : un effectif ne grossit jamais sans fin.
  while (needsStandIn(state, clubId) && calledUp < MAX_STAND_INS_AT_ONCE) {
    const position = neededPosition(state, clubId);
    const taken = new Set(clubPlayers(state, clubId).map((player) => player.ability.abilityId));
    // Plus de commune libre à ce poste : le dépanneur en reprend une déjà présente au club.
    const free = STAND_IN_ABILITIES.some((ability) => isAbilityCompatible(ability, position) && !taken.has(ability.id));
    const standIn = generatePlayer({
      rng,
      position,
      reputation: Math.round(club.reputation * STAND_IN_REPUTATION_RATIO),
      clubId,
      abilityPool: STAND_IN_ABILITIES,
      excludedAbilityIds: free ? [...taken] : [],
      age: STAND_IN_AGE,
    });
    state.players[standIn.id] = standIn;
    club.playerIds.push(standIn.id);
    calledUp += 1;
  }
  return calledUp;
}

/** Joueurs disponibles qu'on peut inscrire ensemble sur la feuille de match, quotas de rareté compris. */
function alignableCount(state: GameState, clubId: string): { count: number; keeper: boolean } {
  const available = clubPlayers(state, clubId).filter(isAvailable);
  const rarityOf = (id: string) => getAbility(id).rarity;
  const limits = rarityLimits(divisionOf(state, clubId).tier);
  const counts = countRarities(available, rarityOf);
  const commons = available.length - counts.rare - counts.legendary - counts.mythic;
  const count = commons + Math.min(counts.rare, limits.rare) + Math.min(counts.legendary, limits.legendary) + Math.min(counts.mythic, limits.mythic);
  const keeper = available.some((player) => {
    if (player.position !== 'GK') return false;
    const rarity = rarityOf(player.ability.abilityId);
    return rarity === 'common' || limits[rarity] > 0;
  });
  return { count, keeper };
}

function needsStandIn(state: GameState, clubId: string): boolean {
  const { count, keeper } = alignableCount(state, clubId);
  return count < MIN_AVAILABLE_PLAYERS || !keeper;
}

/** Poste le plus dégarni parmi les joueurs disponibles, gardien d'abord (un gardien alignable dans les quotas). */
function neededPosition(state: GameState, clubId: string): Position {
  const available = clubPlayers(state, clubId).filter(isAvailable);
  const count = (position: Position) => available.filter((player) => player.position === position).length;
  if (!alignableCount(state, clubId).keeper) return 'GK';
  const needs: [Position, number][] = [
    ['DEF', 4 - count('DEF')],
    ['MID', 4 - count('MID')],
    ['ATT', 2 - count('ATT')],
  ];
  return needs.reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}
