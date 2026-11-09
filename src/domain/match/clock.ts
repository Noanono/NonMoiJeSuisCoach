/**
 * Horloge du match : mi-temps à 45', fin à 90', temps additionnel, tirs au but en coupe.
 */
import { scoreLine } from './actions';
import { comment } from './commentary';
import { computeXpGains } from './impact';
import { runShootout, shootoutConversion } from './shootout';
import { isActive, keeperOf, pushEvent, refreshRating, teamOf, type Run } from './state';
import { shootingValue, ABSENT_KEEPER_RATING } from './strength';
import type { MatchState, TeamState } from './types';
import { openTriggers } from './windows';

export const HALF_LENGTH = 45;
export const FULL_LENGTH = 90;
const FIRST_HALF_STOPPAGE = { min: 1, max: 3 } as const;
const SECOND_HALF_STOPPAGE = { min: 2, max: 5 } as const;
/** Fatigue effacée pendant la pause. */
const HALFTIME_RECOVERY = 5;

/**
 * Avance d'une minute. Rend `false` si la période vient de se terminer
 * (aucune minute de jeu à simuler). Mute l'état.
 */
export function advanceClock(run: Run): boolean {
  const { state } = run;
  const periodEnd = state.status === 'firstHalf' ? HALF_LENGTH : FULL_LENGTH;
  if (state.minute < periodEnd) {
    state.minute++;
  } else {
    if (!state.stoppageAnnounced) announceStoppage(run);
    if (state.addedMinute >= state.stoppage) {
      endPeriod(run);
      return false;
    }
    state.addedMinute++;
  }
  state.elapsed++;
  return true;
}

function announceStoppage(run: Run): void {
  const { state, rng } = run;
  const range = state.status === 'firstHalf' ? FIRST_HALF_STOPPAGE : SECOND_HALF_STOPPAGE;
  state.stoppage = rng.int(range.min, range.max) + state.extraStoppage;
  state.extraStoppage = 0;
  state.stoppageAnnounced = true;
  pushEvent(run, 'stoppage', null, comment(rng, 'stoppage', { n: state.stoppage }));
}

function endPeriod(run: Run): void {
  const { state } = run;
  state.addedMinute = 0;
  state.stoppage = 0;
  state.stoppageAnnounced = false;
  if (state.status === 'firstHalf') startHalftime(run);
  else finishMatch(run);
}

/** Mi-temps : récupération, fenêtre d'événement « mi-temps » (CAP-19). */
function startHalftime(run: Run): void {
  const { state } = run;
  state.status = 'halftime';
  pushEvent(run, 'halftime', null, comment(run.rng, 'halftime', { score: scoreLine(state) }));
  for (const team of [state.home, state.away]) {
    for (const player of team.players) {
      player.profile.fatigue = Math.max(0, player.profile.fatigue - HALFTIME_RECOVERY);
      refreshRating(player);
    }
  }
  openTriggers(run, 'home', 'halftime', 'halftime');
}

export function startSecondHalf(run: Run): void {
  run.state.status = 'secondHalf';
  pushEvent(run, 'kickoff', null, comment(run.rng, 'secondHalf'));
}

function finishMatch(run: Run): void {
  const { state } = run;
  if (state.knockout && state.home.goals === state.away.goals) playShootout(run);
  state.status = 'finished';
  state.awaiting = null;
  state.pending = null;
  state.pendingPlay = null;
  pushEvent(run, 'fullTime', null, comment(run.rng, 'fullTime', { score: scoreLine(state) }));
  state.xpGains = computeXpGains(state);
}

function playShootout(run: Run): void {
  const { state, rng } = run;
  const home = shootoutConversion(averageShooting(state, state.home), keeperRating(state, state.away));
  const away = shootoutConversion(averageShooting(state, state.away), keeperRating(state, state.home));
  const result = runShootout(rng, home, away);
  state.shootout = result;
  const winner = teamOf(state, result.winner);
  const score = `${result.home}-${result.away}`;
  pushEvent(run, 'shootout', result.winner, comment(rng, 'shootout', { team: winner.name, score }));
}

function averageShooting(state: MatchState, team: TeamState): number {
  let total = 0;
  let count = 0;
  for (const player of team.players) {
    if (player.line === null || player.line === 'GK' || !isActive(player, state.elapsed)) continue;
    total += shootingValue(player);
    count++;
  }
  return count > 0 ? total / count : ABSENT_KEEPER_RATING;
}

function keeperRating(state: MatchState, team: TeamState): number {
  const keeper = keeperOf(team);
  return keeper && isActive(keeper, state.elapsed) ? keeper.rating : ABSENT_KEEPER_RATING;
}
