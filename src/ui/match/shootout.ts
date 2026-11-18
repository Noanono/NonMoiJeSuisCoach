/**
 * Tirs au but en direct (TAB-01) : présentation pure de la séance (pastilles, dernier tir).
 */
import { SHOOTOUT_ROUNDS, type KeeperDive, type MatchState, type PenaltyStyle, type ShootoutKick, type Side } from '../../domain/match';

export type ShootoutMark = 'goal' | 'miss' | 'next' | 'todo';

export interface ShootoutRow {
  side: Side;
  name: string;
  score: number;
  marks: ShootoutMark[];
}

/** Ce que le dernier tir a donné à l'image : but, arrêt du gardien ou ballon à côté. */
export type KickOutcome = 'goal' | 'saved' | 'wide';

export interface KickView {
  /** Numéro du tir dans la séance, pour rejouer l'animation à chaque nouveau tir. */
  index: number;
  side: Side;
  playerName: string;
  style: PenaltyStyle;
  aim: KeeperDive;
  dive: KeeperDive;
  outcome: KickOutcome;
}

export function kickOutcome(kick: Pick<ShootoutKick, 'scored' | 'aim' | 'dive'>): KickOutcome {
  if (kick.scored) return 'goal';
  return kick.dive === kick.aim ? 'saved' : 'wide';
}

/** Séance en cours ou terminée (tir par tir), `null` s'il n'y en a pas eu. */
function kicksOf(match: MatchState): { kicks: ShootoutKick[]; first: Side; next: Side | null } | null {
  const live = match.liveShootout;
  if (!live) return null;
  const next = match.status === 'shootout' && live.ordering.length === 0 ? (live.kicks.length % 2 === 0 ? live.first : live.first === 'home' ? 'away' : 'home') : null;
  return { kicks: live.kicks, first: live.first, next };
}

/** Deux lignes de pastilles, celle du coach d'abord ; 5 cases, plus en mort subite. */
export function shootoutRows(match: MatchState, coachSide: Side): ShootoutRow[] | null {
  const data = kicksOf(match);
  if (!data) return null;
  const count = (side: Side) => data.kicks.filter((kick) => kick.side === side).length + (data.next === side ? 1 : 0);
  const length = Math.max(SHOOTOUT_ROUNDS, count('home'), count('away'));
  const sides: Side[] = coachSide === 'home' ? ['home', 'away'] : ['away', 'home'];
  return sides.map((side) => {
    const own = data.kicks.filter((kick) => kick.side === side);
    const marks: ShootoutMark[] = own.map((kick) => (kick.scored ? 'goal' : 'miss'));
    if (data.next === side) marks.push('next');
    while (marks.length < length) marks.push('todo');
    return { side, name: match[side].name, score: own.filter((kick) => kick.scored).length, marks };
  });
}

/** Mort subite : au-delà des 5 tirs chacun. */
export function inSuddenDeath(match: MatchState): boolean {
  const kicks = match.liveShootout?.kicks.length ?? 0;
  return kicks >= 2 * SHOOTOUT_ROUNDS;
}

export function lastKick(match: MatchState): KickView | null {
  const kicks = match.liveShootout?.kicks ?? [];
  const kick = kicks.at(-1);
  if (!kick) return null;
  const player = match[kick.side].players.find((candidate) => candidate.id === kick.playerId);
  return { index: kicks.length, side: kick.side, playerName: player?.name ?? '', style: kick.style, aim: kick.aim, dive: kick.dive, outcome: kickOutcome(kick) };
}
