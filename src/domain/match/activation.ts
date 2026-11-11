/**
 * Activation des capacités par le coach (CAP-03, CAP-04, CAP-16 à CAP-20).
 * Parcours humain : previewActivation → startActivation → selectTarget (une à une)
 * → confirmActivation, ou cancelActivation sans rien consommer.
 */
import { addConsequence } from './actions';
import { comment, fill, TRIGGER_LABEL, UNAVAILABLE } from './commentary';
import { applyEffects, type EffectContext } from './effects';
import { IMPACT, IMPACT_WINDOW_MINUTES } from './impact';
import { beginRun, endRun, opponentSide, pushEvent, requirePlayer, teamOf, type Run } from './state';
import { chosenTargetCount, validTargets } from './targets';
import type { ActivationPreview, ActivationRecord, MatchEvent, MatchPlayer, MatchState, PreparedAbility, Side } from './types';
import { refreshWindow, triggerIsOpen } from './windows';

const HIDDEN_NAME = '???';

/** Raison pour laquelle le joueur ne peut pas activer sa capacité, `null` si c'est possible. */
export function checkAvailability(state: MatchState, side: Side, player: MatchPlayer): string | null {
  const ability = player.ability;
  if (state.status === 'finished') return UNAVAILABLE.finished;
  if (player.side !== side) return UNAVAILABLE.wrongSide;
  if (!ability) return UNAVAILABLE.noAbility;
  return physicalReason(state, player, ability) ?? timingReason(state, side, ability) ?? usageReason(state, side, player);
}

function physicalReason(state: MatchState, player: MatchPlayer, ability: PreparedAbility): string | null {
  if (player.subbedOff) return UNAVAILABLE.subbedOff;
  if (player.sentOff) return UNAVAILABLE.sentOff;
  if (player.injured) return UNAVAILABLE.injured;
  if (player.line === null) return ability.position === 'BENCH' ? null : UNAVAILABLE.onBench;
  return player.knockedOutUntil >= state.elapsed ? UNAVAILABLE.knockedOut : null;
}

function timingReason(state: MatchState, side: Side, ability: PreparedAbility): string | null {
  if (ability.trigger !== 'anytime' && !triggerIsOpen(ability.trigger, state.triggers[side])) {
    return fill(UNAVAILABLE.trigger, { label: TRIGGER_LABEL[ability.trigger] });
  }
  const window = ability.requiresRecentOpponentGoal;
  if (window !== null && !hasRecentGoal(state, opponentSide(side), window)) return fill(UNAVAILABLE.noRecentGoal, { n: window });
  return null;
}

function hasRecentGoal(state: MatchState, side: Side, withinMinutes: number): boolean {
  return state.goals.some((goal) => goal.side === side && !goal.cancelled && state.elapsed - goal.elapsed <= withinMinutes);
}

function usageReason(state: MatchState, side: Side, player: MatchPlayer): string | null {
  const ability = player.ability!;
  // Chaque capacité ne sert qu'une fois par match : la jouer est un choix (CAP-04).
  if (player.usedAbility) return UNAVAILABLE.oncePerMatch;
  if (player.cooldownUntil > state.elapsed) return fill(UNAVAILABLE.cooldown, { n: player.cooldownUntil - state.elapsed });
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

/** Ce que le coach voit avant d'activer. */
export function previewActivation(state: MatchState, side: Side, playerId: string): ActivationPreview {
  const player = requirePlayer(state, playerId);
  const ability = player.ability;
  const busy = state.pending !== null && state.pending.playerId !== playerId;
  const reason = busy ? UNAVAILABLE.busy : checkAvailability(state, side, player);
  const revealed = player.abilityRevealed || !ability?.hidden;
  return {
    available: reason === null,
    reason,
    side,
    playerId,
    abilityId: ability && revealed ? ability.id : null,
    abilityName: ability && revealed ? ability.name : HIDDEN_NAME,
    rarity: ability && revealed ? ability.rarity : null,
    revealed,
    cost: ability?.cost ?? 0,
    gauge: teamOf(state, side).gauge,
    targeting: ability?.targeting.kind ?? null,
    targetCount: ability ? chosenTargetCount(ability) : 0,
    targetLine: ability?.targeting.line ?? null,
    targetDowned: ability?.targeting.downed ?? false,
    validTargetIds: ability ? validTargets(state, player, ability).map((target) => target.id) : [],
    cooldownRemaining: Math.max(0, player.cooldownUntil - state.elapsed),
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

/** Valide l'activation : consomme et applique les effets. */
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
  const { state } = run;
  const { side, player } = order;
  const ability = player.ability!;
  consumeActivation(state, player, ability);
  revealAbility(state, player, ability);
  const targets = ability.targeting.kind === 'randomOpponent' ? drawRandomTargets(run, player, ability) : order.targets;
  const record = createRecord(state, order, ability);
  record.targetIds = targets.map((target) => target.id);
  state.activations.push(record);
  announceActivation(run, order, targets);
  const context: EffectContext = { run, side, source: player, targets, label: ability.name, activation: record };
  applyEffects(context, ability.effects);
  refreshWindow(state);
  return record;
}

/** Jauge et utilisation unique dans le match (CAP-04, CAP-05). */
function consumeActivation(state: MatchState, player: MatchPlayer, ability: PreparedAbility): void {
  teamOf(state, player.side).gauge -= ability.cost;
  player.usedAbility = true;
  if (ability.cooldown > 0) player.cooldownUntil = state.elapsed + ability.cooldown;
}

/** Une capacité cachée se révèle à sa première activation (CAP-13). */
function revealAbility(state: MatchState, player: MatchPlayer, ability: PreparedAbility): void {
  if (player.abilityRevealed) return;
  player.abilityRevealed = true;
  addConsequence(teamOf(state, player.side), { type: 'abilityRevealed', playerId: player.id, abilityId: ability.id });
}

/** « Au hasard » (CAP-18) : la cible est tirée parmi les adversaires valides. */
function drawRandomTargets(run: Run, player: MatchPlayer, ability: PreparedAbility): MatchPlayer[] {
  const pool = validTargets(run.state, player, ability);
  const count = Math.min(ability.targeting.count ?? 1, pool.length);
  const drawn: MatchPlayer[] = [];
  for (let i = 0; i < count; i++) drawn.push(...pool.splice(run.rng.int(0, pool.length - 1), 1));
  return drawn;
}

function createRecord(state: MatchState, order: ActivationOrder, ability: PreparedAbility): ActivationRecord {
  return {
    id: state.nextActivationId++,
    side: order.side,
    playerId: order.player.id,
    abilityId: ability.id,
    abilityName: ability.name,
    rarity: ability.rarity,
    minute: state.minute,
    elapsed: state.elapsed,
    byAi: order.byAi,
    targetIds: [],
    zone: ability.targeting.kind === 'zone',
    floats: [],
    impact: IMPACT.success,
    notes: [],
    activeUntil: state.elapsed + Math.max(IMPACT_WINDOW_MINUTES, longestDuration(ability)),
  };
}

function longestDuration(ability: PreparedAbility): number {
  let longest = 0;
  for (const effect of ability.effects) {
    if ('duration' in effect) longest = Math.max(longest, effect.duration);
  }
  return longest;
}

/** Chaque activation est annoncée dans le live, surtout celles de l'IA (MATCH-07). */
function announceActivation(run: Run, order: ActivationOrder, targets: MatchPlayer[]): void {
  const ability = order.player.ability!;
  const team = teamOf(run.state, order.side);
  const targetText = targets.length > 0 ? ` Cible : ${targets.map((target) => target.name).join(', ')}.` : '';
  const vars = { player: order.player.name, team: team.name, ability: ability.name };
  const text = comment(run.rng, order.byAi ? 'activationAi' : 'activationHuman', { ...vars, label: `${ability.description}${targetText}` });
  pushEvent(run, 'activation', order.side, text, { playerId: order.player.id, abilityId: ability.id, label: ability.name });
}
