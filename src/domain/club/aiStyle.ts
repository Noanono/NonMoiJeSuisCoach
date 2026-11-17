/**
 * Styles des coachs IA (C6) : chaque club IA a une manière de jouer reconnaissable, avant le match
 * (formation, consignes) et pendant (il change de plan selon le score et la minute). Le style se
 * déduit de l'identifiant du club : il ne change pas d'une saison à l'autre, sans rien à sauvegarder.
 */
import type { AbilityCategory, Formation, Instructions } from '../types';

export type AiStyle = 'bus' | 'attack' | 'pressing' | 'cunning';

export const AI_STYLES: readonly AiStyle[] = ['bus', 'attack', 'pressing', 'cunning'];

export const AI_STYLE_LABEL: Record<AiStyle, string> = {
  bus: 'le bétonneur',
  attack: 'le fou d’attaque',
  pressing: 'le presseur',
  cunning: 'le roublard',
};

export const AI_STYLE_HINT: Record<AiStyle, string> = {
  bus: 'cinq défenseurs, de longs ballons, et il ferme tout dès qu’il mène',
  attack: 'trois attaquants, il ne recule jamais, et pousse encore plus quand il est mené',
  pressing: 'il étouffe le milieu au pressing : ses joueurs fatiguent vite et prennent des cartons',
  cunning: 'milieu renforcé, ballons longs, et il adore saboter tes joueurs',
};

interface StylePlan {
  formation: Formation;
  instructions: Instructions;
  /** Minute à partir de laquelle il pousse quand il est mené. */
  chaseFrom: number;
  /** Minute à partir de laquelle il protège son avance. */
  protectFrom: number;
  /** Goût pour chaque catégorie de capacité, en plus de la situation du match. */
  taste: Record<AbilityCategory, number>;
}

const NEUTRAL_TASTE: Record<AbilityCategory, number> = { attack: 1, defense: 1, sabotage: 1, support: 1, legendary: 1 };

export const AI_STYLE_PLAN: Record<AiStyle, StylePlan> = {
  bus: {
    formation: '5-3-2',
    instructions: { mentality: 'defensive', highPress: false, longBall: true },
    chaseFrom: 75,
    protectFrom: 45,
    taste: { ...NEUTRAL_TASTE, defense: 1.8, attack: 0.7 },
  },
  attack: {
    formation: '4-3-3',
    instructions: { mentality: 'offensive', highPress: false, longBall: false },
    chaseFrom: 50,
    protectFrom: 85,
    taste: { ...NEUTRAL_TASTE, attack: 1.8, defense: 0.6 },
  },
  pressing: {
    formation: '4-4-2',
    instructions: { mentality: 'balanced', highPress: true, longBall: false },
    chaseFrom: 60,
    protectFrom: 70,
    taste: { ...NEUTRAL_TASTE, support: 1.5 },
  },
  cunning: {
    formation: '4-5-1',
    instructions: { mentality: 'balanced', highPress: false, longBall: true },
    chaseFrom: 65,
    protectFrom: 60,
    taste: { ...NEUTRAL_TASTE, sabotage: 2 },
  },
};

/** Style d'un club IA, stable : tiré de son identifiant. */
export function aiStyleOf(clubId: string): AiStyle {
  let hash = 0;
  for (const char of clubId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AI_STYLES[hash % AI_STYLES.length]!;
}

/** Consignes voulues à cette minute, selon le score : son plan, sinon tout devant ou tout derrière. */
export function tacticsFor(style: AiStyle, goalDifference: number, minute: number): Instructions {
  const plan = AI_STYLE_PLAN[style];
  if (goalDifference < 0 && minute >= plan.chaseFrom) {
    return { mentality: 'offensive', highPress: style !== 'bus', longBall: plan.instructions.longBall };
  }
  if (goalDifference > 0 && minute >= plan.protectFrom) {
    return { mentality: 'defensive', highPress: false, longBall: true };
  }
  return plan.instructions;
}
