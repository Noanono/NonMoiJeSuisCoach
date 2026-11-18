/**
 * Tirs au but en direct (UNIV-06, TAB-01) : dès qu'un coach humain joue, la séance se joue tir par tir.
 * Chaque coach fixe l'ordre de ses tireurs, puis choisit la frappe de son tireur ou le plongeon de son
 * gardien à chaque penalty, exactement comme en match (mêmes chances, mêmes capacités de penalty).
 * L'IA décide seule. 5 tirs chacun, arrêt dès qu'une équipe ne peut plus être rattrapée, puis mort subite.
 */
import { closeMatch } from './clock';
import { comment } from './commentary';
import { beginRun, endRun, isActive, opponentSide, pushEvent, teamOf, type Run } from './state';
import { shootingValue } from './strength';
import type { EventWindow, LiveShootout, MatchState, ShootoutKick, Side, TeamState } from './types';
import { openTriggers } from './windows';

export const SHOOTOUT_ROUNDS = 5;
/** Au-delà (20 tours de mort subite), une pièce départage : ça n'arrive jamais vraiment. */
const MAX_KICKS = 2 * (SHOOTOUT_ROUNDS + 20);

/** Tireurs possibles : les joueurs encore sur le terrain et en état de tirer. */
export function shootoutTakers(state: MatchState, team: TeamState): string[] {
  return team.players.filter((player) => player.line !== null && isActive(player, state.elapsed)).map((player) => player.id);
}

/** Ordre proposé (et celui de l'IA) : les meilleurs tireurs d'abord, le gardien en dernier. */
export function defaultShootoutOrder(state: MatchState, team: TeamState): string[] {
  const ids = new Set(shootoutTakers(state, team));
  return team.players
    .filter((player) => ids.has(player.id))
    .sort((a, b) => Number(a.line === 'GK') - Number(b.line === 'GK') || shootingValue(b) - shootingValue(a))
    .map((player) => player.id);
}

/** Fenêtre « ordre des tireurs » d'un coach humain. */
function orderWindow(side: Side): EventWindow {
  return { side, trigger: 'ownPenalty', eligiblePlayerIds: [], shootoutOrder: true };
}

/** Fin du temps réglementaire à égalité en coupe : la séance commence (pile ou face pour le premier tireur). */
export function startLiveShootout(run: Run): void {
  const { state, rng } = run;
  const first: Side = rng.chance(0.5) ? 'home' : 'away';
  const ordering = (['home', 'away'] as const).filter((side) => teamOf(state, side).isHuman);
  state.status = 'shootout';
  state.awaiting = null;
  state.pending = null;
  state.pendingPlay = null;
  state.liveShootout = {
    first,
    order: { home: defaultShootoutOrder(state, state.home), away: defaultShootoutOrder(state, state.away) },
    ordering: [...ordering],
    kicks: [],
  };
  pushEvent(run, 'shootout', first, comment(rng, 'shootoutStart', { team: teamOf(state, first).name }));
  if (ordering.length > 0) state.awaiting = orderWindow(ordering[0]!);
  else prepareNextKick(run);
}

/**
 * Le coach valide l'ordre de ses tireurs (`null` : l'ordre proposé). Rend faux si ce n'est pas le moment
 * ou si la liste n'est pas exactement celle de ses tireurs possibles.
 */
export function setShootoutOrder(state: MatchState, side: Side, ids: readonly string[] | null): boolean {
  const shootout = state.liveShootout;
  if (state.status !== 'shootout' || !shootout || !shootout.ordering.includes(side)) return false;
  if (ids) {
    const valid = shootoutTakers(state, teamOf(state, side));
    if (ids.length !== valid.length || new Set(ids).size !== ids.length || !ids.every((id) => valid.includes(id))) return false;
    shootout.order[side] = [...ids];
  }
  shootout.ordering = shootout.ordering.filter((other) => other !== side);
  state.awaiting = null;
  if (shootout.ordering.length > 0) {
    state.awaiting = orderWindow(shootout.ordering[0]!);
    return true;
  }
  const run = beginRun(state);
  prepareNextKick(run);
  endRun(run);
  return true;
}

/** Camp qui tire le prochain penalty, et son tireur. */
export function nextShootoutKicker(shootout: LiveShootout): { side: Side; playerId: string } {
  const side = shootout.kicks.length % 2 === 0 ? shootout.first : opponentSide(shootout.first);
  const taken = shootout.kicks.filter((kick) => kick.side === side).length;
  const order = shootout.order[side];
  return { side, playerId: order[taken % Math.max(1, order.length)] ?? '' };
}

/** Pose le prochain penalty : la fenêtre s'ouvre pour le tireur (frappe) et pour le gardien (plongeon). */
export function prepareNextKick(run: Run): void {
  const { state } = run;
  const shootout = state.liveShootout;
  if (!shootout) return;
  const { side, playerId } = nextShootoutKicker(shootout);
  state.pendingPlay = { kind: 'penalty', side, takerId: playerId || null };
  openTriggers(run, side, 'ownPenalty', 'opponentPenalty');
}

/** Score de la séance, domicile puis extérieur. */
export function shootoutScore(shootout: Pick<LiveShootout, 'kicks'>): Record<Side, number> {
  const score = { home: 0, away: 0 };
  for (const kick of shootout.kicks) if (kick.scored) score[kick.side]++;
  return score;
}

/** Vainqueur s'il est connu : plus rattrapable sur les 5 tirs, ou devant à tirs égaux en mort subite. */
export function shootoutWinner(shootout: LiveShootout): Side | null {
  const first = shootout.first;
  const second = opponentSide(first);
  const score = shootoutScore(shootout);
  const taken = { home: 0, away: 0 };
  for (const kick of shootout.kicks) taken[kick.side]++;
  if (taken[first] <= SHOOTOUT_ROUNDS && taken[second] <= SHOOTOUT_ROUNDS) {
    if (score[first] + SHOOTOUT_ROUNDS - taken[first] < score[second]) return second;
    if (score[second] + SHOOTOUT_ROUNDS - taken[second] < score[first]) return first;
    return null;
  }
  if (taken[first] === taken[second] && score[first] !== score[second]) return score[first] > score[second] ? first : second;
  return null;
}

/** Un penalty de la séance vient d'être tiré : on le note, puis on passe au suivant ou on termine. */
export function recordShootoutKick(run: Run, kick: ShootoutKick): void {
  const { state, rng } = run;
  const shootout = state.liveShootout;
  if (!shootout) return;
  shootout.kicks.push(kick);
  const score = shootoutScore(shootout);
  const team = teamOf(state, kick.side);
  const player = team.players.find((candidate) => candidate.id === kick.playerId)?.name ?? '';
  pushEvent(run, 'shootout', kick.side, comment(rng, kick.scored ? 'shootoutGoal' : 'shootoutMiss', { player, team: team.name, score: `${score.home}-${score.away}` }), {
    playerId: kick.playerId,
    score: [score.home, score.away],
    label: kick.scored ? 'goal' : 'miss',
  });
  let winner = shootoutWinner(shootout);
  if (!winner && shootout.kicks.length >= MAX_KICKS) winner = rng.chance(0.5) ? 'home' : 'away';
  if (!winner) {
    prepareNextKick(run);
    return;
  }
  finishShootout(run, winner);
}

function finishShootout(run: Run, winner: Side): void {
  const { state, rng } = run;
  const shootout = state.liveShootout!;
  const score = shootoutScore(shootout);
  // Départage à pile ou face (20 tours de mort subite) : le gagnant prend un tir d'avance.
  if (score[winner] <= score[opponentSide(winner)]) score[winner] = score[opponentSide(winner)] + 1;
  state.shootout = { home: score.home, away: score.away, winner, kicks: shootout.kicks.map((kick) => ({ ...kick })) };
  pushEvent(run, 'shootout', winner, comment(rng, 'shootout', { team: teamOf(state, winner).name, score: `${score.home}-${score.away}` }));
  closeMatch(run);
}
