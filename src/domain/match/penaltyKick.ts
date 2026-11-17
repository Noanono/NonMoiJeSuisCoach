/**
 * Penalty en match (P4) : le tireur choisit sa frappe, le gardien son plongeon.
 * Placée = choix sûr, en force = choix brutal, Panenka = le bluff. Fonctions pures.
 * Calibrage : avec les choix de l'IA, on retrouve ~76 % de réussite, comme avant.
 */
import type { Rng } from '../core/rng';
import type { KeeperDive, KeeperHabit, PenaltyStyle } from './types';

/** Ce que le gardien a fait par rapport à la frappe. */
export type KeeperRead = 'wrong' | 'right' | 'center';

/**
 * Probabilité de but avant le talent du tireur, selon la frappe et le gardien :
 * placée = punit le gardien qui reste au centre, en force = déborde même un gardien parti du bon côté,
 * Panenka = imparable si le gardien plonge, ridicule s'il attend.
 */
export const PENALTY_STYLE_CHANCE: Record<PenaltyStyle, Record<KeeperRead, number>> = {
  placed: { wrong: 0.98, right: 0.42, center: 0.95 },
  power: { wrong: 0.96, right: 0.68, center: 0.5 },
  panenka: { wrong: 0.95, right: 0.95, center: 0.05 },
};

export const PENALTY_STYLE_LABEL: Record<PenaltyStyle, string> = {
  placed: 'frappe placée',
  power: 'frappe en force',
  panenka: 'Panenka',
};

/** Choix de l'IA quand elle tire : surtout placé, parfois en force, rarement la Panenka. */
export const AI_STYLE_SHARE: Record<PenaltyStyle, number> = { placed: 0.6, power: 0.3, panenka: 0.1 };

/** Part des penalties où le gardien reste au centre, selon son habitude. */
export const KEEPER_STAY_CHANCE: Record<KeeperHabit, number> = { diver: 0.1, neutral: 0.2, stayer: 0.35 };

export const KEEPER_HABIT_LABEL: Record<KeeperHabit, string> = {
  diver: 'plonge presque toujours',
  neutral: 'plonge la plupart du temps',
  stayer: 'reste volontiers au centre',
};

/** Points de gueulante gagnés par le vainqueur du duel d'une Panenka, et perdus par l'autre. */
export const PANENKA_GAUGE_SWING = 1;

const HABITS: readonly KeeperHabit[] = ['diver', 'neutral', 'stayer'];

/** Habitude d'un gardien : fixe pour un joueur donné (tirée de son identifiant), cachée au départ. */
export function keeperHabit(keeperId: string): KeeperHabit {
  let hash = 0;
  for (let index = 0; index < keeperId.length; index++) hash = (hash * 31 + keeperId.charCodeAt(index)) >>> 0;
  return HABITS[hash % HABITS.length]!;
}

export function aiPenaltyStyle(rng: Rng): PenaltyStyle {
  const roll = rng.next();
  if (roll < AI_STYLE_SHARE.placed) return 'placed';
  if (roll < AI_STYLE_SHARE.placed + AI_STYLE_SHARE.power) return 'power';
  return 'panenka';
}

/** Plongeon d'un gardien laissé à lui-même : son habitude décide s'il reste au centre. */
export function keeperDive(rng: Rng, keeperId: string): KeeperDive {
  if (rng.chance(KEEPER_STAY_CHANCE[keeperHabit(keeperId)])) return 'center';
  return rng.chance(0.5) ? 'left' : 'right';
}

/** Côté visé : la Panenka va au centre, les autres frappes à gauche ou à droite. */
export function aimFor(rng: Rng, style: PenaltyStyle): KeeperDive {
  if (style === 'panenka') return 'center';
  return rng.chance(0.5) ? 'left' : 'right';
}

export function keeperRead(aim: KeeperDive, dive: KeeperDive): KeeperRead {
  if (dive === 'center') return 'center';
  return dive === aim ? 'right' : 'wrong';
}

/** Réussite attendue d'une frappe face à un gardien qui reste au centre une fois sur `stay`. */
export function expectedPenaltyChance(style: PenaltyStyle, stay: number): number {
  const odds = PENALTY_STYLE_CHANCE[style];
  if (style === 'panenka') return (1 - stay) * odds.wrong + stay * odds.center;
  return (1 - stay) * (odds.wrong + odds.right) / 2 + stay * odds.center;
}

/** Réussite attendue du tireur de l'IA selon le choix du gardien du coach. */
export function expectedAgainstDive(dive: KeeperDive): number {
  return (Object.keys(AI_STYLE_SHARE) as PenaltyStyle[]).reduce((total, style) => {
    const odds = PENALTY_STYLE_CHANCE[style];
    const chance = dive === 'center' ? odds.center : style === 'panenka' ? odds.wrong : (odds.wrong + odds.right) / 2;
    return total + AI_STYLE_SHARE[style] * chance;
  }, 0);
}
