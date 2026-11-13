/**
 * Cellule de scouts (CLUB-10). Des joueurs des autres clubs, on voit toujours la rareté de la capacité ;
 * son nom, son effet et le potentiel du joueur se découvrent d'un coup :
 * - chaque semaine, la cellule fournit des rapports (2 à 12 selon son niveau, stockables 2 semaines) :
 *   un rapport sur un joueur révèle sa capacité et son potentiel exact ;
 * - une part des joueurs (5 à 55 %) est connue d'office, et grandit vite avec le niveau de la cellule ;
 * - les joueurs affrontés en match sont connus.
 * Chaque coach a ses propres connaissances : en multi, ce que l'un a scouté, l'autre ne le sait pas.
 */
import { facilitiesOf, facilityBonus } from '../club/facilities';
import type { Player } from '../types';
import { humanClub } from './selectors';
import type { GameState } from './state';

export interface ScoutingState {
  /** Rapports disponibles. */
  reports: number;
  /** Joueurs connus par rapport ou en match (les anciennes sauvegardes notaient 1 ou 2 : tout vaut « connu »). */
  known: Record<string, number>;
}

/** Les rapports non utilisés s'accumulent au plus sur ce nombre de semaines. */
export const REPORT_STOCK_WEEKS = 2;

export type PotentialView = { kind: 'exact'; value: number } | { kind: 'unknown' };

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

/** Le coach connaît-il ce joueur (capacité et potentiel) ? Ses propres joueurs : toujours. */
export function isScouted(state: GameState, player: Player): boolean {
  if (player.clubId === state.humanClubId) return true;
  return (scoutingOf(state).known[player.id] ?? 0) > 0 || knownByDefault(state, player.id);
}

/** Le nom et l'effet de la capacité sont-ils connus ? Toujours chez soi ; ailleurs, s'il a été scouté. */
export function abilityKnown(state: GameState, player: Player): boolean {
  return isScouted(state, player);
}

/**
 * Un coach connaît toujours les capacités de son effectif (CLUB-10) : jeunes du centre de formation,
 * dépanneurs et recrues compris. Appelée à chaque semaine et au chargement d'une partie.
 */
export function revealOwnSquads(state: GameState): void {
  for (const club of Object.values(state.clubs)) {
    if (!club.isHuman) continue;
    for (const playerId of club.playerIds) {
      const player = state.players[playerId];
      if (player && !player.ability.revealed) player.ability = { ...player.ability, revealed: true };
    }
  }
}

/** Potentiel tel que le coach le connaît : exact, ou inconnu tant qu'il n'est pas scouté. */
export function potentialView(state: GameState, player: Player): PotentialView {
  return isScouted(state, player) ? { kind: 'exact', value: player.potential } : { kind: 'unknown' };
}

/** Envoie un scout sur un joueur : sa capacité et son potentiel exact sont révélés. */
export function scoutPlayer(state: GameState, playerId: string): { ok: boolean; message: string } {
  const player = state.players[playerId];
  if (!player) return { ok: false, message: 'Joueur introuvable.' };
  if (player.clubId === state.humanClubId) return { ok: false, message: 'C’est ton joueur : tu le connais déjà par cœur.' };
  if (isScouted(state, player)) return { ok: false, message: 'Tes scouts savent déjà tout de lui, même sa pointure.' };
  const scouting = ensureScouting(state);
  if (scouting.reports <= 0) return { ok: false, message: 'Plus de rapport cette semaine : tes scouts sont au PMU.' };
  scouting.reports -= 1;
  scouting.known = { ...scouting.known, [playerId]: 1 };
  return { ok: true, message: `Rapport sur ${player.firstName} ${player.lastName} : capacité et potentiel notés au carnet.` };
}

/** Nouvelle semaine : la cellule rend ses rapports (dans la limite du stock). */
export function refillScoutReports(state: GameState): void {
  const scouting = ensureScouting(state);
  const weekly = weeklyReports(state);
  scouting.reports = Math.min(weekly * REPORT_STOCK_WEEKS, scouting.reports + weekly);
}

/** Un adversaire affronté en match : tous ses joueurs sont connus. */
export function scoutOpponents(state: GameState, clubId: string): void {
  const club = state.clubs[clubId];
  if (!club || clubId === state.humanClubId) return;
  const scouting = ensureScouting(state);
  const known = { ...scouting.known };
  for (const playerId of club.playerIds) known[playerId] = 1;
  scouting.known = known;
}
