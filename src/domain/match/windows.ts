/**
 * Fenêtres d'événement (CAP-19) : après un but, sur coup de pied arrêté ou penalty,
 * à la mi-temps. Le camp humain qui a une capacité disponible voit le match se mettre
 * en pause ; l'IA décide seule, tout de suite.
 */
import type { AbilityTrigger } from '../types';
import { checkAvailability } from './activation';
import { aiReactToTrigger } from './ai';
import { comment, TRIGGER_LABEL } from './commentary';
import { opponentSide, pushEvent, teamOf, type Run } from './state';
import type { EventWindow, MatchState, Side } from './types';

/** Ouvre un déclencheur pour chaque camp concerné par l'événement. */
export function openTriggers(
  run: Run,
  side: Side,
  ownTrigger: AbilityTrigger,
  opponentTrigger: AbilityTrigger | null,
): void {
  const { state } = run;
  const opponent = opponentSide(side);
  state.triggers[side] = ownTrigger;
  state.triggers[opponent] = opponentTrigger;
  // Nouvelle occasion : chaque camp a de nouveau droit à une capacité d'occasion.
  state.home.occasionAbilityUsed = false;
  state.away.occasionAbilityUsed = false;
  for (const concerned of [side, opponent]) {
    if (!state.triggers[concerned]) continue;
    if (teamOf(state, concerned).isHuman) offerWindow(run, concerned);
    else aiReactToTrigger(run, concerned);
  }
}

/** Déclencheurs d'une occasion de but (penalty, coup franc, corner) : une seule capacité par camp. */
const OCCASION_TRIGGERS: ReadonlySet<AbilityTrigger> = new Set<AbilityTrigger>(['ownPenalty', 'opponentPenalty', 'ownSetPiece', 'opponentSetPiece', 'ownFreeKick', 'opponentFreeKick']);

export function isOccasion(trigger: AbilityTrigger | null): boolean {
  return trigger !== null && OCCASION_TRIGGERS.has(trigger);
}

export function clearTriggers(state: MatchState): void {
  state.triggers.home = null;
  state.triggers.away = null;
  delete state.windowQueue;
}

/**
 * La capacité répond-elle au déclencheur ouvert ? `ownDeadBall` vaut pour penalty et coup de pied arrêté ;
 * un coup franc est aussi un coup de pied arrêté (les corners n'ouvrent que `ownSetPiece`).
 */
export function triggerIsOpen(ability: AbilityTrigger, open: AbilityTrigger | null): boolean {
  if (ability === 'ownDeadBall') return open === 'ownSetPiece' || open === 'ownFreeKick' || open === 'ownPenalty';
  if (ability === 'ownSetPiece') return open === 'ownSetPiece' || open === 'ownFreeKick';
  if (ability === 'opponentSetPiece') return open === 'opponentSetPiece' || open === 'opponentFreeKick';
  return ability === open;
}

/** Joueurs du camp dont la capacité répond au déclencheur ouvert et est disponible. */
export function eligiblePlayerIds(state: MatchState, side: Side): string[] {
  const trigger = state.triggers[side];
  if (!trigger) return [];
  return teamOf(state, side)
    .players.filter((player) => player.ability && player.ability.trigger !== 'anytime' && triggerIsOpen(player.ability.trigger, trigger) && checkAvailability(state, side, player) === null)
    .map((player) => player.id);
}

function offerWindow(run: Run, side: Side): void {
  const { state } = run;
  const trigger = state.triggers[side];
  if (!trigger) return;
  if (state.awaiting) {
    // Deux coachs humains : l'autre camp choisira juste après (MULTI-07).
    if (state.awaiting.side !== side && !(state.windowQueue ?? []).includes(side)) state.windowQueue = [...(state.windowQueue ?? []), side];
    return;
  }
  const window = buildWindow(state, side);
  if (!window) return;
  state.awaiting = window;
  pushEvent(run, 'eventWindow', side, comment(run.rng, 'eventWindow', { label: TRIGGER_LABEL[window.trigger] }));
}

/** Fenêtre d'un camp : capacités disponibles, et choix du coup franc ou du penalty ; rien (null) s'il n'a rien à décider. */
function buildWindow(state: MatchState, side: Side): EventWindow | null {
  const trigger = state.triggers[side];
  if (!trigger) return null;
  const eligible = eligiblePlayerIds(state, side);
  const play = state.pendingPlay;
  // Sur un coup franc, le coach a toujours un choix à faire : option en attaque, mur en défense.
  const role = play && play.side === side ? 'attack' : 'defense';
  const freeKick = play?.kind === 'freeKick' ? role : undefined;
  // Sur un penalty aussi : la frappe pour le tireur, le plongeon pour le gardien.
  const penalty = play?.kind === 'penalty' ? role : undefined;
  if (eligible.length === 0 && !freeKick && !penalty) return null;
  return { side, trigger, eligiblePlayerIds: eligible, ...(freeKick ? { freeKick } : {}), ...(penalty ? { penalty } : {}) };
}

/** Ouvre la fenêtre du camp suivant dans la file, s'il a encore quelque chose à décider. */
function openQueuedWindow(state: MatchState): void {
  while (!state.awaiting && state.windowQueue && state.windowQueue.length > 0) {
    const side = state.windowQueue.shift()!;
    state.awaiting = buildWindow(state, side);
  }
}

/** Après une activation, ferme la fenêtre s'il ne reste personne à proposer. */
export function refreshWindow(state: MatchState): void {
  const window = state.awaiting;
  if (!window) return;
  window.eligiblePlayerIds = eligiblePlayerIds(state, window.side);
  const freeKickPending = window.freeKick !== undefined && state.pendingPlay?.kind === 'freeKick';
  const penaltyPending = window.penalty !== undefined && state.pendingPlay?.kind === 'penalty';
  if (window.eligiblePlayerIds.length === 0 && !freeKickPending && !penaltyPending) {
    state.awaiting = null;
    openQueuedWindow(state);
  }
}

/** Le coach laisse passer la fenêtre (CAP-19) : rien n'est consommé. */
export function dismissEventWindow(state: MatchState): void {
  state.awaiting = null;
  state.pending = null;
  openQueuedWindow(state);
}
