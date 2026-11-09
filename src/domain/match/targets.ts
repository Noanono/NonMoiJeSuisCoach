/**
 * Ciblage des capacités (CAP-16 à CAP-18) : cibles valides,
 * et joueurs concernés par chaque périmètre d'effet.
 */
import type { Scope } from '../types';
import { isActive, isOnPitch, opponentSide, teamOf, zoneOf } from './state';
import type { MatchPlayer, MatchState, PreparedAbility } from './types';

/** Nombre de cibles que le coach choisit lui-même (0 = aucune). */
export function chosenTargetCount(ability: PreparedAbility): number {
  const { kind, count } = ability.targeting;
  return kind === 'teammate' || kind === 'opponent' ? (count ?? 1) : 0;
}

/** Cibles valides (CAP-17) : sur le terrain, du bon camp et de la bonne ligne, debout (ou au sol pour le kiné). */
export function validTargets(state: MatchState, source: MatchPlayer, ability: PreparedAbility): MatchPlayer[] {
  const { kind, line, downed } = ability.targeting;
  if (kind !== 'teammate' && kind !== 'opponent' && kind !== 'randomOpponent') return [];
  const pool = kind === 'teammate' ? teamOf(state, source.side) : teamOf(state, opponentSide(source.side));
  return pool.players.filter(
    (candidate) =>
      candidate !== source &&
      candidate.line !== null &&
      (line === undefined || candidate.line === line) &&
      (downed ? isOnPitch(candidate) && !isActive(candidate, state.elapsed) : isActive(candidate, state.elapsed)),
  );
}

export interface ScopeContext {
  state: MatchState;
  source: MatchPlayer;
  targets: MatchPlayer[];
}

/** Joueurs concernés par un périmètre d'effet, une fois les cibles résolues. */
export function resolveScope(context: ScopeContext, scope: Scope): MatchPlayer[] {
  const { state, source } = context;
  const own = teamOf(state, source.side);
  const opponents = teamOf(state, opponentSide(source.side));
  switch (scope) {
    case 'self':
      return [source];
    case 'targets':
      return context.targets.length > 0 ? context.targets : [source];
    case 'team':
      return own.players.filter(isOnPitch);
    case 'opponents':
      return opponents.players.filter(isOnPitch);
    case 'zoneOpponents':
      return inZone(state, source);
  }
}

/** Effet de zone (CAP-18) : adversaires dans la zone du porteur. */
function inZone(state: MatchState, source: MatchPlayer): MatchPlayer[] {
  const zone = zoneOf(source);
  return teamOf(state, opponentSide(source.side)).players.filter(
    (player) => isOnPitch(player) && (zone === null || zoneOf(player) === zone),
  );
}
