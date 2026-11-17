import type { Club, Division } from '../types';
import type { Rng } from '../core/rng';
import { clampGauge, GAUGE_MIN, type MatchOutcome } from './model';

/**
 * Le président (CLUB-04, CLUB-05) : objectifs de saison, confiance de 0 à 100,
 * licenciement à zéro et bilan de fin de saison.
 */

export const INITIAL_PRESIDENT_CONFIDENCE = 60;

export type LeagueGoal = 'survival' | 'midTable' | 'promotion' | 'title';

export interface SeasonObjective {
  league: LeagueGoal;
  /** Classement à atteindre (ou mieux). */
  targetPosition: number;
  /** Nombre de tours de coupe à franchir (UNIV-06). */
  cupRoundsToWin: number;
  /** Discours du président, pour l'écran de début de saison. */
  speech: string;
}

/** Seuils sur le rang de réputation relatif dans la division (0 = meilleur, 1 = pire). */
const TITLE_RANK_SHARE = 0.1;
const PROMOTION_RANK_SHARE = 0.35;
const MID_TABLE_RANK_SHARE = 0.65;

const CUP_ROUNDS_BY_GOAL: Record<LeagueGoal, number> = { survival: 1, midTable: 1, promotion: 2, title: 3 };

const GOAL_LABEL: Record<LeagueGoal, string> = {
  survival: 'le maintien',
  midTable: 'le milieu de tableau',
  promotion: 'la montée',
  title: 'le titre',
};

/** Discours mégalos : {club}, {objectif} et {coupe} sont remplacés. */
const SPEECHES: Record<LeagueGoal, readonly string[]> = {
  survival: [
    "Objectif : {objectif}, et {coupe} tour(s) de coupe. Je ne te demande pas la lune, juste de ne pas couler {club}. Mon beau-frère a déjà imprimé les écharpes « On est toujours là ».",
    "On vise {objectif} et {coupe} tour(s) de coupe. Si on descend, je vends le club-house et je garde la tireuse. Pour moi.",
  ],
  midTable: [
    "Je veux {objectif} et {coupe} tour(s) de coupe. Être tranquille en mars, pouvoir aller aux sports d'hiver sans regarder le classement. C'est tout ce que je demande.",
    "Objectif : {objectif}, et passer {coupe} tour(s) en coupe. Ni gloire ni honte, comme ma vie de couple. Ne me déçois pas.",
  ],
  promotion: [
    "Cette saison, c'est {objectif}, coach. Et {coupe} tours de coupe minimum. J'ai déjà promis la montée au maire, au curé et au patron du PMU.",
    "On monte. {objectif}, et {coupe} tours de coupe. J'ai fait graver la plaque, alors si on rate, c'est ton nom que je fais graver dessus.",
  ],
  title: [
    "Je veux {objectif}. Le titre, coach. Et {coupe} tours de coupe. Mon statut sur Facebook est déjà rédigé, il ne manque que le trophée.",
    "{objectif}, rien d'autre. Et {coupe} tours de coupe. {club} est né pour gagner, comme moi. Enfin, comme mon père, qui a monté la boîte.",
  ],
};

export interface ObjectiveInput {
  club: Club;
  division: Division;
  clubs: Record<string, Club>;
  rng: Rng;
}

/** Rang de réputation du club dans sa division, entre 0 (le plus coté) et 1 (le moins coté). */
function reputationRankShare({ club, division, clubs }: ObjectiveInput): number {
  const rivals = division.clubIds.filter((id) => id !== club.id).map((id) => clubs[id]);
  const betterRivals = rivals.filter((rival) => rival && rival.reputation > club.reputation).length;
  return rivals.length === 0 ? 0 : betterRivals / rivals.length;
}

function leagueGoal(rankShare: number, canBePromoted: boolean): LeagueGoal {
  if (rankShare <= TITLE_RANK_SHARE) return 'title';
  if (rankShare <= PROMOTION_RANK_SHARE) return canBePromoted ? 'promotion' : 'midTable';
  if (rankShare <= MID_TABLE_RANK_SHARE) return 'midTable';
  return 'survival';
}

function targetPosition(goal: LeagueGoal, division: Division): number {
  const size = division.clubIds.length;
  switch (goal) {
    case 'title':
      return 1;
    case 'promotion':
      return Math.max(1, division.promoted);
    case 'midTable':
      return Math.ceil(size / 2);
    case 'survival':
      return size - division.relegated;
  }
}

/** Objectifs fixés par le président en début de saison selon la division et la réputation (CLUB-04). */
export function seasonObjective(input: ObjectiveInput): SeasonObjective {
  const league = leagueGoal(reputationRankShare(input), input.division.promoted > 0);
  const cupRoundsToWin = CUP_ROUNDS_BY_GOAL[league];
  const speech = input.rng
    .pick(SPEECHES[league])
    .replaceAll('{objectif}', GOAL_LABEL[league])
    .replaceAll('{coupe}', String(cupRoundsToWin))
    .replaceAll('{club}', input.club.name);
  return { league, targetPosition: targetPosition(league, input.division), cupRoundsToWin, speech };
}

// ---------------------------------------------------------------------------
// Confiance (CLUB-05)
// ---------------------------------------------------------------------------

export type MatchExpectation = 'favourite' | 'even' | 'underdog';

const HOME_REPUTATION_EDGE = 5;
const EXPECTATION_REPUTATION_GAP = 10;
/** Variation de confiance selon le résultat et ce que le président attendait. */
const MATCH_CONFIDENCE_DELTA: Record<MatchExpectation, Record<MatchOutcome, number>> = {
  favourite: { win: 3, draw: -2, loss: -5 },
  even: { win: 4, draw: 0, loss: -3 },
  underdog: { win: 6, draw: 2, loss: 0 },
};
const BIG_SCORE_MARGIN = 4;
const HUMILIATION_CONFIDENCE_PENALTY = -5;
const THRASHING_CONFIDENCE_BONUS = 2;

const MATCH_REACTION: Record<MatchOutcome, string> = {
  win: 'Le président offre une tournée et parle déjà de toi au conseil municipal.',
  draw: 'Le président hausse les épaules et repart avec la caisse de la buvette.',
  loss: 'Le président claque la porte du club-house. La porte ne s’en remet pas.',
};

/** Ce que le président attend d'un match, d'après les réputations et le terrain. */
export function matchExpectation(ownReputation: number, opponentReputation: number, isHome: boolean): MatchExpectation {
  const gap = ownReputation - opponentReputation + (isHome ? HOME_REPUTATION_EDGE : 0);
  if (gap >= EXPECTATION_REPUTATION_GAP) return 'favourite';
  if (gap <= -EXPECTATION_REPUTATION_GAP) return 'underdog';
  return 'even';
}

export interface MatchReview {
  outcome: MatchOutcome;
  expectation: MatchExpectation;
  /** Buts marqués moins buts encaissés. */
  goalDifference: number;
}

export interface ConfidenceChange {
  confidence: number;
  delta: number;
  message: string;
}

/** Confiance après un match : résultat comparé à l'attente du président (CLUB-05). */
export function confidenceAfterMatch(confidence: number, review: MatchReview): ConfidenceChange {
  let delta = MATCH_CONFIDENCE_DELTA[review.expectation][review.outcome];
  if (review.goalDifference <= -BIG_SCORE_MARGIN) delta += HUMILIATION_CONFIDENCE_PENALTY;
  if (review.goalDifference >= BIG_SCORE_MARGIN) delta += THRASHING_CONFIDENCE_BONUS;
  const next = clampGauge(confidence + delta);
  return { confidence: next, delta: next - confidence, message: MATCH_REACTION[review.outcome] };
}

/** Humeur des sponsors après un match : ils aiment gagner, et le faire savoir. */
const SPONSOR_MOOD_DELTA: Record<MatchOutcome, number> = { win: 4, draw: 0, loss: -4 };

/** À partir de 3 victoires (ou défaites) de suite, chaque match pèse plus lourd. */
export const STREAK_THRESHOLD = 3;
export const STREAK_CONFIDENCE = 2;
export const STREAK_SPONSOR_MOOD = 2;

/** Bonus ou malus de série, après mise à jour de la série avec le match du jour. */
export function streakEffect(streak: { wins: number; losses: number }): { confidence: number; sponsorMood: number } {
  if (streak.wins >= STREAK_THRESHOLD) return { confidence: STREAK_CONFIDENCE, sponsorMood: STREAK_SPONSOR_MOOD };
  if (streak.losses >= STREAK_THRESHOLD) return { confidence: -STREAK_CONFIDENCE, sponsorMood: -STREAK_SPONSOR_MOOD };
  return { confidence: 0, sponsorMood: 0 };
}

export function sponsorMoodAfterMatch(mood: number, outcome: MatchOutcome): number {
  return clampGauge(mood + SPONSOR_MOOD_DELTA[outcome]);
}

/** Tendance hebdomadaire selon le classement : objectif en vue ou zone rouge (CLUB-04, CLUB-05). */
export const ON_TRACK_WEEKLY_CONFIDENCE = 1;
export const DANGER_ZONE_WEEKLY_CONFIDENCE = -1;

export function confidenceTrend(position: number, objective: SeasonObjective, divisionSize: number, relegated: number): number {
  if (position <= objective.targetPosition) return ON_TRACK_WEEKLY_CONFIDENCE;
  if (relegated > 0 && position > divisionSize - relegated) return DANGER_ZONE_WEEKLY_CONFIDENCE;
  return 0;
}

/** À zéro de confiance, le coach est licencié (CLUB-05). */
export function isFired(confidence: number): boolean {
  return confidence <= GAUGE_MIN;
}

// ---------------------------------------------------------------------------
// Bilan de fin de saison (CLUB-04)
// ---------------------------------------------------------------------------

const LEAGUE_MET_BONUS = 15;
const LEAGUE_MISSED_PENALTY = -10;
const CUP_MET_BONUS = 5;
const CUP_MISSED_PENALTY = -3;

export interface SeasonResult {
  finalPosition: number;
  cupRoundsWon: number;
}

export interface SeasonReview {
  leagueMet: boolean;
  cupMet: boolean;
  confidenceDelta: number;
  verdict: string;
}

function seasonVerdict(leagueMet: boolean, cupMet: boolean): string {
  if (leagueMet && cupMet) return 'Le président pleure dans tes bras et fait graver ton nom sur le comptoir de la buvette.';
  if (leagueMet) return 'Objectif atteint en championnat. Pour la coupe, le président fait semblant de ne pas avoir vu.';
  if (cupMet) return 'Joli parcours en coupe, mais le championnat… Le président te parle désormais par SMS.';
  return 'Aucun objectif atteint. Le président a fait changer la serrure de ton bureau, « par sécurité ».';
}

/** Compare la saison aux objectifs fixés et renvoie la variation de confiance (CLUB-04, CLUB-05). */
export function reviewSeason(objective: SeasonObjective, result: SeasonResult): SeasonReview {
  const leagueMet = result.finalPosition <= objective.targetPosition;
  const cupMet = result.cupRoundsWon >= objective.cupRoundsToWin;
  const confidenceDelta =
    (leagueMet ? LEAGUE_MET_BONUS : LEAGUE_MISSED_PENALTY) + (cupMet ? CUP_MET_BONUS : CUP_MISSED_PENALTY);
  return { leagueMet, cupMet, confidenceDelta, verdict: seasonVerdict(leagueMet, cupMet) };
}
