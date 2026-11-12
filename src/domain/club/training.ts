import type { AttributeName, MatchStat, Player, Position, TrainingFocus } from '../types';
import { gainXp, MAX_LEVEL } from '../abilities/progression';
import { focusRaisesOverall, overall } from '../player/rating';

/**
 * Entraînement hebdomadaire (TRAIN-01 à TRAIN-05) : chaque joueur suit un programme.
 * Aucun coût : l'âge et le potentiel fixent le rythme.
 */

/** Points d'attribut gagnés par semaine selon l'âge. */
const AGE_RATES: readonly { maxAge: number; rate: number }[] = [
  { maxAge: 23, rate: 0.35 },
  { maxAge: 27, rate: 0.2 },
  { maxAge: 31, rate: 0.1 },
  { maxAge: Number.POSITIVE_INFINITY, rate: 0.04 },
];

/** Au-delà de son potentiel, un joueur progresse quatre fois moins vite, et jamais de plus de 5 points. */
const BEYOND_POTENTIAL_RATE = 0.25;
export const MAX_POINTS_BEYOND_POTENTIAL = 5;
const MAX_ATTRIBUTE = 99;
/**
 * XP de capacité par semaine de travail spécifique (TRAIN-05) : bien plus qu'en match, où une activation
 * rapporte 10 à 30 XP et coûte de la gueulante. Les jeunes apprennent plus vite, mais un vétéran progresse
 * encore : le potentiel ne limite pas la capacité.
 */
const ABILITY_XP_BY_AGE: readonly { maxAge: number; xp: number }[] = [
  { maxAge: 23, xp: 60 },
  { maxAge: 27, xp: 50 },
  { maxAge: 31, xp: 40 },
  { maxAge: Number.POSITIVE_INFINITY, xp: 30 },
];

/** Bonus du prochain match : plus faible sur les stats générales, qui pèsent sur toutes les lignes. */
const MATCH_BONUS: Partial<Record<TrainingFocus, number>> = {
  shooting: 0.05,
  defense: 0.05,
  goalkeeping: 0.05,
  speed: 0.03,
  technique: 0.03,
  physical: 0.03,
};

const DEFAULT_FOCUS: Record<Position, TrainingFocus> = { GK: 'goalkeeping', DEF: 'defense', MID: 'technique', ATT: 'shooting' };

export function defaultTrainingFocus(position: Position): TrainingFocus {
  return DEFAULT_FOCUS[position];
}

/** Rythme du joueur sur son programme, en points d'attribut par semaine. 0 = plafond atteint. */
export function trainingRate(player: Player, focus: TrainingFocus = player.training.focus): number {
  const rate = AGE_RATES.find((entry) => player.age <= entry.maxAge)!.rate;
  const rating = overall(player);
  if (rating < player.potential) return rate;
  const capped = focus !== 'ability' && focusRaisesOverall(player.position, focus) && rating >= player.potential + MAX_POINTS_BEYOND_POTENTIAL;
  return capped ? 0 : rate * BEYOND_POTENTIAL_RATE;
}

/** Bonus accordé au prochain match par le programme suivi, `null` pour un travail de capacité. */
export function trainingMatchBonus(focus: TrainingFocus): { stat: MatchStat; value: number } | null {
  const value = MATCH_BONUS[focus];
  return value === undefined ? null : { stat: focus as MatchStat, value };
}

/** XP de capacité gagnée en une semaine de travail spécifique, centre d'entraînement compris (CLUB-09). */
export function abilityTrainingXp(player: Player, facilityFactor = 1): number {
  if (player.ability.level >= MAX_LEVEL) return 0;
  const base = ABILITY_XP_BY_AGE.find((entry) => player.age <= entry.maxAge)!.xp;
  return Math.round(base * facilityFactor);
}

function trainAbility(player: Player, facilityFactor: number): Player {
  const xp = abilityTrainingXp(player, facilityFactor);
  return xp === 0 ? player : { ...player, ability: gainXp(player.ability, xp) };
}

function trainAttribute(player: Player, focus: AttributeName, rate: number): Player {
  let progress = player.training.progress + rate;
  let value = player.attributes[focus];
  while (progress >= 1 && value < MAX_ATTRIBUTE) {
    value += 1;
    progress -= 1;
  }
  return { ...player, attributes: { ...player.attributes, [focus]: value }, training: { focus, progress } };
}

/** Une semaine d'entraînement. Un blessé ne s'entraîne pas. `facilityFactor` : centre d'entraînement (CLUB-09). */
export function trainPlayer(player: Player, facilityFactor = 1): Player {
  if (player.injuryWeeks > 0) return player;
  const { focus } = player.training;
  if (focus === 'ability') return trainAbility(player, facilityFactor);
  return trainAttribute(player, focus, trainingRate(player) * facilityFactor);
}
