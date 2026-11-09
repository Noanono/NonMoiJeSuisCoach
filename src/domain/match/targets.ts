/**
 * Ciblage des capacités (CAP-16 à CAP-18) : cibles valides selon la portée,
 * et joueurs concernés par chaque périmètre d'effet.
 */
import type { Position, Scope } from '../types';
import { isActive, isOnPitch, keeperOf, opponentSide, teamOf, zoneOf } from './state';
import type { MatchPlayer, MatchState, PreparedAbility } from './types';

/** Ligne adverse en vis-à-vis (CAP-17). */
const FACING: Record<Position, Position> = { GK: 'ATT', DEF: 'ATT', MID: 'MID', ATT: 'DEF' };

/** Nombre de cibles que le coach choisit lui-même (0 = aucune). */
export function chosenTargetCount(ability: PreparedAbility): number {
  const { kind, count } = ability.targeting;
  return kind === 'teammate' || kind === 'opponent' ? (count ?? 1) : 0;
}

/**
 * Cibles valides (CAP-17) : sur le terrain, pas hors jeu ni exclues, dans la portée.
 * Un porteur sur le banc n'a pas de position : toute cible du bon camp est à portée.
 */
export function validTargets(state: MatchState, source: MatchPlayer, ability: PreparedAbility): MatchPlayer[] {
  const { kind, range = 'any' } = ability.targeting;
  if (kind !== 'teammate' && kind !== 'opponent' && kind !== 'randomOpponent') return [];
  const pool = kind === 'teammate' ? teamOf(state, source.side) : teamOf(state, opponentSide(source.side));
  return pool.players.filter(
    (candidate) =>
      candidate !== source &&
      candidate.line !== null &&
      isActive(candidate, state.elapsed) &&
      inRange(source, candidate, range),
  );
}

function inRange(source: MatchPlayer, candidate: MatchPlayer, range: 'facing' | 'near' | 'any'): boolean {
  if (range === 'any' || source.line === null) return true;
  if (range === 'facing' && candidate.side !== source.side) return candidate.line === FACING[source.line];
  return zoneOf(candidate) === zoneOf(source);
}

export interface ScopeContext {
  state: MatchState;
  source: MatchPlayer;
  /** Joueurs désignés par « self » : le porteur, ou les deux porteurs d'un combo. */
  participants: MatchPlayer[];
  targets: MatchPlayer[];
}

/** Joueurs concernés par un périmètre d'effet, une fois les cibles résolues. */
export function resolveScope(context: ScopeContext, scope: Scope): MatchPlayer[] {
  const { state, source } = context;
  const own = teamOf(state, source.side);
  const opponents = teamOf(state, opponentSide(source.side));
  switch (scope) {
    case 'self':
      return context.participants;
    case 'targets':
      return context.targets.length > 0 ? context.targets : context.participants;
    case 'team':
      return own.players.filter(isOnPitch);
    case 'opponents':
      return opponents.players.filter(isOnPitch);
    case 'zoneAll':
      return inZone(state, source, true);
    case 'zoneOpponents':
      return inZone(state, source, false);
    case 'ownKeeper':
      return onPitchOrNone(keeperOf(own));
    case 'opponentKeeper':
      return onPitchOrNone(keeperOf(opponents));
    case 'opponentCaptain': {
      const captain = opponents.players.find((player) => player.id === opponents.captainId);
      const fallback = opponents.players.find(isOnPitch);
      return onPitchOrNone(captain && isOnPitch(captain) ? captain : fallback);
    }
  }
}

/** Effet de zone (CAP-18) : joueurs dans la zone du porteur, adversaires seuls ou tout le monde. */
function inZone(state: MatchState, source: MatchPlayer, includeTeammates: boolean): MatchPlayer[] {
  const zone = zoneOf(source);
  const result: MatchPlayer[] = [];
  for (const team of [state.home, state.away]) {
    if (!includeTeammates && team.side === source.side) continue;
    for (const player of team.players) {
      if (player === source || !isOnPitch(player)) continue;
      if (zone === null || zoneOf(player) === zone) result.push(player);
    }
  }
  return zone === null ? result.filter((player) => player.side !== source.side) : result;
}

function onPitchOrNone(player: MatchPlayer | undefined): MatchPlayer[] {
  return player && isOnPitch(player) ? [player] : [];
}
