/**
 * Interprète des primitives `Effect` (CAP-04, CAP-06, CAP-09) : effets en match,
 * et conséquences hors match accumulées pour la boucle de saison.
 */
import type { Effect } from '../types';
import { clamp } from '../core/rng';
import { addConsequence, bookPlayer, cancelRecentGoal, knockOut, recordGoal } from './actions';
import { comment } from './commentary';
import { creditActivation, IMPACT } from './impact';
import { awardPenalty } from './plays';
import { isOnPitch, opponentSide, pushEvent, refreshRating, teamOf, UNTIL_FINAL_WHISTLE, type Run } from './state';
import { resolveScope } from './targets';
import type { ActivationRecord, MatchPlayer, Side } from './types';

const MORALE_SCALE = 100;
const FATIGUE_MAX = 100;
/** Lignes susceptibles de marquer contre leur camp, par ordre de préférence. */
const OWN_GOAL_LINES = ['DEF', 'GK', 'MID'] as const;

export interface EffectContext {
  run: Run;
  side: Side;
  source: MatchPlayer;
  participants: MatchPlayer[];
  targets: MatchPlayer[];
  /** Libellé affiché sur les effets actifs (nom de la capacité ou du combo). */
  label: string;
  /** Activation à créditer des faits de jeu provoqués, `null` pour les revers. */
  activation: ActivationRecord | null;
}

export function applyEffects(context: EffectContext, effects: readonly Effect[]): void {
  for (const effect of effects) applyEffect(context, effect);
}

function credit(context: EffectContext, amount: number, note: string): void {
  if (context.activation) creditActivation(context.activation, amount, note);
}

function scoped(context: EffectContext, effect: Extract<Effect, { scope: unknown }>): MatchPlayer[] {
  return resolveScope({ state: context.run.state, ...context }, effect.scope);
}

/** Applique un effet. Mute l'état du match. */
export function applyEffect(context: EffectContext, effect: Effect): void {
  const { run, side } = context;
  const { state } = run;
  const team = teamOf(state, side);
  const until = (duration: number) => state.elapsed + duration;
  switch (effect.type) {
    case 'modifier':
      for (const player of scoped(context, effect)) {
        player.effects.push({ label: context.label, stat: effect.stat, value: effect.value, endsAt: until(effect.duration) });
      }
      return;
    case 'knockout':
      return applyKnockout(context, effect);
    case 'cancelAction':
      team.pendingCancels++;
      return;
    case 'chanceBoost':
      team.chanceBoosts.push({ value: effect.value, on: effect.on });
      return;
    case 'opponentChanceMalus':
      team.shotMaluses.push({ value: Math.abs(effect.value), shotsLeft: effect.shots });
      return;
    case 'penaltyAwarded':
      if (!run.rng.chance(effect.chance)) return;
      credit(context, IMPACT.penalty, 'penalty obtenu');
      awardPenalty(run, side, context.source.line === null ? null : context.source.id);
      return;
    case 'ownGoal':
      return applyOwnGoal(context, effect.chance);
    case 'card':
      return applyCards(context, effect);
    case 'freeze':
      state.frozenUntil = Math.max(state.frozenUntil, until(effect.duration));
      pushEvent(run, 'effect', side, comment(run.rng, 'freeze', { minutes: effect.duration }));
      return;
    case 'stoppageTime':
      addStoppage(run, effect.minutes);
      return;
    case 'energy':
      for (const player of scoped(context, effect)) restoreEnergy(player, effect.value);
      return;
    case 'morale':
      for (const player of scoped(context, effect)) changeMorale(player, effect.value, context.label);
      return;
    case 'cancelGoal':
      if (cancelRecentGoal(run, opponentSide(side), effect.withinMinutes)) {
        credit(context, IMPACT.goalCancelled, 'but adverse annulé');
      }
      return;
    case 'noCards':
      team.noCardsUntil = Math.max(team.noCardsUntil, until(effect.duration));
      return;
    case 'foulsIgnored':
      team.foulsIgnored += effect.count;
      return;
    case 'emptyNet':
      team.emptyNetUntil = Math.max(team.emptyNetUntil, until(effect.duration));
      return;
    case 'extraAttacker':
      team.extraAttackerUntil = Math.max(team.extraAttackerUntil, until(effect.duration));
      return;
    case 'clearMoraleMaluses':
      for (const player of team.players) clearMoraleMaluses(player);
      return;
    case 'cancelHomeAdvantage':
      if (side === 'away') {
        state.homeAdvantageCancelledUntil = Math.max(state.homeAdvantageCancelledUntil, until(effect.duration));
      }
      return;
    default:
      return applyOffMatchEffect(context, effect);
  }
}

/** Conséquences hors match (amende, presse…) : stockées par camp pour la boucle de saison. */
function applyOffMatchEffect(
  context: EffectContext,
  effect: Extract<Effect, { type: 'fine' | 'budget' | 'presidentConfidence' | 'injury' | 'suspension' | 'squadFatigue' | 'press' }>,
): void {
  const team = teamOf(context.run.state, context.side);
  const reason = context.label;
  switch (effect.type) {
    case 'fine':
    case 'budget':
      return addConsequence(team, { type: effect.type, amount: effect.amount, reason });
    case 'presidentConfidence':
    case 'squadFatigue':
      return addConsequence(team, { type: effect.type, value: effect.value, reason });
    case 'press':
      return addConsequence(team, { type: 'press', headline: effect.headline, reason });
    case 'injury':
      for (const player of scoped(context, effect)) {
        const owner = teamOf(context.run.state, player.side);
        addConsequence(owner, { type: 'injury', playerId: player.id, weeks: effect.weeks, reason });
      }
      return;
    case 'suspension':
      for (const player of scoped(context, effect)) {
        const owner = teamOf(context.run.state, player.side);
        addConsequence(owner, { type: 'suspension', playerId: player.id, matches: effect.matches, reason });
      }
      return;
    default: {
      const unhandled: never = effect;
      throw new Error(`Effet non géré : ${JSON.stringify(unhandled)}`);
    }
  }
}

function applyKnockout(context: EffectContext, effect: Extract<Effect, { type: 'knockout' }>): void {
  const { run } = context;
  for (const player of scoped(context, effect)) {
    if (effect.chance !== undefined && !run.rng.chance(effect.chance)) continue;
    knockOut(run, player, effect.duration, context.label);
    if (player.side !== context.side) credit(context, IMPACT.knockout, 'adversaire mis hors jeu');
  }
}

function applyCards(context: EffectContext, effect: Extract<Effect, { type: 'card' }>): void {
  const { run } = context;
  for (const player of scoped(context, effect)) {
    if (!run.rng.chance(effect.chance)) continue;
    const given = bookPlayer(run, player, effect.card);
    if (given === 'red' && player.side !== context.side) credit(context, IMPACT.sendOff, 'expulsion provoquée');
  }
}

function applyOwnGoal(context: EffectContext, chance: number): void {
  const { run, side } = context;
  if (!run.rng.chance(chance)) return;
  const culprit = ownGoalCulprit(teamOf(run.state, opponentSide(side)).players);
  if (!culprit) return;
  credit(context, IMPACT.ownGoal, 'but contre son camp provoqué');
  recordGoal(run, side, culprit, { ownGoal: true });
}

function ownGoalCulprit(players: MatchPlayer[]): MatchPlayer | undefined {
  for (const line of OWN_GOAL_LINES) {
    const culprit = players.find((player) => player.line === line && isOnPitch(player));
    if (culprit) return culprit;
  }
  return players.find(isOnPitch);
}

/** Efface une fraction de la fatigue (négatif = en ajoute). */
function restoreEnergy(player: MatchPlayer, fraction: number): void {
  player.profile.fatigue = clamp(player.profile.fatigue * (1 - fraction), 0, FATIGUE_MAX);
  refreshRating(player);
}

/** Change le moral et garde la trace de la variation pour pouvoir l'annuler (Capitaine gueulard). */
function changeMorale(player: MatchPlayer, fraction: number, label: string): void {
  const before = player.profile.morale;
  player.profile.morale = clamp(before + fraction * MORALE_SCALE, 0, MORALE_SCALE);
  const applied = (player.profile.morale - before) / MORALE_SCALE;
  if (applied === 0) return;
  player.effects.push({ label, stat: 'morale', value: applied, endsAt: UNTIL_FINAL_WHISTLE });
  refreshRating(player);
}

function clearMoraleMaluses(player: MatchPlayer): void {
  const effects = player.effects;
  let changed = false;
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i]!;
    if (effect.stat !== 'morale' || effect.value >= 0) continue;
    player.profile.morale = clamp(player.profile.morale - effect.value * MORALE_SCALE, 0, MORALE_SCALE);
    effects.splice(i, 1);
    changed = true;
  }
  if (changed) refreshRating(player);
}

/** Temps additionnel : prolonge la période en cours ou s'ajoute à la prochaine annonce. */
export function addStoppage(run: Run, minutes: number): void {
  const { state } = run;
  if (state.stoppageAnnounced) state.stoppage += minutes;
  else state.extraStoppage += minutes;
}
