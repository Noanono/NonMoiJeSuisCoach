/**
 * Remplacements en match (MATCH-08) : 5 par équipe, un joueur sorti ne revient pas.
 * Un blessé ou un joueur au sol peut être remplacé, pas un exclu.
 */
import { beginRun, endRun, findPlayer, pushEvent, refreshRating, teamOf, type Run } from './state';
import type { Position } from '../types';
import type { MatchEvent, MatchPlayer, MatchState, Side, TeamState } from './types';
import { refreshWindow } from './windows';

export const MAX_SUBSTITUTIONS = 5;

/** Peut entrer : sur le banc, jamais sorti, ni blessé ni exclu. */
export function canEnter(player: MatchPlayer): boolean {
  return player.line === null && !player.subbedOff && !player.sentOff && !player.injured;
}

/** Peut sortir : sur le terrain et pas exclu. */
export function canLeave(player: MatchPlayer): boolean {
  return player.line !== null && !player.sentOff;
}

export function substitutionsLeft(team: TeamState): number {
  return MAX_SUBSTITUTIONS - team.substitutionsUsed;
}

/** Remplace `leaving` par `entering`. Les deux ont été vérifiés. Mute l'état. */
export function performSubstitution(run: Run, team: TeamState, leaving: MatchPlayer, entering: MatchPlayer): void {
  // Les titulaires restent en tête de liste : la simulation tire ses joueurs parmi les 11 premiers.
  const leavingIndex = team.players.indexOf(leaving);
  const enteringIndex = team.players.indexOf(entering);
  team.players[leavingIndex] = entering;
  team.players[enteringIndex] = leaving;
  entering.line = leaving.line;
  entering.hasPlayed = true;
  leaving.line = null;
  leaving.subbedOff = true;
  team.substitutionsUsed++;
  refreshRating(entering);
  pushEvent(run, 'substitution', team.side, `${entering.name} remplace ${leaving.name}.`, { playerId: entering.id });
}

/** Remplacement demandé par le coach. Rend `false` s'il est impossible. */
export function substitutePlayer(state: MatchState, side: Side, leavingId: string, enteringId: string): MatchEvent[] | false {
  const team = teamOf(state, side);
  const leaving = findPlayer(state, leavingId);
  const entering = findPlayer(state, enteringId);
  if (state.status === 'finished' || state.pending !== null || substitutionsLeft(team) <= 0) return false;
  if (!leaving || !entering || leaving.side !== side || entering.side !== side) return false;
  if (!canLeave(leaving) || !canEnter(entering)) return false;
  const run = beginRun(state);
  performSubstitution(run, team, leaving, entering);
  refreshWindow(state);
  return endRun(run);
}

/** L'IA remplace ses blessés, par un joueur du même poste si elle en a un. */
export function aiReplaceInjured(run: Run, team: TeamState): void {
  const injured = team.players.find((player) => player.line !== null && player.injured);
  if (!injured || substitutionsLeft(team) <= 0) return;
  const bench = team.players.filter(canEnter);
  const entering = bench.find((player) => player.profile.position === injured.line) ?? bench[0];
  if (entering) performSubstitution(run, team, injured, entering);
}

// --- Changements de poste en match -----------------------------------------

/** Joueurs au plus par ligne de champ, et au moins un par ligne. */
export const MAX_PER_LINE = 6;
const MIN_PER_LINE = 1;

/** Peut changer de poste : sur le terrain, ni exclu ni blessé. */
export function canReposition(player: MatchPlayer): boolean {
  return player.line !== null && !player.sentOff && !player.injured;
}

function editable(state: MatchState): boolean {
  return state.status !== 'finished' && state.pending === null;
}

function lineCount(team: TeamState, line: Position): number {
  return team.players.filter((player) => player.line === line && !player.sentOff).length;
}

const LINE_NAME: Record<Position, string> = { GK: 'au but', DEF: 'en défense', MID: 'au milieu', ATT: 'en attaque' };

/** Deux titulaires échangent leur poste ; ne compte pas comme un changement. */
export function canSwapPositions(state: MatchState, side: Side, firstId: string, secondId: string): boolean {
  const first = findPlayer(state, firstId);
  const second = findPlayer(state, secondId);
  if (!editable(state) || !first || !second || first === second) return false;
  if (first.side !== side || second.side !== side) return false;
  return canReposition(first) && canReposition(second) && first.line !== second.line;
}

export function swapPositions(state: MatchState, side: Side, firstId: string, secondId: string): MatchEvent[] | false {
  if (!canSwapPositions(state, side, firstId, secondId)) return false;
  const first = findPlayer(state, firstId)!;
  const second = findPlayer(state, secondId)!;
  const run = beginRun(state);
  [first.line, second.line] = [second.line, first.line];
  refreshRating(first);
  refreshRating(second);
  pushEvent(run, 'substitution', side, `${first.name} passe ${LINE_NAME[first.line!]}, ${second.name} ${LINE_NAME[second.line!]}.`, { playerId: first.id });
  refreshWindow(state);
  return endRun(run);
}

/**
 * Un joueur de champ change de ligne : la formation change (4-4-2 → 4-3-3…). Le poste de gardien
 * ne s'échange qu'avec `swapPositions`, et chaque ligne garde au moins un joueur.
 */
export function canMoveToLine(state: MatchState, side: Side, playerId: string, line: Position): boolean {
  const player = findPlayer(state, playerId);
  if (!editable(state) || !player || player.side !== side || !canReposition(player)) return false;
  if (line === 'GK' || player.line === 'GK' || player.line === line) return false;
  const team = teamOf(state, side);
  return lineCount(team, player.line!) > MIN_PER_LINE && lineCount(team, line) < MAX_PER_LINE;
}

export function moveToLine(state: MatchState, side: Side, playerId: string, line: Position): MatchEvent[] | false {
  if (!canMoveToLine(state, side, playerId, line)) return false;
  const player = findPlayer(state, playerId)!;
  const run = beginRun(state);
  player.line = line;
  refreshRating(player);
  pushEvent(run, 'substitution', side, `${player.name} passe ${LINE_NAME[line]}.`, { playerId: player.id });
  refreshWindow(state);
  return endRun(run);
}
