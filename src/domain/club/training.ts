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

/**
 * Hors programme, le joueur progresse un peu quand même : un quart de son rythme sur les stats qui comptent
 * à son poste (la plus faible d'abord), et un peu d'XP de capacité quand il ne la travaille pas.
 */
const PASSIVE_ATTRIBUTE_SHARE = 0.25;
const PASSIVE_ABILITY_XP_BY_AGE: readonly { maxAge: number; xp: number }[] = [
  { maxAge: 23, xp: 9 },
  { maxAge: 27, xp: 8 },
  { maxAge: 31, xp: 6 },
  { maxAge: Number.POSITIVE_INFINITY, xp: 5 },
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

/** Points d'attribut gagnés par semaine hors programme. */
export function passiveAttributeRate(player: Player): number {
  const focus = player.training.focus;
  // Le plafond suit le programme s'il porte sur une stat du poste ; sinon celui d'une stat du poste.
  const reference: TrainingFocus = focus !== 'ability' && focusRaisesOverall(player.position, focus) ? focus : POSITION_STATS[player.position][0]!;
  return trainingRate(player, reference) * PASSIVE_ATTRIBUTE_SHARE;
}

/** XP de capacité gagnée par semaine hors programme (0 quand on la travaille déjà). */
export function passiveAbilityXp(player: Player): number {
  if (player.training.focus === 'ability' || player.ability.level >= MAX_LEVEL) return 0;
  return PASSIVE_ABILITY_XP_BY_AGE.find((entry) => player.age <= entry.maxAge)!.xp;
}

/** Stats qui comptent à chaque poste, de la plus importante à la moins importante. */
const POSITION_STATS: Record<Position, AttributeName[]> = {
  GK: ['goalkeeping', 'physical', 'speed'],
  DEF: ['defense', 'physical', 'speed', 'technique'],
  MID: ['technique', 'speed', 'physical', 'shooting', 'defense'],
  ATT: ['shooting', 'speed', 'technique', 'physical'],
};

/** Poids des stats dans le choix hors programme, de la plus importante du poste à la moins importante. */
const PASSIVE_STAT_WEIGHTS = [1, 0.6, 0.45, 0.35, 0.3];

/**
 * Progression hors programme : de temps en temps, une stat du poste (hors programme) gagne un point,
 * de préférence une stat importante et encore basse.
 */
function passiveProgress(player: Player, facilityFactor: number): Player {
  let current = player;
  const xp = passiveAbilityXp(current);
  if (xp > 0) current = { ...current, ability: gainXp(current.ability, Math.round(xp * facilityFactor)) };
  let passive = (current.training.passive ?? 0) + passiveAttributeRate(current) * facilityFactor;
  let attributes = current.attributes;
  while (passive >= 1) {
    const stats = POSITION_STATS[current.position];
    const score = (name: AttributeName) => PASSIVE_STAT_WEIGHTS[stats.indexOf(name)]! * (MAX_ATTRIBUTE - attributes[name]);
    const candidates = stats.filter((name) => name !== current.training.focus && attributes[name] < MAX_ATTRIBUTE);
    const weakest = candidates.sort((a, b) => score(b) - score(a))[0];
    if (!weakest) break;
    attributes = { ...attributes, [weakest]: attributes[weakest] + 1 };
    passive -= 1;
  }
  return { ...current, attributes, training: { ...current.training, passive } };
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
  return { ...player, attributes: { ...player.attributes, [focus]: value }, training: { ...player.training, focus, progress } };
}

/**
 * Une semaine d'entraînement : le programme, puis un peu de progression sur le reste.
 * Un blessé ne s'entraîne pas. `facilityFactor` : centre d'entraînement (CLUB-09).
 */
export function trainPlayer(player: Player, facilityFactor = 1): Player {
  if (player.injuryWeeks > 0) return player;
  const { focus } = player.training;
  const trained = focus === 'ability' ? trainAbility(player, facilityFactor) : trainAttribute(player, focus, trainingRate(player) * facilityFactor);
  return passiveProgress(trained, facilityFactor);
}
