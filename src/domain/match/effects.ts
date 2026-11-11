/**
 * Interprète des primitives `Effect` (CAP-04, CAP-06, CAP-09). Tout reste dans le match.
 */
import type { Effect, MatchStat } from '../types';
import { clamp } from '../core/rng';
import { addGauge, cancelRecentGoal, knockOut } from './actions';
import { comment } from './commentary';
import { creditActivation, IMPACT } from './impact';
import { closerDistance, FREE_KICK_DISTANCE_LABEL, playInstantChance } from './plays';
import { isActive, isOnPitch, NEVER, opponentSide, pushEvent, refreshRating, teamOf, type Run } from './state';
import { resolveScope } from './targets';
import type { ActivationRecord, FloatingText, MatchPlayer, Side, TeamState } from './types';

const FATIGUE_MAX = 100;
const PERCENT = 100;

const STAT_SHORT: Record<MatchStat, string> = {
  all: 'TOUT',
  speed: 'VITESSE',
  technique: 'TECHNIQUE',
  physical: 'PHYSIQUE',
  shooting: 'TIR',
  defense: 'DÉFENSE',
  goalkeeping: 'ARRÊTS',
  concentration: 'CONCENTRATION',
};

export interface EffectContext {
  run: Run;
  side: Side;
  source: MatchPlayer;
  targets: MatchPlayer[];
  /** Libellé affiché sur les effets actifs (nom de la capacité). */
  label: string;
  activation: ActivationRecord;
}

export function applyEffects(context: EffectContext, effects: readonly Effect[]): void {
  for (const effect of effects) applyEffect(context, effect);
}

function scoped(context: EffectContext, effect: Extract<Effect, { scope: unknown }>): MatchPlayer[] {
  return resolveScope({ state: context.run.state, ...context }, effect.scope);
}

function float(context: EffectContext, player: MatchPlayer, text: string, tone: FloatingText['tone']): void {
  context.activation.floats.push({ playerId: player.id, text, tone });
}

function percentText(value: number): string {
  return `${value < 0 ? '−' : '+'}${Math.round(Math.abs(value) * PERCENT)} %`;
}

/** Applique un effet. Mute l'état du match. */
export function applyEffect(context: EffectContext, effect: Effect): void {
  const { run, side, source } = context;
  const { state } = run;
  const team = teamOf(state, side);
  const opponents = teamOf(state, opponentSide(side));
  const until = (duration: number) => state.elapsed + duration;
  switch (effect.type) {
    case 'modifier':
      return applyModifier(context, effect, effect.value);
    case 'scaledModifier': {
      const units = effect.per === 'minute' ? state.minute : opponents.goals;
      return applyModifier(context, effect, effect.base + effect.perUnit * units);
    }
    case 'knockout':
      return applyKnockout(context, effect);
    case 'revive':
      for (const player of scoped(context, effect)) revive(context, player);
      return;
    case 'cancelAction':
      team.pendingCancels += effect.count ?? 1;
      float(context, source, effect.count ? `${effect.count} ACTIONS ANNULÉES` : 'ACTION ANNULÉE', 'bonus');
      return;
    case 'chanceBoost':
      team.chanceBoosts.push(effect.carrier ? { value: effect.value, shooterId: source.id } : { value: effect.value });
      float(context, source, `${percentText(effect.value)} OCCASION`, 'bonus');
      return;
    case 'instantChance':
      float(context, source, 'OCCASION !', 'bonus');
      playInstantChance(run, side, source, effect.chance);
      return;
    case 'opponentChanceMalus':
      team.shotMaluses.push({ value: Math.abs(effect.value), shotsLeft: effect.shots });
      float(context, source, `TIR ADVERSE ${percentText(-Math.abs(effect.value))}`, 'bonus');
      return;
    case 'energy':
      for (const player of scoped(context, effect)) {
        restoreEnergy(player, effect.value);
        float(context, player, `${percentText(effect.value)} ÉNERGIE`, 'bonus');
      }
      return;
    case 'cancelGoal':
      if (cancelRecentGoal(run, opponentSide(side), effect.withinMinutes)) {
        creditActivation(context.activation, IMPACT.goalCancelled, 'but adverse annulé');
        float(context, source, 'BUT ANNULÉ', 'bonus');
      }
      return;
    case 'gauge':
      addGauge(team, effect.value);
      float(context, source, `+${effect.value} GUEULANTE`, 'bonus');
      return;
    case 'stealGauge': {
      const stolen = Math.min(opponents.gauge, effect.value);
      opponents.gauge -= stolen;
      addGauge(team, stolen);
      float(context, source, `+${stolen} GUEULANTE VOLÉE`, 'bonus');
      return;
    }
    case 'cleanSheetGauge':
      team.delayed.push({ kind: 'cleanSheet', at: until(effect.duration) + 1, points: effect.value, conceded: opponents.goals, label: context.label });
      return;
    case 'clearMaluses':
      return clearMaluses(context, team, effect.bonusGauge, effect.threshold);
    case 'swapTeams':
      return swapTeams(context, team, opponents, until(effect.duration));
    case 'poachBest':
      return poachBest(context, team, opponents);
    case 'doubleGoals':
      team.doubleGoalsUntil = Math.max(team.doubleGoalsUntil, until(effect.duration));
      float(context, source, 'BUTS ×2', 'bonus');
      return;
    case 'miracle':
      return miracle(context, team);
    case 'setPieceBoost':
      team.setPieceBoosts.push({ option: effect.option, value: effect.value });
      float(context, source, `${percentText(effect.value)} ${effect.option === 'shot' ? 'FRAPPE' : 'CENTRE'}`, 'bonus');
      return;
    case 'moveBallCloser': {
      const play = state.pendingPlay;
      if (play?.kind !== 'freeKick' || play.side !== side || !play.distance) return;
      play.distance = closerDistance(play.distance);
      float(context, source, `BALLON AVANCÉ : ${FREE_KICK_DISTANCE_LABEL[play.distance].toUpperCase()}`, 'bonus');
      return;
    }
    case 'cancelSetPiece': {
      const play = state.pendingPlay;
      if (!play || play.side === side || play.kind === 'penalty') return;
      state.pendingPlay = null;
      if (state.awaiting?.freeKick) state.awaiting = null;
      pushEvent(run, 'actionCancelled', side, comment(run.rng, 'setPieceCancelled', { team: opponents.name, opponent: team.name }));
      creditActivation(context.activation, IMPACT.actionCancelled, 'coup de pied arrêté annulé');
      float(context, source, 'COUP FRANC ANNULÉ', 'bonus');
      return;
    }
    case 'retakePenalty':
      team.retakePenalties += effect.count;
      float(context, source, 'PENALTY À RETIRER', 'bonus');
      return;
    case 'turnIntoPenalty': {
      const play = state.pendingPlay;
      if (play?.kind !== 'freeKick' || play.side !== side) return;
      state.pendingPlay = { kind: 'penalty', side, takerId: null };
      if (state.awaiting?.freeKick) state.awaiting.freeKick = undefined;
      pushEvent(run, 'penalty', side, comment(run.rng, 'turnedIntoPenalty', { team: team.name }));
      float(context, source, 'PENALTY !', 'bonus');
      return;
    }
  }
}

function applyModifier(context: EffectContext, effect: Extract<Effect, { scope: unknown; stat: unknown }>, value: number): void {
  const endsAt = context.run.state.elapsed + effect.duration;
  const extendOnGoal = effect.type === 'modifier' ? effect.extendOnGoal : undefined;
  for (const player of scoped(context, effect)) {
    // Relancer une capacité encore active prolonge son effet, sans le cumuler.
    player.effects = player.effects.filter((active) => active.label !== context.label || active.stat !== effect.stat);
    player.effects.push({ label: context.label, stat: effect.stat, value, endsAt, ...(extendOnGoal ? { extendOnGoal } : {}) });
    const friendly = player.side === context.side;
    float(context, player, `${percentText(value)} ${STAT_SHORT[effect.stat]}`, friendly === value > 0 ? 'bonus' : 'malus');
  }
}

function applyKnockout(context: EffectContext, effect: Extract<Effect, { type: 'knockout' }>): void {
  const { run } = context;
  for (const player of scoped(context, effect)) {
    knockOut(run, player, effect.duration, context.label);
    float(context, player, `K.O. ${effect.duration} MIN`, player.side === context.side ? 'bonus' : 'malus');
    if (player.side === context.side) continue;
    creditActivation(context.activation, IMPACT.knockout, 'adversaire mis hors jeu');
    if (effect.chaseDuration !== undefined) {
      teamOf(run.state, context.side).delayed.push({
        kind: 'chase',
        at: run.state.elapsed + effect.duration + 1,
        duration: effect.chaseDuration,
        excludedId: player.id,
        label: context.label,
      });
    }
  }
}

function revive(context: EffectContext, player: MatchPlayer): void {
  player.knockedOutUntil = NEVER;
  player.effects = player.effects.filter((effect) => effect.stat !== 'knockout');
  float(context, player, 'RELEVÉ', 'bonus');
}

/** Efface une fraction de la fatigue, le temps du match : `fatigueRestored` la rend après. */
function restoreEnergy(player: MatchPlayer, fraction: number): void {
  const before = player.profile.fatigue;
  player.profile.fatigue = clamp(before * (1 - fraction), 0, FATIGUE_MAX);
  player.fatigueRestored += before - player.profile.fatigue;
  refreshRating(player);
}

function clearMaluses(context: EffectContext, team: TeamState, bonusGauge: number, threshold: number): void {
  let removed = 0;
  for (const player of team.players) {
    const kept = player.effects.filter((effect) => effect.value >= 0 || effect.stat === 'knockout');
    removed += player.effects.length - kept.length;
    player.effects = kept;
  }
  float(context, context.source, removed > 0 ? 'MALUS EFFACÉS' : 'RIEN À EFFACER', 'bonus');
  if (removed >= threshold) {
    addGauge(team, bonusGauge);
    float(context, context.source, `+${bonusGauge} GUEULANTE`, 'bonus');
  }
}

/** Niveaux inversés : affichés comme un effet sur chaque joueur en match. */
function swapTeams(context: EffectContext, own: TeamState, opponents: TeamState, endsAt: number): void {
  const { state } = context.run;
  state.swappedUntil = Math.max(state.swappedUntil, endsAt);
  for (const [team, value] of [[own, 1], [opponents, -1]] as const) {
    for (const player of team.players) {
      if (player.line !== null) player.effects.push({ label: context.label, stat: 'swap', value, endsAt });
    }
  }
  float(context, context.source, 'NIVEAUX INVERSÉS', 'bonus');
}

/** Le meilleur joueur de champ adverse change de camp, à sa ligne habituelle, jusqu'à la fin du match. */
function poachBest(context: EffectContext, own: TeamState, opponents: TeamState): void {
  const candidates = opponents.players.filter((player) => player.line !== null && player.line !== 'GK' && isOnPitch(player));
  const best = candidates.reduce<MatchPlayer | undefined>((top, player) => (!top || player.rating > top.rating ? player : top), undefined);
  if (!best) return;
  opponents.players.splice(opponents.players.indexOf(best), 1);
  own.players.push(best);
  best.side = own.side;
  context.activation.targetIds.push(best.id);
  float(context, best, 'TRANSFÉRÉ', 'bonus');
  creditActivation(context.activation, IMPACT.knockout, 'meilleur adversaire recruté');
  pushEvent(context.run, 'effect', own.side, `${best.name} change de camp et rejoint ${own.name}.`);
}

/** Exclus et blessés encore sur la feuille reviennent, sans suite pour eux ; tout le monde repart frais. */
function miracle(context: EffectContext, team: TeamState): void {
  const { state } = context.run;
  const back = new Set<string>();
  for (const player of team.players) {
    if (player.subbedOff) continue;
    restoreEnergy(player, 1);
    player.knockedOutUntil = NEVER;
    player.effects = player.effects.filter((effect) => effect.stat !== 'knockout');
    if (player.line === null || (!player.sentOff && !player.injured)) continue;
    player.sentOff = false;
    player.injured = false;
    back.add(player.id);
    refreshRating(player);
    float(context, player, 'DE RETOUR', 'bonus');
  }
  team.consequences = team.consequences.filter((consequence) => consequence.type === 'abilityRevealed' || !back.has(consequence.playerId));
  state.injuries = state.injuries.filter((injury) => !back.has(injury.playerId));
  float(context, context.source, 'MIRACLE', 'bonus');
}

/** Résout les suites prévues pour cette minute (recompense du Bus, chien qui change de victime). */
export function resolveDelayedEffects(run: Run): void {
  for (const team of [run.state.home, run.state.away]) {
    if (team.delayed.length === 0) continue;
    const due = team.delayed.filter((effect) => effect.at <= run.state.elapsed);
    team.delayed = team.delayed.filter((effect) => effect.at > run.state.elapsed);
    for (const effect of due) resolveDelayed(run, team, effect);
  }
}

function resolveDelayed(run: Run, team: TeamState, effect: TeamState['delayed'][number]): void {
  const { state, rng } = run;
  const opponents = teamOf(state, opponentSide(team.side));
  if (effect.kind === 'cleanSheet') {
    if (opponents.goals > effect.conceded) return;
    addGauge(team, effect.points);
    pushEvent(run, 'effect', team.side, comment(rng, 'cleanSheet', { label: effect.label, team: team.name, n: effect.points }));
    return;
  }
  const victims = opponents.players.filter((player) => player.id !== effect.excludedId && player.line !== null && isActive(player, state.elapsed));
  if (victims.length > 0) knockOut(run, rng.pick(victims), effect.duration, effect.label);
}
