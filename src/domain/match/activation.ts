/**
 * Activation des capacités par le coach (CAP-03, CAP-04, CAP-07, CAP-16 à CAP-20).
 * Parcours humain : previewActivation → startActivation → selectTarget (une à une)
 * → confirmActivation, ou cancelActivation sans rien consommer.
 */
import type { Risk } from '../types';
import { addConsequence } from './actions';
import { comment, fill, TRIGGER_LABEL, UNAVAILABLE } from './commentary';
import { checkCombo } from './combos';
import { applyEffects, type EffectContext } from './effects';
import { IMPACT, IMPACT_WINDOW_MINUTES } from './impact';
import { beginRun, endRun, opponentSide, pushEvent, requirePlayer, teamOf, type Run } from './state';
import { chosenTargetCount, validTargets } from './targets';
import type {
  ActivationPreview,
  ActivationRecord,
  MatchEvent,
  MatchPlayer,
  MatchState,
  PreparedAbility,
  Side,
} from './types';
import { refreshWindow } from './windows';

const HIDDEN_NAME = '???';
const HIDDEN_RISK_LABEL = 'Revers inconnu';

/** Raison pour laquelle le joueur ne peut pas activer sa capacité, `null` si c'est possible. */
export function checkAvailability(state: MatchState, side: Side, player: MatchPlayer): string | null {
  const ability = player.ability;
  if (state.status === 'finished') return UNAVAILABLE.finished;
  if (player.side !== side) return UNAVAILABLE.wrongSide;
  if (!ability) return UNAVAILABLE.noAbility;
  return physicalReason(state, player, ability) ?? timingReason(state, side, ability) ?? usageReason(state, side, player);
}

function physicalReason(state: MatchState, player: MatchPlayer, ability: PreparedAbility): string | null {
  if (player.sentOff) return UNAVAILABLE.sentOff;
  if (player.injured) return UNAVAILABLE.injured;
  if (player.line === null) return ability.position === 'BENCH' ? null : UNAVAILABLE.onBench;
  return player.knockedOutUntil >= state.elapsed ? UNAVAILABLE.knockedOut : null;
}

function timingReason(state: MatchState, side: Side, ability: PreparedAbility): string | null {
  if (ability.trigger !== 'anytime' && state.triggers[side] !== ability.trigger) {
    return fill(UNAVAILABLE.trigger, { label: TRIGGER_LABEL[ability.trigger] });
  }
  const condition = ability.condition;
  if (condition?.minMinute !== undefined && state.minute < condition.minMinute) {
    return fill(UNAVAILABLE.minMinute, { n: condition.minMinute });
  }
  if (condition?.whenLeading && teamOf(state, side).goals <= teamOf(state, opponentSide(side)).goals) {
    return UNAVAILABLE.whenLeading;
  }
  return null;
}

function usageReason(state: MatchState, side: Side, player: MatchPlayer): string | null {
  const ability = player.ability!;
  const cooldown = ability.cooldown;
  if (cooldown.kind === 'minutes' && player.cooldownUntil > state.elapsed) {
    return fill(UNAVAILABLE.cooldown, { n: player.cooldownUntil - state.elapsed });
  }
  if (cooldown.kind === 'perMatch' && player.usesThisMatch >= cooldown.uses) return UNAVAILABLE.perMatch;
  if (cooldown.kind === 'perSeason' && player.seasonUses >= cooldown.uses) return UNAVAILABLE.perSeason;
  if (cooldown.kind === 'perEvent' && player.lastEventUse === state.eventSeq) return UNAVAILABLE.perEvent;
  const gauge = teamOf(state, side).gauge;
  if (gauge < ability.cost) return fill(UNAVAILABLE.gauge, { n: ability.cost - gauge });
  if (needsTargets(ability) && validTargets(state, player, ability).length === 0) return UNAVAILABLE.noTarget;
  return null;
}

function needsTargets(ability: PreparedAbility): boolean {
  const kind = ability.targeting.kind;
  return kind === 'teammate' || kind === 'opponent' || kind === 'randomOpponent';
}

// ---------------------------------------------------------------------------
// Parcours du coach
// ---------------------------------------------------------------------------

/** Ce que le coach voit avant d'activer (CAP-07). */
export function previewActivation(state: MatchState, side: Side, playerId: string): ActivationPreview {
  const player = requirePlayer(state, playerId);
  const ability = player.ability;
  const busy = state.pending !== null && state.pending.playerId !== playerId;
  const reason = busy ? UNAVAILABLE.busy : checkAvailability(state, side, player);
  const revealed = player.abilityRevealed || !ability?.hidden;
  const cooldownRemaining = Math.max(0, player.cooldownUntil - state.elapsed);
  return {
    available: reason === null,
    reason,
    side,
    playerId,
    abilityId: ability && revealed ? ability.id : null,
    abilityName: ability && revealed ? ability.name : HIDDEN_NAME,
    revealed,
    cost: ability?.cost ?? 0,
    gauge: teamOf(state, side).gauge,
    successChance: ability?.successChance ?? 0,
    risks: (ability?.risks ?? []).map((risk: Risk) => ({
      label: revealed ? risk.label : HIDDEN_RISK_LABEL,
      chance: risk.chance,
    })),
    targeting: ability?.targeting.kind ?? null,
    targetCount: ability ? chosenTargetCount(ability) : 0,
    range: ability?.targeting.range ?? 'any',
    validTargetIds: ability ? validTargets(state, player, ability).map((target) => target.id) : [],
    cooldownRemaining: ability?.cooldown.kind === 'minutes' ? cooldownRemaining : 0,
  };
}

/** Démarre une activation : le match attend les cibles éventuelles puis la validation (CAP-16). */
export function startActivation(state: MatchState, side: Side, playerId: string): ActivationPreview {
  const preview = previewActivation(state, side, playerId);
  if (!preview.available) return preview;
  const ability = requirePlayer(state, playerId).ability!;
  const required = Math.min(chosenTargetCount(ability), preview.validTargetIds.length);
  state.pending = { side, playerId, abilityId: ability.id, required, targetIds: [], validTargetIds: preview.validTargetIds };
  return preview;
}

/** Ajoute une cible, une à une (CAP-17). Rend `false` si elle n'est pas valide. */
export function selectTarget(state: MatchState, targetId: string): boolean {
  const pending = state.pending;
  if (!pending || pending.targetIds.length >= pending.required) return false;
  if (!pending.validTargetIds.includes(targetId) || pending.targetIds.includes(targetId)) return false;
  pending.targetIds.push(targetId);
  return true;
}

/** Annule l'activation en cours (CAP-20) : ni jauge ni recharge consommées. */
export function cancelActivation(state: MatchState): void {
  state.pending = null;
}

/** Valide l'activation : consomme, tire la réussite et les risques, applique les effets et combos. */
export function confirmActivation(state: MatchState): MatchEvent[] {
  const pending = state.pending;
  if (!pending || pending.targetIds.length < pending.required) return [];
  state.pending = null;
  const player = requirePlayer(state, pending.playerId);
  if (checkAvailability(state, pending.side, player) !== null) return [];
  const run = beginRun(state);
  const targets = pending.targetIds.map((id) => requirePlayer(state, id));
  performActivation(run, { side: pending.side, player, targets, byAi: false });
  return endRun(run);
}

export interface ActivationOrder {
  side: Side;
  player: MatchPlayer;
  targets: MatchPlayer[];
  byAi: boolean;
}

/** Cœur commun au coach et à l'IA. La disponibilité doit avoir été vérifiée. Mute l'état. */
export function performActivation(run: Run, order: ActivationOrder): ActivationRecord {
  const { state, rng } = run;
  const { side, player } = order;
  const ability = player.ability!;
  consumeActivation(state, player, ability);
  revealAbility(state, player, ability);
  const targets = ability.targeting.kind === 'randomOpponent' ? drawRandomTargets(run, player, ability) : order.targets;
  const record = createRecord(state, order, ability, rng.chance(ability.successChance));
  record.targetIds = targets.map((target) => target.id);
  state.activations.push(record);
  announceActivation(run, order, record, targets);
  const context: EffectContext = {
    run,
    side,
    source: player,
    participants: [player],
    targets,
    label: ability.name,
    activation: record,
  };
  if (record.success) applyEffects(context, ability.effects);
  applyRisks({ ...context, activation: null }, ability.risks, record);
  if (record.success) checkCombo(run, record);
  refreshWindow(state);
  return record;
}

/** Jauge et recharge (CAP-04, CAP-05, CAP-12). */
function consumeActivation(state: MatchState, player: MatchPlayer, ability: PreparedAbility): void {
  const team = teamOf(state, player.side);
  team.gauge -= ability.cost;
  player.usesThisMatch++;
  const cooldown = ability.cooldown;
  if (cooldown.kind === 'minutes') player.cooldownUntil = state.elapsed + cooldown.value;
  if (cooldown.kind === 'perEvent') player.lastEventUse = state.eventSeq;
  if (cooldown.kind === 'perSeason') {
    player.seasonUses++;
    addConsequence(team, { type: 'seasonUse', playerId: player.id, abilityId: ability.id, seasonUses: player.seasonUses });
  }
}

/** Une capacité cachée se révèle à sa première activation (CAP-13). */
function revealAbility(state: MatchState, player: MatchPlayer, ability: PreparedAbility): void {
  if (player.abilityRevealed) return;
  player.abilityRevealed = true;
  addConsequence(teamOf(state, player.side), { type: 'abilityRevealed', playerId: player.id, abilityId: ability.id });
}

/** « Au hasard » (CAP-18) : la cible est tirée parmi les adversaires à portée. */
function drawRandomTargets(run: Run, player: MatchPlayer, ability: PreparedAbility): MatchPlayer[] {
  const pool = validTargets(run.state, player, ability);
  const count = Math.min(ability.targeting.count ?? 1, pool.length);
  const drawn: MatchPlayer[] = [];
  for (let i = 0; i < count; i++) drawn.push(...pool.splice(run.rng.int(0, pool.length - 1), 1));
  return drawn;
}

function createRecord(state: MatchState, order: ActivationOrder, ability: PreparedAbility, success: boolean) {
  const record: ActivationRecord = {
    id: state.nextActivationId++,
    side: order.side,
    playerId: order.player.id,
    abilityId: ability.id,
    abilityName: ability.name,
    minute: state.minute,
    elapsed: state.elapsed,
    byAi: order.byAi,
    success,
    targetIds: [],
    risks: [],
    impact: success ? IMPACT.success : 0,
    notes: [],
    activeUntil: state.elapsed + Math.max(IMPACT_WINDOW_MINUTES, longestDuration(ability)),
    comboName: null,
    usedInCombo: false,
  };
  return record;
}

function longestDuration(ability: PreparedAbility): number {
  let longest = 0;
  for (const effect of ability.effects) {
    if ('duration' in effect) longest = Math.max(longest, effect.duration);
  }
  return longest;
}

/** Chaque activation est annoncée dans le live, surtout celles de l'IA (MATCH-07). */
function announceActivation(run: Run, order: ActivationOrder, record: ActivationRecord, targets: MatchPlayer[]): void {
  const ability = order.player.ability!;
  const team = teamOf(run.state, order.side);
  const targetText = targets.length > 0 ? ` Cible : ${targets.map((target) => target.name).join(', ')}.` : '';
  const vars = { player: order.player.name, team: team.name, ability: ability.name };
  const key = !record.success ? 'activationFailed' : order.byAi ? 'activationAi' : 'activationHuman';
  const text = comment(run.rng, key, { ...vars, label: `${ability.description}${targetText}` });
  pushEvent(run, 'activation', order.side, text, { playerId: order.player.id, abilityId: ability.id });
}

/** Tire chaque risque indépendamment, que l'effet principal ait réussi ou non (CAP-07). */
export function applyRisks(context: EffectContext, risks: readonly Risk[], record: ActivationRecord): void {
  const { run } = context;
  for (const risk of risks) {
    if (!run.rng.chance(risk.chance)) continue;
    record.risks.push(risk.label);
    const vars = { team: teamOf(run.state, context.side).name, player: context.source.name, label: risk.label };
    pushEvent(run, 'risk', context.side, comment(run.rng, 'risk', vars), { playerId: context.source.id });
    applyEffects(context, risk.effects);
  }
}
