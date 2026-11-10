import type { AttributeName, MatchStat, Player, Position, TrainingFocus } from '../types';
import { levelForXp, MAX_LEVEL } from '../abilities/progression';
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
/** Un point d'attribut hebdomadaire équivaut à cette XP de capacité. */
const XP_PER_RATE_POINT = 15;

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

function trainAbility(player: Player, rate: number): Player {
  if (player.ability.level >= MAX_LEVEL || rate === 0) return player;
  const xp = player.ability.xp + Math.max(1, Math.round(rate * XP_PER_RATE_POINT));
  return { ...player, ability: { ...player.ability, xp, level: levelForXp(xp) } };
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
  const rate = trainingRate(player) * facilityFactor;
  return focus === 'ability' ? trainAbility(player, rate) : trainAttribute(player, focus, rate);
}
