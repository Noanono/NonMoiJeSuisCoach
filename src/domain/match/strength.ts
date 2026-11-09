/**
 * Force des lignes d'une équipe (MATCH-01) : notes effectives (poste, fatigue)
 * pondérées par ligne, corrigées par les effets actifs. Calcul sans allocation.
 */
import type { MatchStat, Position } from '../types';
import { isActive } from './state';
import type { MatchPlayer, TeamState } from './types';

export interface TeamStrength {
  attack: number;
  midfield: number;
  defense: number;
  keeper: number;
}

/** Contribution de chaque ligne à l'attaque, au milieu et à la défense. */
const LINE_WEIGHTS: Record<Position, { attack: number; midfield: number; defense: number }> = {
  GK: { attack: 0, midfield: 0, defense: 0.3 },
  DEF: { attack: 0.1, midfield: 0.3, defense: 1 },
  MID: { attack: 0.4, midfield: 1, defense: 0.4 },
  ATT: { attack: 1, midfield: 0.3, defense: 0.1 },
};

/** Note retenue quand la cage n'a plus de gardien valide. */
export const ABSENT_KEEPER_RATING = 15;
/** Un modificateur ne peut pas annuler complètement un joueur. */
const MIN_FACTOR = 0.1;
/** Les stats générales comptent à moitié pour les gestes spécialisés (tir, arrêts). */
const GENERAL_SHARE_ON_SPECIALTY = 0.5;

const GENERAL_STATS: readonly MatchStat[] = ['speed', 'technique', 'physical', 'concentration'];

interface ModifierTotals {
  all: number;
  general: number;
  shooting: number;
  defense: number;
  goalkeeping: number;
}

const totals: ModifierTotals = { all: 0, general: 0, shooting: 0, defense: 0, goalkeeping: 0 };

/** Somme les modificateurs actifs d'un joueur dans `totals` (réutilisé, pas d'allocation). */
function sumModifiers(player: MatchPlayer): ModifierTotals {
  totals.all = totals.general = totals.shooting = totals.defense = totals.goalkeeping = 0;
  for (const effect of player.effects) {
    const { stat, value } = effect;
    if (stat === 'all') totals.all += value;
    else if (stat === 'shooting') totals.shooting += value;
    else if (stat === 'defense') totals.defense += value;
    else if (stat === 'goalkeeping') totals.goalkeeping += value;
    else if (GENERAL_STATS.includes(stat as MatchStat)) totals.general += value;
  }
  return totals;
}

export function createStrength(): TeamStrength {
  return { attack: 0, midfield: 0, defense: 0, keeper: ABSENT_KEEPER_RATING };
}

export function resetStrength(out: TeamStrength): void {
  out.attack = out.midfield = out.defense = 0;
  out.keeper = ABSENT_KEEPER_RATING;
}

/** Ajoute la contribution d'un joueur à sa ligne. Les facteurs valent 1 sans effet actif. */
export function addContribution(out: TeamStrength, line: Position, rating: number, factors = NEUTRAL): void {
  const weights = LINE_WEIGHTS[line];
  out.attack += rating * weights.attack * factors.attack;
  out.midfield += rating * weights.midfield * factors.midfield;
  out.defense += rating * weights.defense * factors.defense;
  if (line === 'GK') out.keeper = rating * factors.keeper;
}

interface Factors {
  attack: number;
  midfield: number;
  defense: number;
  keeper: number;
}

const NEUTRAL: Factors = { attack: 1, midfield: 1, defense: 1, keeper: 1 };
const factors: Factors = { attack: 1, midfield: 1, defense: 1, keeper: 1 };

/** Mesure la force d'une équipe à la minute `elapsed`, dans `out`. */
export function measureTeam(team: TeamState, elapsed: number, out: TeamStrength): void {
  resetStrength(out);
  for (const player of team.players) {
    if (player.line === null || !isActive(player, elapsed)) continue;
    const mods = sumModifiers(player);
    const base = mods.all + mods.general;
    factors.attack = Math.max(MIN_FACTOR, 1 + base + mods.shooting);
    factors.midfield = Math.max(MIN_FACTOR, 1 + base);
    factors.defense = Math.max(MIN_FACTOR, 1 + base + mods.defense);
    factors.keeper = Math.max(MIN_FACTOR, 1 + mods.all + mods.general * GENERAL_SHARE_ON_SPECIALTY + mods.goalkeeping);
    addContribution(out, player.line, player.rating, factors);
  }
}

/** Les deux équipes échangent leurs niveaux (L'Échange de maillots). */
export function swapStrengths(a: TeamStrength, b: TeamStrength): void {
  [a.attack, b.attack] = [b.attack, a.attack];
  [a.midfield, b.midfield] = [b.midfield, a.midfield];
  [a.defense, b.defense] = [b.defense, a.defense];
  [a.keeper, b.keeper] = [b.keeper, a.keeper];
}

/** Valeur de tir d'un joueur, effets compris. */
export function shootingValue(player: MatchPlayer): number {
  const mods = sumModifiers(player);
  const factor = 1 + mods.all + mods.general * GENERAL_SHARE_ON_SPECIALTY + mods.shooting;
  return player.rating * Math.max(MIN_FACTOR, factor);
}

/** Bonus de tir du joueur (0 sans effet) : plus il est en forme, plus le ballon arrive sur lui. */
export function shootingBoost(player: MatchPlayer): number {
  const mods = sumModifiers(player);
  return Math.max(0, mods.all + mods.general * GENERAL_SHARE_ON_SPECIALTY + mods.shooting);
}
