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
import type { MatchState, Side } from './types';

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
  for (const concerned of [side, opponent]) {
    if (!state.triggers[concerned]) continue;
    if (teamOf(state, concerned).isHuman) offerWindow(run, concerned);
    else aiReactToTrigger(run, concerned);
  }
}

export function clearTriggers(state: MatchState): void {
  state.triggers.home = null;
  state.triggers.away = null;
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
  if (state.awaiting || !trigger) return;
  const eligible = eligiblePlayerIds(state, side);
  const play = state.pendingPlay;
  // Sur un coup franc, le coach a toujours un choix à faire : option en attaque, mur en défense.
  const freeKick = play?.kind === 'freeKick' ? (play.side === side ? 'attack' : 'defense') : undefined;
  if (eligible.length === 0 && !freeKick) return;
  state.awaiting = { side, trigger, eligiblePlayerIds: eligible, ...(freeKick ? { freeKick } : {}) };
  pushEvent(run, 'eventWindow', side, comment(run.rng, 'eventWindow', { label: TRIGGER_LABEL[trigger] }));
}

/** Après une activation, ferme la fenêtre s'il ne reste personne à proposer. */
export function refreshWindow(state: MatchState): void {
  const window = state.awaiting;
  if (!window) return;
  window.eligiblePlayerIds = eligiblePlayerIds(state, window.side);
  const freeKickPending = window.freeKick !== undefined && state.pendingPlay?.kind === 'freeKick';
  if (window.eligiblePlayerIds.length === 0 && !freeKickPending) state.awaiting = null;
}

/** Le coach laisse passer la fenêtre (CAP-19) : rien n'est consommé. */
export function dismissEventWindow(state: MatchState): void {
  state.awaiting = null;
  state.pending = null;
}
