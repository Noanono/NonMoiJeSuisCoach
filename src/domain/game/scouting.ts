/**
 * Cellule de scouts (CLUB-10). Des joueurs des autres clubs, on voit toujours la rareté de la capacité ;
 * son nom, son effet et le potentiel du joueur se découvrent :
 * - chaque semaine, la cellule fournit des rapports (2 à 12 selon son niveau, stockables 2 semaines) :
 *   un 1er rapport révèle la capacité et donne le potentiel dans une plage, un 2e donne le potentiel exact ;
 * - une part des joueurs (5 à 30 %) est connue d'office, comme avec un 1er rapport ;
 * - les joueurs affrontés en match sont connus, comme avec un 1er rapport.
 * Chaque coach a ses propres connaissances : en multi, ce que l'un a scouté, l'autre ne le sait pas.
 */
import { facilitiesOf, facilityBonus } from '../club/facilities';
import { overall } from '../player/rating';
import type { Player } from '../types';
import { humanClub } from './selectors';
import type { GameState } from './state';

export interface ScoutingState {
  /** Rapports disponibles. */
  reports: number;
  /** Ce qui a été appris par rapport ou en match : 1 = capacité + plage de potentiel, 2 = potentiel exact. */
  known: Record<string, 1 | 2>;
}

/** Les rapports non utilisés s'accumulent au plus sur ce nombre de semaines. */
export const REPORT_STOCK_WEEKS = 2;

export type Knowledge = 0 | 1 | 2;

export type PotentialView = { kind: 'exact'; value: number } | { kind: 'range'; min: number; max: number } | { kind: 'unknown' };

function scoutingBonus(state: GameState) {
  return facilityBonus.scouting(facilitiesOf(humanClub(state)));
}

/** État de la cellule du coach au focus (par défaut pour une ancienne sauvegarde : un plein de rapports). */
export function scoutingOf(state: GameState): ScoutingState {
  return state.scouting ?? { reports: scoutingBonus(state).weeklyReports, known: {} };
}

function ensureScouting(state: GameState): ScoutingState {
  state.scouting ??= scoutingOf(state);
  return state.scouting;
}

export function weeklyReports(state: GameState): number {
  return scoutingBonus(state).weeklyReports;
}

/** Nombre déterministe dans [0, 1[ : même joueur, même coach, même tirage, d'une semaine à l'autre. */
function hashUnit(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 2 ** 32;
}

/** Joueur connu d'office : une part fixe des joueurs du monde, qui grandit avec le niveau de la cellule. */
function knownByDefault(state: GameState, playerId: string): boolean {
  return hashUnit(`${state.focusedCoachId ?? 'solo'}:${playerId}`) < scoutingBonus(state).autoShare;
}

/** Ce que le coach sait d'un joueur. Ses propres joueurs : tout. */
export function knowledgeOf(state: GameState, player: Player): Knowledge {
  if (player.clubId === state.humanClubId) return 2;
  const learned = scoutingOf(state).known[player.id] ?? 0;
  return learned > 0 ? learned : knownByDefault(state, player.id) ? 1 : 0;
}

/** Le nom et l'effet de la capacité sont-ils connus ? Chez soi, la règle de la capacité cachée (CAP-13) s'applique. */
export function abilityKnown(state: GameState, player: Player): boolean {
  if (player.clubId === state.humanClubId) return player.ability.revealed;
  return knowledgeOf(state, player) >= 1;
}

/**
 * Potentiel tel que le coach le connaît. La plage contient le vrai potentiel, sans être centrée dessus
 * (sinon son milieu le trahirait) ; elle se resserre avec le niveau de la cellule.
 */
export function potentialView(state: GameState, player: Player): PotentialView {
  const knowledge = knowledgeOf(state, player);
  if (knowledge === 2) return { kind: 'exact', value: player.potential };
  if (knowledge === 0) return { kind: 'unknown' };
  const half = scoutingBonus(state).rangeHalfWidth;
  const below = Math.round(hashUnit(`potentiel:${player.id}`) * 2 * half);
  const min = Math.max(overall(player), player.potential - below);
  const max = Math.min(99, player.potential + (2 * half - below));
  return { kind: 'range', min, max };
}

/** Envoie un scout sur un joueur : un rapport de plus sur lui (capacité et plage, puis potentiel exact). */
export function scoutPlayer(state: GameState, playerId: string): { ok: boolean; message: string } {
  const player = state.players[playerId];
  if (!player) return { ok: false, message: 'Joueur introuvable.' };
  if (player.clubId === state.humanClubId) return { ok: false, message: 'C’est ton joueur : tu le connais déjà par cœur.' };
  const knowledge = knowledgeOf(state, player);
  if (knowledge === 2) return { ok: false, message: 'Tes scouts savent déjà tout de lui, même sa pointure.' };
  const scouting = ensureScouting(state);
  if (scouting.reports <= 0) return { ok: false, message: 'Plus de rapport cette semaine : tes scouts sont au PMU.' };
  scouting.reports -= 1;
  scouting.known = { ...scouting.known, [playerId]: (knowledge + 1) as 1 | 2 };
  const name = `${player.firstName} ${player.lastName}`;
  return {
    ok: true,
    message: knowledge === 0 ? `Rapport sur ${name} : capacité découverte, potentiel estimé.` : `Rapport complet sur ${name} : potentiel exact noté au carnet.`,
  };
}

/** Nouvelle semaine : la cellule rend ses rapports (dans la limite du stock). */
export function refillScoutReports(state: GameState): void {
  const scouting = ensureScouting(state);
  const weekly = weeklyReports(state);
  scouting.reports = Math.min(weekly * REPORT_STOCK_WEEKS, scouting.reports + weekly);
}

/** Un adversaire affronté en match : ses joueurs sont connus comme après un 1er rapport. */
export function scoutOpponents(state: GameState, clubId: string): void {
  const club = state.clubs[clubId];
  if (!club || clubId === state.humanClubId) return;
  const scouting = ensureScouting(state);
  const known = { ...scouting.known };
  for (const playerId of club.playerIds) known[playerId] = Math.max(known[playerId] ?? 0, 1) as 1 | 2;
  scouting.known = known;
}
