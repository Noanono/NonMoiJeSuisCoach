/**
 * Banc de mesure de l'impact réel des capacités (CAP-09, MATCH-03).
 *
 * Deux équipes identiques, sans autre capacité. À la minute `ACTIVATION_MINUTE`, le camp domicile
 * active la capacité étudiée ; on compare ensuite, à graines égales, avec le même match sans activation.
 * Une capacité liée à un événement (penalty, coup franc, mi-temps, but…) est activée à la première
 * occurrence de cet événement après cette minute, comme le ferait un coach.
 * Le contexte qui rend la capacité utilisable (joueurs au sol, but adverse récent, malus à effacer…)
 * est installé dans les deux versions, pour ne mesurer que la capacité.
 */
import { getAbility } from '../abilities/catalog';
import type { Ability, Effect } from '../types';
import { recordGoal } from './actions';
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
export const IMPACT_TARGETS: Record<Ability['rarity'], { min: number; max: number }> = {
  common: { min: 0.15, max: 0.2 },
  rare: { min: 0.3, max: 0.4 },
  legendary: { min: 0.6, max: 0.8 },
  mythic: { min: 1.0, max: 1.4 },
};

/** Capacités liées à un événement rare : jugées sur leur effet quand il survient, elles peuvent dépasser. */
export const SITUATIONAL_ABILITIES: readonly string[] = ['le-danseur'];
/** Fenêtre d'observation des effets instantanés (occasion, annulation, jauge…). */
const DEFAULT_WINDOW = 15;
const MAX_TICKS = 400;
/** 4-4-2 : 0 = gardien, 1-4 défenseurs, 5-8 milieux, 9-10 attaquants. */
const BEARER_SLOT = { GK: 0, DEF: 1, MID: 5, ATT: 9, ANY: 5 } as const;
const LEVEL = 60;
/** L'Échange de maillots n'a de sens que contre plus fort : le camp domicile part avec ce niveau. */
const UNDERDOG_LEVEL = 50;

export interface ImpactReport {
  abilityId: string;
  name: string;
  rarity: Ability['rarity'];
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
function advanceToTrigger(state: MatchState, ability: Ability): boolean {
  if (ability.trigger === 'anytime') return state.status !== 'finished';
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
  if (effects.some((effect) => effect.type === 'clearMaluses')) {
    for (const player of others([5, 6, 7])) player.effects.push({ label: 'Banc : malus', stat: 'all', value: -0.2, endsAt: state.elapsed + 20 });
  }
}

/** Tente l'activation : jauge pleine, meilleures cibles. */
function activate(state: MatchState, bearerId: string): boolean {
  state.home.gauge = 10;
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

function playOne(ability: Ability, level: number, seed: number, withAbility: boolean, window: number): Outcome {
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
  const state = createMatch({ home, away: makeSheet({ clubId: 'a', isHuman: true, level: LEVEL }), seed });
  advanceTo(state, ACTIVATION_MINUTE);
  const reached = advanceToTrigger(state, ability);
  const start = state.elapsed;
  setUpContext(state, ability, bearerSlot);
  const bearerId = bench ? 'h-b0' : `h-${bearerSlot}`;
  const activated = reached && withAbility && activate(state, bearerId);
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

/** Mesure une capacité sur `runs` matchs appariés, au niveau `level` (fenêtre : durées du niveau 1). */
export function measureAbility(abilityId: string, runs: number, level = 1): ImpactReport {
  const ability = getAbility(abilityId);
  const window = effectWindow(ability.effects);
  const sum = { baseScored: 0, abilityScored: 0, baseConceded: 0, abilityConceded: 0, difference: 0, points: 0, activated: 0 };
  let measured = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const base = playOne(ability, level, seed, false, window);
    if (!base.reached) continue;
    const used = playOne(ability, level, seed, true, window);
    measured++;
    sum.baseScored += base.scored;
    sum.abilityScored += used.scored;
    sum.baseConceded += base.conceded;
    sum.abilityConceded += used.conceded;
    sum.difference += used.difference - base.difference;
    sum.points += used.points - base.points;
    if (used.activated) sum.activated++;
  }
  return {
    abilityId,
    name: ability.name,
    rarity: ability.rarity,
    level,
    window,
    runs,
    activationRate: sum.activated / runs,
    scored: { base: sum.baseScored / Math.max(1, measured), ability: sum.abilityScored / Math.max(1, measured) },
    conceded: { base: sum.baseConceded / Math.max(1, measured), ability: sum.abilityConceded / Math.max(1, measured) },
    goalDifferenceDelta: sum.difference / Math.max(1, measured),
    pointsDelta: sum.points / Math.max(1, measured),
  };
}


const RARITY_LABEL: Record<Ability['rarity'], string> = { common: 'Commune', rare: 'Rare', legendary: 'Légendaire', mythic: 'Mythique' };

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`;
const percent = (value: number) => `${Math.round(value * 100)} %`;

/** Position d'une mesure par rapport à la cible de sa rareté. */
export function verdict(report: ImpactReport): string {
  const target = IMPACT_TARGETS[report.rarity];
  // Comparé au centième, comme affiché : la mesure n'est pas plus précise.
  const points = Math.round(report.pointsDelta * 100) / 100;
  if (points < target.min) return 'sous la cible';
  if (points > target.max) return SITUATIONAL_ABILITIES.includes(report.abilityId) ? 'au-dessus (situationnelle)' : 'au-dessus';
  return 'dans la cible';
}

/** Tableau Markdown des mesures, une ligne par capacité. */
export function impactTable(reports: readonly ImpactReport[]): string {
  const lines = [
    '| Capacité | Rareté | Fenêtre | Activée | Buts marqués (sans → avec) | Buts encaissés (sans → avec) | Δ diff. de buts | Δ points | Cible | Verdict |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const report of reports) {
    const target = IMPACT_TARGETS[report.rarity];
    lines.push(
      `| ${report.name} | ${RARITY_LABEL[report.rarity]} | ${report.window} min | ${percent(report.activationRate)} | ${report.scored.base.toFixed(2)} → ${report.scored.ability.toFixed(2)} | ${report.conceded.base.toFixed(2)} → ${report.conceded.ability.toFixed(2)} | ${signed(report.goalDifferenceDelta)} | ${signed(report.pointsDelta)} | ${target.min.toFixed(2)} à ${target.max.toFixed(2)} | ${verdict(report)} |`,
    );
  }
  return lines.join('\n');
}
