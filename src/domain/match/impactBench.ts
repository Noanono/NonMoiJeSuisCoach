/**
 * Banc de mesure de l'impact réel des capacités (CAP-09, MATCH-03).
 *
 * Deux équipes identiques, sans autre capacité. À la minute `ACTIVATION_MINUTE`, le camp domicile
 * active la capacité étudiée ; on compare ensuite, à graines égales, avec le même match sans activation.
 * Une capacité de penalty ou de coup franc est mesurée sur l'événement provoqué à cette minute, dans
 * les deux versions ; le coach joue alors l'option qui convient à la capacité (tir direct, centre).
 * Les autres capacités liées à un événement (mi-temps, but…) sont activées à sa première occurrence.
 * Le contexte qui rend la capacité utilisable (joueurs au sol, but adverse récent, malus à effacer…)
 * est installé dans les deux versions, pour ne mesurer que la capacité.
 */
import { getAbility } from '../abilities/catalog';
import { defineAbility } from '../abilities/data/define';
import { statsAtLevel } from '../abilities/progression';
import type { Ability, Effect } from '../types';
import { recordGoal } from './actions';
import { announceSetPiece, awardPenalty, chooseFreeKickOption } from './plays';
import { confirmActivation, selectTarget, startActivation } from './activation';
import { makeSheet } from './fixtures';
import { tick } from './simulation';
import { beginRun, createMatch, endRun } from './state';
import type { MatchState, Side } from './types';
import { dismissEventWindow, triggerIsOpen } from './windows';

export const ACTIVATION_MINUTE = 30;

/**
 * Cibles d'équilibrage (docs/equilibrage-capacites.md) : points de championnat gagnés par activation,
 * au niveau 1, par rapport au même match sans la capacité. Les fourchettes ne se chevauchent pas et
 * le point de jauge rapporte un peu plus à chaque rareté.
 */
export const IMPACT_TARGETS: Record<number, { min: number; max: number }> = {
  1: { min: 0.06, max: 0.1 },
  2: { min: 0.15, max: 0.2 },
  3: { min: 0.3, max: 0.4 },
  4: { min: 0.45, max: 0.6 },
  5: { min: 0.6, max: 0.8 },
  6: { min: 0.8, max: 1.1 },
  7: { min: 1.0, max: 1.4 },
};

/** Au niveau 5, une capacité rapporte entre 1,5 et 2 fois la fourchette de son coût. */
const LEVEL5_TARGET = { min: 1.5, max: 2 };

/** Fourchette visée selon le coût en Gueulante et le niveau (1 ou 5 ; les niveaux intermédiaires ne sont pas jugés). */
export function impactTarget(cost: number, level = 1): { min: number; max: number } {
  const base = IMPACT_TARGETS[cost] ?? IMPACT_TARGETS[7]!;
  return level === 5 ? { min: base.min * LEVEL5_TARGET.min, max: base.max * LEVEL5_TARGET.max } : base;
}

/** Erreur type des points jouables. */
export function playableError(report: ImpactReport): number {
  const share = report.activationRate > 0 && report.activationRate < 0.95 ? report.activationRate : 1;
  return report.pointsStdError / share;
}

/** Points par match quand la capacité a pu être jouée : une capacité à condition est jugée sur ses matchs jouables. */
export function playablePoints(report: ImpactReport): number {
  const share = report.activationRate > 0 && report.activationRate < 0.95 ? report.activationRate : 1;
  return report.pointsDelta / share;
}
/** Fenêtre d'observation des effets instantanés (occasion, annulation, jauge…). */
const DEFAULT_WINDOW = 15;
const MAX_TICKS = 400;
/** 4-4-2 : 0 = gardien, 1-4 défenseurs, 5-8 milieux, 9-10 attaquants. */
const BEARER_SLOT = { GK: 0, DEF: 1, MID: 5, ATT: 9, ANY: 5 } as const;
const LEVEL = 60;
/** Le Maillot retourné n'a de sens que contre plus fort : le camp domicile part avec ce niveau. */
const UNDERDOG_LEVEL = 50;

export interface ImpactReport {
  abilityId: string;
  name: string;
  rarity: Ability['rarity'];
  /** Coût en Gueulante. */
  cost: number;
  /** Niveau de la capacité mesurée (1 à 5). */
  level: number;
  /** Minutes observées après l'activation. */
  window: number;
  runs: number;
  /** Part des matchs où l'activation a réussi (pour un déclencheur : où l'événement s'est produit). */
  activationRate: number;
  /** Moyennes par match activé pendant la fenêtre, sans puis avec la capacité. */
  scored: { base: number; ability: number };
  conceded: { base: number; ability: number };
  /** Écart de différence de buts sur tout le match (avec − sans). */
  goalDifferenceDelta: number;
  /** Écart de points par match (3 / 1 / 0) sur tout le match. */
  pointsDelta: number;
  /** Erreur type de cet écart (matchs appariés) : la vraie valeur est à ± 2 erreurs types, 19 fois sur 20. */
  pointsStdError: number;
}

/** Durée pendant laquelle l'effet le plus long joue. */
export function effectWindow(effects: readonly Effect[]): number {
  let window = 0;
  for (const effect of effects) {
    if ('duration' in effect) window = Math.max(window, effect.duration + ('chaseDuration' in effect ? (effect.chaseDuration ?? 0) : 0));
  }
  return window > 0 ? window : DEFAULT_WINDOW;
}

function advanceTo(state: MatchState, elapsed: number): void {
  for (let i = 0; i < MAX_TICKS && state.elapsed < elapsed && state.status !== 'finished'; i++) {
    if (state.awaiting) dismissEventWindow(state);
    tick(state);
  }
}

/** Joue jusqu'à la première ouverture du déclencheur de la capacité (après `elapsed`). */
/** Événement provoqué pour chaque déclencheur de coup de pied arrêté : qui l'obtient, et lequel. */
const SET_PIECE_EVENTS: Partial<Record<Ability['trigger'], { side: Side; kind: 'penalty' | 'freeKick' }>> = {
  ownPenalty: { side: 'home', kind: 'penalty' },
  opponentPenalty: { side: 'away', kind: 'penalty' },
  ownFreeKick: { side: 'home', kind: 'freeKick' },
  ownSetPiece: { side: 'home', kind: 'freeKick' },
  ownDeadBall: { side: 'home', kind: 'freeKick' },
  opponentFreeKick: { side: 'away', kind: 'freeKick' },
  opponentSetPiece: { side: 'away', kind: 'freeKick' },
};

/** Provoque le penalty ou le coup franc de la capacité, une fois l'action en cours jouée. */
function provokeSetPiece(state: MatchState, event: { side: Side; kind: 'penalty' | 'freeKick' }): boolean {
  for (let i = 0; i < MAX_TICKS && (state.pendingPlay || state.awaiting) && state.status !== 'finished'; i++) {
    if (state.awaiting) dismissEventWindow(state);
    tick(state);
  }
  if (state.status === 'finished') return false;
  const run = beginRun(state);
  if (event.kind === 'penalty') awardPenalty(run, event.side, null);
  else announceSetPiece(run, event.side, 'freeKick');
  endRun(run);
  return true;
}

/** Option de coup franc qu'un coach choisit avec cette capacité, s'il y en a une. */
function optionFor(ability: Ability): 'shot' | 'cross' | null {
  for (const effect of ability.effects) {
    if (effect.type === 'setPieceBoost') return effect.option;
    if (effect.type === 'moveBallCloser') return 'shot';
  }
  return null;
}

function advanceToTrigger(state: MatchState, ability: Ability): boolean {
  const fromMinute = ability.condition?.fromMinute;
  if (fromMinute !== undefined) {
    for (let i = 0; i < MAX_TICKS && state.status !== 'finished' && (state.status !== 'secondHalf' || state.minute < fromMinute); i++) {
      if (state.awaiting) dismissEventWindow(state);
      tick(state);
    }
  }
  if (ability.trigger === 'anytime') return state.status !== 'finished';
  const event = SET_PIECE_EVENTS[ability.trigger];
  if (event) return provokeSetPiece(state, event);
  for (let i = 0; i < MAX_TICKS && state.status !== 'finished'; i++) {
    if (triggerIsOpen(ability.trigger, state.triggers.home)) return true;
    if (state.awaiting) dismissEventWindow(state);
    tick(state);
  }
  return false;
}

function playToEnd(state: MatchState): void {
  for (let i = 0; i < MAX_TICKS && state.status !== 'finished'; i++) {
    if (state.awaiting) dismissEventWindow(state);
    tick(state);
  }
}

/** Installe dans le match le contexte dont la capacité a besoin. Identique avec et sans activation. */
function setUpContext(state: MatchState, ability: Ability, bearerSlot: number | null): void {
  const home = state.home.players;
  const others = (indexes: number[]) => indexes.filter((index) => index !== bearerSlot).map((index) => home[index]!);
  const effects = ability.effects;
  if (ability.targeting.downed || effects.some((effect) => effect.type === 'revive')) {
    for (const player of others([9, 10, 8])) player.knockedOutUntil = state.elapsed + 20;
  }
  if (ability.requiresRecentOpponentGoal !== undefined || effects.some((effect) => effect.type === 'cancelGoal')) {
    const run = beginRun(state);
    recordGoal(run, 'away', state.away.players[9]!);
    endRun(run);
    if (state.awaiting) dismissEventWindow(state);
  }
  if (effects.some((effect) => effect.type === 'miracle')) {
    const [injured, sentOff] = others([2, 6]);
    if (injured) injured.injured = true;
    if (sentOff) sentOff.sentOff = true;
  }
  // Conditions de score (M12) : la situation est installée dans les deux versions.
  const score = ability.condition?.score;
  if (score === 'behind' || score === 'ahead') {
    const run = beginRun(state);
    recordGoal(run, score === 'behind' ? 'away' : 'home', score === 'behind' ? state.away.players[9]! : state.home.players[10]!);
    endRun(run);
    if (state.awaiting) dismissEventWindow(state);
  }
  // Copie (M9) : l'adversaire vient de jouer une capacité qui vaut la peine.
  if (effects.some((effect) => effect.type === 'copyLast')) {
    state.away.gauge = 10;
    startActivation(state, 'away', 'a-5');
    confirmActivation(state);
  }
  if (effects.some((effect) => effect.type === 'clearMaluses')) {
    for (const player of others([5, 6, 7])) player.effects.push({ label: 'Banc : malus', stat: 'all', value: -0.2, endsAt: state.elapsed + 20 });
  }
}

/** Jauge au moment d'activer : pleine, sauf pour une Surcharge (M13), mesurée sur une jauge réaliste. */
const OVERCHARGE_GAUGE = 7;

/** Tente l'activation : jauge pleine, meilleures cibles. */
function activate(state: MatchState, bearerId: string): boolean {
  const overcharge = state.home.players.concat(state.home.players).some((player) => player.id === bearerId && player.ability?.effects.some((effect) => effect.type === 'overcharge'));
  state.home.gauge = overcharge ? OVERCHARGE_GAUGE : 10;
  const preview = startActivation(state, 'home', bearerId);
  if (!preview.available) return false;
  const pending = state.pending!;
  const all = [...state.home.players, ...state.away.players];
  const ranked = pending.validTargetIds
    .map((id) => all.find((player) => player.id === id)!)
    .sort((a, b) => b.rating - a.rating);
  for (const target of ranked.slice(0, pending.required)) selectTarget(state, target.id);
  confirmActivation(state);
  return state.activations.some((record) => record.side === 'home');
}

interface Outcome {
  scored: number;
  conceded: number;
  difference: number;
  points: number;
  activated: boolean;
  /** Le moment d'activer est arrivé (toujours vrai sans déclencheur). */
  reached: boolean;
}

function goalsIn(state: MatchState, side: Side, from: number, to: number): number {
  return state.goals.filter((goal) => goal.side === side && !goal.cancelled && goal.elapsed >= from && goal.elapsed <= to).reduce((sum, goal) => sum + goal.value, 0);
}

/** Capacités adverses du banc de mesure : une à copier (M9), une hostile à contrer (bouclier, immunité, docteur). */
const BENCH_COPY_TARGET = 'banc-chant-adverse';
const BENCH_HOSTILE = 'banc-charge-adverse';
const BENCH_ABILITIES: readonly Ability[] = [
  defineAbility('rare', {
    id: BENCH_COPY_TARGET,
    name: 'Chant adverse',
    category: 'support',
    position: 'ANY',
    targeting: { kind: 'team' },
    description: 'Capacité adverse du banc de mesure.',
    effects: [{ type: 'modifier', scope: 'team', stat: 'all', value: 0.35, duration: 20, extendOnGoal: 5 }],
  }),
  defineAbility('common', {
    id: BENCH_HOSTILE,
    name: 'Charge adverse',
    category: 'sabotage',
    position: 'ATT',
    targeting: { kind: 'opponent', count: 2, line: 'DEF' },
    description: 'Capacité adverse du banc de mesure.',
    effects: [{ type: 'knockout', scope: 'targets', duration: 22 }],
  }),
];
const BENCH_BY_ID = new Map(BENCH_ABILITIES.map((ability) => [ability.id, ability]));
/** Le bouclier est mis à l'épreuve quelques minutes après l'activation. */
const HOSTILE_DELAY = 5;

function playOne(ability: Ability, level: number, seed: number, withAbility: boolean, window: number, lookup: (id: string) => Ability): Outcome {
  const position = ability.position;
  const bench = position === 'BENCH';
  const bearerSlot = position === 'BENCH' ? null : BEARER_SLOT[position];
  const home = makeSheet({
    clubId: 'h',
    isHuman: true,
    level: LEVEL,
    abilityLevel: level,
    abilities: bearerSlot === null ? {} : { [bearerSlot]: ability.id },
    benchAbilities: bench ? [ability.id] : [],
  });
  if (ability.effects.some((effect) => effect.type === 'swapTeams')) {
    for (const player of home.starters) player.attributes = { speed: UNDERDOG_LEVEL, technique: UNDERDOG_LEVEL, physical: UNDERDOG_LEVEL, shooting: UNDERDOG_LEVEL, defense: UNDERDOG_LEVEL, goalkeeping: UNDERDOG_LEVEL };
  }
  const copy = ability.effects.some((effect) => effect.type === 'copyLast');
  // Bouclier, immunité, docteur : mis à l'épreuve par une capacité hostile adverse.
  const shield = ability.effects.some((effect) => effect.type === 'shield' || effect.type === 'steady' || effect.type === 'fieldDoctor');
  const awayAbilities: Record<number, string> = copy ? { 5: BENCH_COPY_TARGET } : shield ? { 9: BENCH_HOSTILE } : {};
  const state = createMatch({ home, away: makeSheet({ clubId: 'a', isHuman: true, level: LEVEL, abilities: awayAbilities }), seed, lookupAbility: lookup });
  advanceTo(state, ACTIVATION_MINUTE);
  const reached = advanceToTrigger(state, ability);
  const start = state.elapsed;
  setUpContext(state, ability, bearerSlot);
  const bearerId = bench ? 'h-b0' : `h-${bearerSlot}`;
  const activated = reached && withAbility && activate(state, bearerId);
  const option = optionFor(ability);
  if (activated && option) chooseFreeKickOption(state, 'home', option);
  if (shield) {
    advanceTo(state, state.elapsed + HOSTILE_DELAY);
    state.away.gauge = 10;
    if (startActivation(state, 'away', 'a-9').available) {
      const pending = state.pending!;
      const ranked = pending.validTargetIds.map((id) => state.home.players.find((player) => player.id === id)!).sort((a, b) => b.rating - a.rating);
      for (const target of ranked.slice(0, pending.required)) selectTarget(state, target.id);
      confirmActivation(state);
    }
  }
  playToEnd(state);
  const difference = state.home.goals - state.away.goals;
  const points = difference > 0 ? 3 : difference === 0 ? 1 : 0;
  return {
    scored: goalsIn(state, 'home', start, start + window),
    conceded: goalsIn(state, 'away', start, start + window),
    difference,
    points,
    activated,
    reached,
  };
}

/** Mesure une capacité du catalogue sur `runs` matchs appariés, au niveau `level` (fenêtre : durées du niveau 1). */
export function measureAbility(abilityId: string, runs: number, level = 1): ImpactReport {
  return measureDefinition(getAbility(abilityId), runs, level);
}

/** Mesure une capacité qui n'est pas au catalogue (essais d'équilibrage). */
export function measureDefinition(ability: Ability, runs: number, level = 1): ImpactReport {
  const abilityId = ability.id;
  const lookup = (id: string) => (id === ability.id ? ability : (BENCH_BY_ID.get(id) ?? getAbility(id)));
  const window = effectWindow(ability.effects);
  const sum = { baseScored: 0, abilityScored: 0, baseConceded: 0, abilityConceded: 0, difference: 0, points: 0, pointsSquared: 0, activated: 0 };
  let measured = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const base = playOne(ability, level, seed, false, window, lookup);
    if (!base.reached) continue;
    const used = playOne(ability, level, seed, true, window, lookup);
    measured++;
    sum.baseScored += base.scored;
    sum.abilityScored += used.scored;
    sum.baseConceded += base.conceded;
    sum.abilityConceded += used.conceded;
    sum.difference += used.difference - base.difference;
    sum.points += used.points - base.points;
    sum.pointsSquared += (used.points - base.points) ** 2;
    if (used.activated) sum.activated++;
  }
  return {
    abilityId,
    name: ability.name,
    rarity: ability.rarity,
    cost: statsAtLevel(ability, 1).cost,
    level,
    window,
    runs,
    activationRate: sum.activated / runs,
    scored: { base: sum.baseScored / Math.max(1, measured), ability: sum.abilityScored / Math.max(1, measured) },
    conceded: { base: sum.baseConceded / Math.max(1, measured), ability: sum.abilityConceded / Math.max(1, measured) },
    goalDifferenceDelta: sum.difference / Math.max(1, measured),
    pointsDelta: sum.points / Math.max(1, measured),
    pointsStdError: standardError(sum.points, sum.pointsSquared, measured),
  };
}


/** Erreur type de la moyenne de  écarts appariés. */
function standardError(sum: number, sumOfSquares: number, count: number): number {
  if (count < 2) return 0;
  const mean = sum / count;
  const variance = Math.max(0, sumOfSquares / count - mean * mean) * (count / (count - 1));
  return Math.sqrt(variance / count);
}

const RARITY_LABEL: Record<Ability['rarity'], string> = { common: 'Commune', rare: 'Rare', legendary: 'Légendaire', mythic: 'Mythique', foreign: 'Étrangère' };

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`;
const percent = (value: number) => `${Math.round(value * 100)} %`;

/** Position d'une mesure par rapport à la cible de son coût. */
export function verdict(report: ImpactReport): string {
  const target = impactTarget(report.cost, report.level);
  // Comparé au centième, comme affiché : la mesure n'est pas plus précise.
  const points = Math.round(playablePoints(report) * 100) / 100;
  // Hors de la fourchette, mais de moins de deux erreurs types : la mesure ne permet pas de trancher.
  const margin = 2 * playableError(report);
  if (points < target.min) return points >= target.min - margin ? 'dans la marge (bas)' : 'sous la cible';
  if (points > target.max) return points <= target.max + margin ? 'dans la marge (haut)' : 'au-dessus';
  return 'dans la cible';
}

/** Tableau Markdown des mesures, une ligne par capacité. */
export function impactTable(reports: readonly ImpactReport[]): string {
  const lines = [
    '| Capacité | Rareté | Coût | Fenêtre | Activée | Buts marqués (sans → avec) | Buts encaissés (sans → avec) | Δ diff. de buts | Δ points (jouable) | ± | Cible | Verdict |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const report of reports) {
    const target = impactTarget(report.cost, report.level);
    lines.push(
      `| ${report.name} | ${RARITY_LABEL[report.rarity]} | ${report.cost} | ${report.window} min | ${percent(report.activationRate)} | ${report.scored.base.toFixed(2)} → ${report.scored.ability.toFixed(2)} | ${report.conceded.base.toFixed(2)} → ${report.conceded.ability.toFixed(2)} | ${signed(report.goalDifferenceDelta)} | ${signed(playablePoints(report))} | ±${(2 * playableError(report)).toFixed(2)} | ${target.min.toFixed(2)} à ${target.max.toFixed(2)} | ${verdict(report)} |`,
    );
  }
  return lines.join('\n');
}
