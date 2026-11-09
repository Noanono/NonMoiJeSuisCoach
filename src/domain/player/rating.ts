import type { AttributeName, Attributes, Formation, Player, Position } from '../types';
import { clamp } from '../core/rng';

/** Poids des attributs par poste pour la note globale (EFF-01). */
const WEIGHTS: Record<Position, Partial<Record<AttributeName, number>>> = {
  GK: { goalkeeping: 0.7, physical: 0.15, speed: 0.15 },
  DEF: { defense: 0.45, physical: 0.25, speed: 0.15, technique: 0.15 },
  MID: { technique: 0.4, speed: 0.2, physical: 0.15, defense: 0.1, shooting: 0.15 },
  ATT: { shooting: 0.45, speed: 0.25, technique: 0.2, physical: 0.1 },
};

/** Part de sa note perdue par un joueur complètement épuisé (EFF-04). */
const FATIGUE_MAX_PENALTY = 0.5;
const BASE_INJURY_RISK = 0.01;
/** Risque de blessure par match ajouté à fatigue maximale : il grimpe vite quand le joueur est cuit. */
const FATIGUE_INJURY_RISK = 0.25;

/** Coefficient appliqué quand un joueur évolue hors de son poste (EFF-02). */
const OUT_OF_POSITION: Record<Position, Record<Position, number>> = {
  GK: { GK: 1, DEF: 0.5, MID: 0.45, ATT: 0.4 },
  DEF: { GK: 0.3, DEF: 1, MID: 0.85, ATT: 0.7 },
  MID: { GK: 0.3, DEF: 0.85, MID: 1, ATT: 0.85 },
  ATT: { GK: 0.3, DEF: 0.7, MID: 0.85, ATT: 1 },
};

export function ratingFor(attributes: Attributes, position: Position): number {
  const weights = WEIGHTS[position];
  let total = 0;
  for (const name of Object.keys(weights) as AttributeName[]) {
    total += attributes[name] * (weights[name] ?? 0);
  }
  return Math.round(total);
}

/** Travailler cet attribut fait-il monter la note de ce poste ? */
export function focusRaisesOverall(position: Position, attribute: AttributeName): boolean {
  return (WEIGHTS[position][attribute] ?? 0) > 0;
}

/** Note globale au poste principal (EFF-01). */
export function overall(player: Player): number {
  return ratingFor(player.attributes, player.position);
}

export function positionFactor(natural: Position, played: Position): number {
  return OUT_OF_POSITION[natural][played];
}

/**
 * Performance effective d'un joueur à un poste donné, en tenant compte
 * du poste (EFF-02) et de la fatigue (EFF-04).
 */
export function effectiveRating(player: Player, played: Position): number {
  const base = overall(player) * positionFactor(player.position, played);
  const fatiguePenalty = 1 - (player.fatigue / 100) * FATIGUE_MAX_PENALTY;
  return clamp(base * fatiguePenalty, 1, 99);
}

/** Probabilité de blessure par match, plus forte quand le joueur est fatigué (EFF-04). */
export function injuryRisk(player: Player): number {
  return BASE_INJURY_RISK + (player.fatigue / 100) ** 2 * FATIGUE_INJURY_RISK;
}

export function isAvailable(player: Player): boolean {
  return player.injuryWeeks === 0 && player.suspendedMatches === 0;
}

/** Postes des 11 titulaires, dans l'ordre de la composition. */
export const FORMATION_SLOTS: Record<Formation, Position[]> = {
  '4-4-2': ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'ATT', 'ATT'],
  '4-3-3': ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT', 'ATT', 'ATT'],
  '3-5-2': ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'ATT', 'ATT'],
  '5-3-2': ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT', 'ATT'],
  '4-5-1': ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'ATT'],
};

export const FORMATIONS = Object.keys(FORMATION_SLOTS) as Formation[];
