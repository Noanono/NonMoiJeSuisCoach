/**
 * Boucle du match minute par minute (MATCH-01, MATCH-02). Le moteur n'a pas de timer :
 * l'UI appelle `tick` au rythme choisi (×1, ×2, ×4) et s'arrête quand le match attend.
 */
import type { Instructions } from '../types';
import { addGauge, expireEffects } from './actions';
import { aiTakeTurn } from './ai';
import { advanceClock, startSecondHalf } from './clock';
import { comment } from './commentary';
import { playChances, playFouls, resolvePendingPlay, rollInjury } from './plays';
import { beginRun, endRun, isOnPitch, pushEvent, refreshRating, teamOf, type Run } from './state';
import { createStrength, measureTeam } from './strength';
import type { MatchEvent, MatchState, Side, TeamState } from './types';
import { clearTriggers } from './windows';

/** Recharge de la Jauge de Gueulante : +1 toutes les 5 minutes (CAP-05). */
export const GAUGE_RECHARGE_INTERVAL = 5;
const GAUGE_RECHARGE_POINTS = 1;
/** La fatigue et les notes sont mises à jour par paquets de 5 minutes (green code). */
const FATIGUE_INTERVAL = 5;
const FATIGUE_PER_MINUTE = 0.3;
const HIGH_PRESS_FATIGUE = 1.35;
const FATIGUE_MAX = 100;
/** Chance d'une ligne d'ambiance quand la minute n'a rien produit (MATCH-04). */
const AMBIANCE_CHANCE = 0.3;

const homeStrength = createStrength();
const awayStrength = createStrength();

/** Le match attend le coach (fenêtre d'événement, choix de cible) ou est terminé. */
export function isPaused(state: MatchState): boolean {
  return state.status === 'finished' || state.awaiting !== null || state.pending !== null;
}

/**
 * Avance d'une minute (ou joue le coup de pied arrêté annoncé). Ne fait rien si le
 * match est en pause. L'IA agit pour les camps non humains. Mute l'état.
 */
export function tick(state: MatchState): MatchEvent[] {
  if (isPaused(state)) return [];
  const run = beginRun(state);
  clearTriggers(state);
  if (state.pendingPlay) {
    resolvePendingPlay(run);
    return endRun(run);
  }
  if (state.status === 'halftime') startSecondHalf(run);
  if (advanceClock(run)) simulateMinute(run);
  return endRun(run);
}

/** Consignes tactiques, avant le match ou pendant une pause (MATCH-05). */
export function setInstructions(state: MatchState, side: Side, instructions: Instructions): void {
  teamOf(state, side).instructions = { ...instructions };
}

function simulateMinute(run: Run): void {
  const { state } = run;
  expireEffects(state);
  if (state.elapsed % GAUGE_RECHARGE_INTERVAL === 0) {
    addGauge(state.home, GAUGE_RECHARGE_POINTS);
    addGauge(state.away, GAUGE_RECHARGE_POINTS);
  }
  if (state.elapsed % FATIGUE_INTERVAL === 0) {
    applyFatigue(state.home);
    applyFatigue(state.away);
  }
  measureTeam(state.home, state.elapsed, homeStrength);
  measureTeam(state.away, state.elapsed, awayStrength);
  const eventsBefore = run.events.length;
  playChances(run, homeStrength, awayStrength);
  if (!interrupted(state)) playFouls(run, homeStrength, awayStrength);
  if (!interrupted(state)) rollInjury(run);
  if (!interrupted(state)) playAiTurns(run);
  if (run.events.length === eventsBefore && run.rng.chance(AMBIANCE_CHANCE)) commentAmbiance(run);
}

/** Un événement attend sa résolution : le reste de la minute est sauté. */
function interrupted(state: MatchState): boolean {
  return state.awaiting !== null || state.pendingPlay !== null;
}

function playAiTurns(run: Run): void {
  if (!run.state.home.isHuman) aiTakeTurn(run, 'home');
  if (!run.state.away.isHuman) aiTakeTurn(run, 'away');
}

/** La fatigue monte en jouant, plus vite avec le pressing haut (EFF-04, MATCH-05). */
function applyFatigue(team: TeamState): void {
  const gain = FATIGUE_PER_MINUTE * FATIGUE_INTERVAL * (team.instructions.highPress ? HIGH_PRESS_FATIGUE : 1);
  for (const player of team.players) {
    if (!isOnPitch(player)) continue;
    player.profile.fatigue = Math.min(FATIGUE_MAX, player.profile.fatigue + gain);
    refreshRating(player);
  }
}

function commentAmbiance(run: Run): void {
  const { state, rng } = run;
  const total = homeStrength.midfield + awayStrength.midfield;
  const homeHasBall = rng.next() * total < homeStrength.midfield;
  const [team, opponent] = homeHasBall ? [state.home, state.away] : [state.away, state.home];
  pushEvent(run, 'ambiance', team.side, comment(rng, 'ambiance', { team: team.name, opponent: opponent.name }));
}
