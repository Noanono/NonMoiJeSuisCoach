/**
 * Mini-carte du match : une mise en images du moteur, qui ne connaît que des minutes.
 * Les positions sont déduites des lignes, de l'équipe qui attaque et des actions de la minute.
 * Le coach attaque toujours vers la droite. Fonctions pures, sans Svelte.
 */
import type { MatchEvent, MatchPlayer, MatchState, Side, TeamState } from '../../domain/match';
import type { Position } from '../../domain/types';
import { hashSeed } from '../kit/avatar';

export const MAP_WIDTH = 105;
export const MAP_HEIGHT = 68;
/** Chaque minute de jeu est découpée en autant d'étapes. */
export const MAP_PHASES = 3;

const LINE_X: Record<Position, number> = { GK: 5, DEF: 24, MID: 46, ATT: 66 };
const CENTER_Y = MAP_HEIGHT / 2;
const SHOT_KINDS: ReadonlySet<MatchEvent['kind']> = new Set(['goal', 'save', 'miss', 'actionCancelled']);
/** Abscisse du ballon pendant une frappe, vers le but attaqué. */
const SHOT_RUNUP_X = [70, 88] as const;
const EDGE_MARGIN = 2;

export interface MapDot {
  id: string;
  x: number;
  y: number;
  own: boolean;
  /** Au sol ou hors jeu pour quelques minutes. */
  down: boolean;
  /** Il a le ballon dans les pieds sur l'action en cours. */
  shooter: boolean;
}

export interface MapFrame {
  dots: MapDot[];
  ball: { x: number; y: number };
  goal: boolean;
}

/** Bruit stable entre −span et +span. */
function noise(seed: string, span: number): number {
  return ((hashSeed(seed) % 1000) / 500 - 1) * span;
}

function clampX(x: number): number {
  return Math.min(MAP_WIDTH - EDGE_MARGIN, Math.max(EDGE_MARGIN, x));
}

function clampY(y: number): number {
  return Math.min(MAP_HEIGHT - EDGE_MARGIN, Math.max(EDGE_MARGIN, y));
}

/** Dernière frappe de la minute en cours. */
function currentShot(state: MatchState): MatchEvent | null {
  for (let index = state.events.length - 1; index >= 0; index--) {
    const event = state.events[index]!;
    if (event.minute !== state.minute || event.addedMinute !== state.addedMinute) return null;
    if (SHOT_KINDS.has(event.kind)) return event;
  }
  return null;
}

function otherSide(side: Side): Side {
  return side === 'home' ? 'away' : 'home';
}

interface Ball {
  x: number;
  y: number;
  attacker: Side;
}

/** Position du ballon, décrite vers la droite puis retournée si c'est l'adversaire qui attaque. */
function ballPosition(state: MatchState, coachSide: Side, phase: number, shot: MatchEvent | null): Ball {
  const seed = `${state.elapsed}-${phase}`;
  const place = (attacker: Side, x: number, y: number): Ball => ({ x: attacker === coachSide ? x : MAP_WIDTH - x, y, attacker });
  const play = state.pendingPlay;
  if (play) {
    if (play.kind === 'penalty') return place(play.side, 94, CENTER_Y);
    if (play.kind === 'corner') return place(play.side, MAP_WIDTH - EDGE_MARGIN, EDGE_MARGIN);
    return place(play.side, 78, CENTER_Y + noise(`${state.elapsed}fk`, 18));
  }
  if (shot?.side) {
    if (phase < SHOT_RUNUP_X.length) return place(shot.side, SHOT_RUNUP_X[phase]!, CENTER_Y + noise(seed, 14 - phase * 6));
    if (shot.kind === 'goal') return place(shot.side, MAP_WIDTH, CENTER_Y + noise(seed, 3));
    if (shot.kind === 'miss') return place(shot.side, MAP_WIDTH - EDGE_MARGIN, CENTER_Y + noise(seed, 8) + 20);
    return place(shot.side, 97, CENTER_Y + noise(seed, 4));
  }
  const attacker: Side = hashSeed(`poss${Math.floor(state.elapsed / 2)}`) % 2 === 0 ? 'home' : 'away';
  return place(attacker, 30 + Math.abs(noise(seed, 45)), CENTER_Y + noise(`${seed}y`, 26));
}

function dotsOf(team: TeamState, ctx: { state: MatchState; coachSide: Side; phase: number; ball: Ball; shooterId: string | null }): MapDot[] {
  const { state, coachSide, phase, ball, shooterId } = ctx;
  const own = team.side === coachSide;
  const forward = own ? 1 : -1;
  const attacking = ball.attacker === team.side;
  const playing = team.players.filter((player) => player.line !== null && !player.sentOff && !player.injured);
  return playing.map((player) => {
    const line = player.line!;
    const mates = playing.filter((candidate) => candidate.line === line);
    const baseX = own ? LINE_X[line] : MAP_WIDTH - LINE_X[line];
    const baseY = ((mates.indexOf(player) + 1) / (mates.length + 1)) * MAP_HEIGHT;
    return placeDot(player, { baseX, baseY, forward, attacking, own, state, phase, ball, shooterId });
  });
}

interface DotContext {
  baseX: number;
  baseY: number;
  forward: number;
  attacking: boolean;
  own: boolean;
  state: MatchState;
  phase: number;
  ball: Ball;
  shooterId: string | null;
}

function placeDot(player: MatchPlayer, ctx: DotContext): MapDot {
  const { baseX, baseY, forward, attacking, own, state, phase, ball, shooterId } = ctx;
  const down = player.knockedOutUntil >= state.elapsed;
  const shooter = player.id === shooterId;
  if (down) return { id: player.id, x: baseX, y: baseY, own, down, shooter: false };
  if (shooter && phase < MAP_PHASES - 1) return { id: player.id, x: clampX(ball.x - forward * 2), y: clampY(ball.y), own, down, shooter };
  const keeper = player.line === 'GK';
  const push = (attacking ? 10 : -4) * forward * (keeper ? 0.25 : 1);
  const pullX = keeper ? 0.03 : 0.12;
  const pullY = keeper ? 0.25 : 0.18;
  const seed = `${player.id}${state.elapsed}${phase}`;
  const x = baseX + push + (ball.x - baseX) * pullX + noise(seed, 2.5);
  const y = baseY + (ball.y - baseY) * pullY + noise(`${seed}y`, 2.5);
  return { id: player.id, x: clampX(x), y: clampY(y), own, down, shooter };
}

/** Image de la carte pour une étape de la minute en cours. */
export function minimapFrame(state: MatchState, coachSide: Side, phase: number): MapFrame {
  const shot = currentShot(state);
  const ball = ballPosition(state, coachSide, phase, shot);
  const ctx = { state, coachSide, phase, ball, shooterId: shot?.playerId ?? null };
  return {
    dots: [...dotsOf(state[coachSide], ctx), ...dotsOf(state[otherSide(coachSide)], ctx)],
    ball: { x: ball.x, y: ball.y },
    goal: shot?.kind === 'goal' && phase === MAP_PHASES - 1,
  };
}
