/**
 * Interprète des primitives `Effect` (CAP-04, CAP-06, CAP-09). Tout reste dans le match.
 */
import type { Effect, MatchStat } from '../types';
import { clamp } from '../core/rng';
import { addGauge, bookPlayer, cancelRecentGoal, knockOut } from './actions';
import { copyableActivation } from './activation';
import { comment } from './commentary';
import { creditActivation, IMPACT } from './impact';
import { awardPenalty, bestShooter, closerDistance, FREE_KICK_DISTANCE_LABEL, playInstantChance } from './plays';
import { isActive, isOnPitch, NEVER, opponentSide, pushEvent, refreshRating, teamOf, type Run } from './state';
import { resolveScope, validTargets } from './targets';
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

function float(context: EffectContext, player: MatchPlayer, text: string, tone: FloatingText['tone'], kind?: FloatingText['kind']): void {
  context.activation.floats.push({ playerId: player.id, text, tone, ...(kind ? { kind } : {}) });
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
      const units = effect.per === 'minute' ? state.minute : effect.per === 'goalDeficit' ? Math.max(0, opponents.goals - team.goals) : opponents.goals;
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
    case 'chanceBoost': {
      const boost = effect.carrier ? { value: effect.value, shooterId: source.id } : { value: effect.value };
      // Lancé sur son propre coup de pied arrêté ou penalty : il sert à celui-là, avant les bonus plus anciens.
      if (state.pendingPlay?.side === side) team.chanceBoosts.unshift(boost);
      else team.chanceBoosts.push(boost);
      float(context, source, `${percentText(effect.value)} OCCASION`, 'bonus');
      return;
    }
    case 'instantChance':
      float(context, source, 'OCCASION !', 'bonus');
      playInstantChance(run, side, source, effect.chance);
      return;
    case 'opponentChanceMalus': {
      const malus = { value: Math.abs(effect.value), shotsLeft: effect.shots };
      // Lancé sur un coup de pied arrêté ou un penalty adverse : il sert à ce tir-là, avant les malus plus anciens.
      if (state.pendingPlay && state.pendingPlay.side !== side) team.shotMaluses.unshift(malus);
      else team.shotMaluses.push(malus);
      float(context, source, `TIR ADVERSE ${percentText(-Math.abs(effect.value))}`, 'bonus');
      return;
    }
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
      return clearMaluses(context, team, effect);
    case 'prolongDown':
      for (const player of scoped(context, effect)) {
        if (player.knockedOutUntil < state.elapsed) continue;
        player.knockedOutUntil += effect.minutes;
        for (const active of player.effects) if (active.stat === 'knockout') active.endsAt += effect.minutes;
        float(context, player, `+${effect.minutes} MIN AU SOL`, 'malus');
      }
      return;
    case 'steady':
      for (const player of scoped(context, effect)) {
        player.steadyUntil = Math.max(player.steadyUntil, until(effect.duration));
        float(context, player, 'INDÉBOULONNABLE', 'bonus');
      }
      return;
    case 'fieldDoctor':
      team.doctor = { reviveAfter: effect.reviveAfter, malusFactor: effect.malusFactor };
      for (const player of team.players) {
        if (player.knockedOutUntil < state.elapsed) continue;
        const limit = until(effect.reviveAfter);
        player.knockedOutUntil = Math.min(player.knockedOutUntil, limit);
        for (const active of player.effects) if (active.stat === 'knockout') active.endsAt = Math.min(active.endsAt, limit);
      }
      float(context, source, 'DOCTEUR SUR LE BANC', 'bonus');
      return;
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
    case 'mark':
      return applyMark(context, effect);
    case 'gamble': {
      const success = run.rng.chance(effect.chance);
      float(context, source, success ? 'PARI GAGNÉ !' : 'PARI PERDU…', success ? 'bonus' : 'malus', success ? 'gambleWon' : 'gambleLost');
      pushEvent(run, 'effect', side, success ? `Pari gagné pour ${source.name} !` : `Pari perdu pour ${source.name}…`, { playerId: source.id });
      applyEffects(context, success ? effect.success : effect.failure);
      return;
    }
    case 'bookSelf':
      bookPlayer(run, source, effect.card);
      return;
    case 'awardPenalty':
      if (state.pendingPlay) return;
      float(context, source, 'PENALTY !', 'bonus');
      awardPenalty(run, side, null);
      return;
    case 'opponentChance': {
      const shooter = bestShooter(opponents, state.elapsed);
      if (shooter) playInstantChance(run, opponents.side, shooter, effect.chance);
      return;
    }
    case 'deadMinutes':
      state.deadUntil = Math.max(state.deadUntil ?? -1, until(effect.duration));
      float(context, source, `HORLOGE FIGÉE ${effect.duration} MIN`, 'bonus');
      return;
    case 'addedTime':
      if (state.status === 'secondHalf' && state.stoppageAnnounced) state.stoppage += effect.minutes;
      else state.bonusStoppage = (state.bonusStoppage ?? 0) + effect.minutes;
      float(context, source, `+${effect.minutes} MIN DE TEMPS ADDITIONNEL`, 'bonus');
      return;
    case 'rewind': {
      let erased = 0;
      for (const goalSide of ['home', 'away'] as const) {
        while (cancelRecentGoal(run, goalSide, effect.minutes)) erased++;
      }
      float(context, source, erased > 0 ? `${erased} BUT(S) EFFACÉ(S)` : 'RIEN À EFFACER', erased > 0 ? 'bonus' : 'malus');
      return;
    }
    case 'shield':
      for (const player of scoped(context, effect)) {
        const current = player.shield && player.shield.until >= state.elapsed ? player.shield.charges : 0;
        player.shield = { charges: Math.max(current, effect.charges), until: until(effect.duration) };
        float(context, player, `BOUCLIER ×${effect.charges}`, 'bonus');
      }
      return;
    case 'copyLast':
      return copyLast(context);
    case 'drain':
      for (const player of scoped(context, effect)) {
        if (player.side !== side && blockedByShield(context.run, player, context.activation)) continue;
        drainEnergy(player, effect.value);
        float(context, player, `+${Math.round(effect.value)} FATIGUE`, player.side === side ? 'bonus' : 'malus');
      }
      return;
    case 'overcharge': {
      // Toute la jauge dépensée compte, coût de la capacité compris.
      const spent = team.gauge + (source.ability?.cost ?? 0);
      team.gauge = 0;
      float(context, source, `SURCHARGE ×${spent}`, 'bonus');
      if (spent > 0) applyModifier(context, { type: 'modifier', scope: effect.scope, stat: effect.stat, value: effect.perPoint * spent, duration: effect.duration }, effect.perPoint * spent);
      return;
    }
    case 'turnIntoPenalty': {
      const play = state.pendingPlay;
      if (play?.kind !== 'freeKick' || play.side !== side) return;
      state.pendingPlay = { kind: 'penalty', side, takerId: null };
      if (state.awaiting?.freeKick) {
        state.awaiting.penalty = state.awaiting.freeKick;
        state.awaiting.freeKick = undefined;
      }
      pushEvent(run, 'penalty', side, comment(run.rng, 'turnedIntoPenalty', { team: team.name }));
      float(context, source, 'PENALTY !', 'bonus');
      return;
    }
  }
}

function applyModifier(context: EffectContext, effect: Extract<Effect, { scope: unknown; stat: unknown }>, value: number): void {
  const { state } = context.run;
  const extendOnGoal = effect.type === 'modifier' ? effect.extendOnGoal : undefined;
  for (const player of scoped(context, effect)) {
    if (value < 0 && player.side !== context.side && blockedByShield(context.run, player, context.activation)) continue;
    // Un soigneur sur le banc raccourcit les malus venus de l'adversaire.
    const doctor = value < 0 && player.side !== context.side ? teamOf(state, player.side).doctor : undefined;
    const endsAt = state.elapsed + effect.duration * (doctor ? doctor.malusFactor : 1);
    // Relancer une capacité encore active prolonge son effet, sans le cumuler.
    player.effects = player.effects.filter((active) => active.label !== context.label || active.stat !== effect.stat);
    player.effects.push({ label: context.label, stat: effect.stat, value, endsAt, ...(extendOnGoal ? { extendOnGoal } : {}) });
    const friendly = player.side === context.side;
    float(context, player, `${percentText(value)} ${STAT_SHORT[effect.stat]}`, friendly === value > 0 ? 'bonus' : 'malus');
  }
}

function hasShield(elapsed: number, player: MatchPlayer): boolean {
  return player.shield !== undefined && player.shield.until >= elapsed && player.shield.charges > 0;
}

/**
 * Bouclier (M7) : la capacité adverse n'a aucun effet sur ce joueur. Une charge par capacité,
 * même si elle le frappe de plusieurs effets ; le reste de la capacité s'applique normalement ailleurs.
 */
function blockedByShield(run: Run, player: MatchPlayer, activation?: ActivationRecord): boolean {
  const shield = player.shield;
  if (!shield || shield.until < run.state.elapsed) return false;
  if (activation && shield.absorbing === activation) return true;
  if (shield.charges <= 0) return false;
  shield.charges -= 1;
  shield.absorbing = activation;
  activation?.floats.push({ playerId: player.id, text: 'BOUCLIER !', tone: 'bonus', kind: 'shield' });
  pushEvent(run, 'effect', player.side, `${player.name} était protégé : rien ne l’atteint.`, { playerId: player.id });
  return true;
}

function applyKnockout(context: EffectContext, effect: Extract<Effect, { type: 'knockout' }>): void {
  const { run } = context;
  for (const player of scoped(context, effect)) {
    if (player.side !== context.side && blockedByShield(run, player, context.activation)) continue;
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

/** Relève un joueur au sol, et soigne un blessé encore sur le terrain : il rejoue, sans suite après le match. */
function revive(context: EffectContext, player: MatchPlayer): void {
  player.knockedOutUntil = NEVER;
  player.effects = player.effects.filter((effect) => effect.stat !== 'knockout');
  if (!player.injured) {
    float(context, player, 'RELEVÉ', 'bonus');
    return;
  }
  const { state } = context.run;
  const team = teamOf(state, player.side);
  player.injured = false;
  team.consequences = team.consequences.filter((consequence) => consequence.type !== 'injury' || consequence.playerId !== player.id);
  state.injuries = state.injuries.filter((injury) => injury.playerId !== player.id);
  refreshRating(player);
  float(context, player, 'SOIGNÉ', 'bonus');
  pushEvent(context.run, 'effect', player.side, `Le kiné a fait des merveilles : ${player.name} reprend sa place sur le terrain.`, { playerId: player.id });
}

/** Marquage (M1) : le malus tient tant que le marqueur est sur le terrain et debout. */
function applyMark(context: EffectContext, effect: Extract<Effect, { type: 'mark' }>): void {
  const endsAt = context.run.state.elapsed + effect.duration;
  for (const player of context.targets) {
    if (blockedByShield(context.run, player, context.activation)) continue;
    player.effects = player.effects.filter((active) => active.label !== context.label);
    player.effects.push({ label: context.label, stat: effect.stat, value: effect.value, endsAt, markerId: context.source.id });
    float(context, player, `MARQUÉ ${percentText(effect.value)} ${STAT_SHORT[effect.stat]}`, 'malus');
  }
}

/** Copie (M9) : la dernière capacité « à tout moment » de l'adversaire, rejouée pour son camp, cibles choisies au mieux. */
function copyLast(context: EffectContext): void {
  const { run, side, source } = context;
  const copied = copyableActivation(run.state, side);
  if (!copied) return;
  const ability = copied.ability;
  const pool = validTargets(run.state, source, ability).sort((a, b) => b.rating - a.rating);
  const count = ability.targeting.count ?? 1;
  const targets = ability.targeting.kind === 'randomOpponent' ? pool.sort(() => run.rng.next() - 0.5).slice(0, count) : pool.slice(0, count);
  float(context, source, `COPIE : ${ability.name.toUpperCase()}`, 'bonus');
  pushEvent(run, 'effect', side, `${source.name} copie « ${ability.name} » !`, { playerId: source.id });
  applyEffects({ ...context, targets, label: `${context.label} (${ability.name})` }, ability.effects);
  // Copier une capacité moins chère que la sienne rend la différence de Gueulante.
  const refund = (source.ability?.cost ?? 0) - ability.cost;
  if (refund > 0) {
    addGauge(teamOf(run.state, side), refund);
    float(context, source, `+${refund} GUEULANTE`, 'bonus');
  }
}

/** Énergie (M11) : fatigue en plus le temps du match ; `fatigueRestored` la retire après. */
function drainEnergy(player: MatchPlayer, amount: number): void {
  const before = player.profile.fatigue;
  player.profile.fatigue = clamp(before + amount, 0, FATIGUE_MAX);
  player.fatigueRestored -= player.profile.fatigue - before;
  refreshRating(player);
}

/** Efface une fraction de la fatigue, le temps du match : `fatigueRestored` la rend après. */
function restoreEnergy(player: MatchPlayer, fraction: number): void {
  const before = player.profile.fatigue;
  player.profile.fatigue = clamp(before * (1 - fraction), 0, FATIGUE_MAX);
  player.fatigueRestored += before - player.profile.fatigue;
  refreshRating(player);
}

function clearMaluses(context: EffectContext, team: TeamState, effect: Extract<Effect, { type: 'clearMaluses' }>): void {
  const { bonusGauge, threshold } = effect;
  let removed = 0;
  for (const player of effect.scope === 'targets' ? context.targets : team.players) {
    const kept = player.effects.filter((effect) => effect.value >= 0 || effect.stat === 'knockout');
    removed += player.effects.length - kept.length;
    player.effects = kept;
  }
  float(context, context.source, removed > 0 ? 'MALUS EFFACÉS' : 'RIEN À EFFACER', 'bonus');
  if (bonusGauge > 0 && removed >= threshold) {
    addGauge(team, bonusGauge);
    float(context, context.source, `+${bonusGauge} GUEULANTE`, 'bonus');
  }
  // Chaque malus retiré se transforme en bonus pour toute l'équipe.
  if (effect.perMalus && removed > 0) {
    const value = effect.perMalus * removed;
    applyModifier(context, { type: 'modifier', scope: 'team', stat: 'all', value, duration: effect.perMalusDuration ?? 15 }, value);
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
  // Un joueur sous bouclier ne peut pas être recruté.
  const candidates = opponents.players.filter((player) => player.line !== null && player.line !== 'GK' && isOnPitch(player) && !hasShield(context.run.state.elapsed, player));
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
  if (victims.length === 0) return;
  const victim = rng.pick(victims);
  if (!blockedByShield(run, victim)) knockOut(run, victim, effect.duration, effect.label);
}
