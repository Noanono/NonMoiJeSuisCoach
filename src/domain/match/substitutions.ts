/**
 * Remplacements en match (MATCH-08) : 5 par équipe, un joueur sorti ne revient pas.
 * Un blessé ou un joueur au sol peut être remplacé, pas un exclu.
 */
import { beginRun, endRun, findPlayer, pushEvent, refreshRating, teamOf, type Run } from './state';
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
