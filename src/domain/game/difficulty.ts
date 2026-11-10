/** Difficulté choisie en début de partie (UNIV-07). */
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultySettings {
  label: string;
  description: string;
  /** Confiance du président au départ et après un rebond. */
  startConfidence: number;
  /** Multiplie chaque perte de confiance. */
  confidenceLossFactor: number;
  /** Multiplie le budget de départ du club du coach. */
  budgetFactor: number;
  /** Bonus ou malus de toutes les stats des adversaires en match. */
  opponentBoost: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultySettings> = {
  easy: {
    label: 'Facile',
    description: 'Président patient, budget confortable, adversaires un peu moins forts.',
    startConfidence: 75,
    confidenceLossFactor: 0.6,
    budgetFactor: 1.5,
    opponentBoost: -0.1,
  },
  normal: {
    label: 'Normal',
    description: 'Le jeu tel qu’il a été pensé.',
    startConfidence: 60,
    confidenceLossFactor: 1,
    budgetFactor: 1,
    opponentBoost: 0,
  },
  hard: {
    label: 'Difficile',
    description: 'Président nerveux, caisses vides, adversaires plus coriaces.',
    startConfidence: 50,
    confidenceLossFactor: 1.4,
    budgetFactor: 0.7,
    opponentBoost: 0.1,
  },
};

/** Applique la difficulté à une variation de confiance : seules les pertes sont modifiées. */
export function scaleConfidenceDelta(delta: number, difficulty: Difficulty): number {
  return delta < 0 ? Math.round(delta * DIFFICULTIES[difficulty].confidenceLossFactor) : delta;
}
