import type { Club, Player } from '../types';
import { NEUTRAL_SPONSOR_MOOD, type MatchOutcome } from './model';

/**
 * Bilan financier hebdomadaire du club (CLUB-01) : recettes (sponsors, buvette,
 * primes de résultat) et dépenses (salaires).
 */

export interface FinanceLine {
  label: string;
  /** Positif = recette, négatif = dépense. */
  amount: number;
}

export interface WeeklyFinanceInput {
  /** Niveau de la division : 1 = élite, plus grand = plus bas. */
  divisionTier: number;
  /** Humeur des sponsors, 0 à 100. */
  sponsorMood: number;
  /** Résultat du match de la semaine, `null` sans match. */
  matchOutcome: MatchOutcome | null;
  homeMatch: boolean;
  /** Masse salariale hebdomadaire (voir `wageBill`). */
  wageBill: number;
  /** Multiplicateurs des installations (CLUB-09), 1 par défaut. */
  buvetteFactor?: number;
  sponsorFactor?: number;
}

/** Chaque division plus bas divise les montants par 1 / TIER_DECAY. */
const TIER_DECAY = 0.4;
const ELITE_SPONSOR_WEEKLY = 50_000;
const ELITE_BUVETTE_PER_HOME_MATCH = 20_000;
const ELITE_RESULT_BONUS: Record<MatchOutcome, number> = { win: 30_000, draw: 10_000, loss: 0 };
/** Humeur 0 = sponsors à moitié prix, 100 = sponsors à +50 %. */
const SPONSOR_MOOD_SPAN = 1;
const BUVETTE_HOME_WIN_FACTOR = 1.2;

/** Prime de fin de saison du champion de l'élite ; chaque division plus bas paie comme les sponsors. */
export const ELITE_CHAMPION_PRIZE = 600_000;
/** Le dernier du classement touche cette part de la prime du champion, linéaire entre les deux. */
const LAST_PLACE_PRIZE_SHARE = 0.1;
/** Prime du vainqueur de la coupe, ouverte à toutes les divisions : la même pour tous. */
export const CUP_WINNER_PRIZE = 100_000;
const PRIZE_ROUNDING = 100;

/** Prime de classement en fin de saison (CLUB-01) : selon la place et le niveau de la division. */
export function leaguePrize(divisionTier: number, position: number, clubCount: number): number {
  const share = clubCount <= 1 ? 1 : 1 - ((1 - LAST_PLACE_PRIZE_SHARE) * (position - 1)) / (clubCount - 1);
  return Math.round((ELITE_CHAMPION_PRIZE * tierFactor(divisionTier) * share) / PRIZE_ROUNDING) * PRIZE_ROUNDING;
}

/** Rapport entre les montants de deux divisions : 2,5 fois plus à chaque division plus haut. */
export function moneyFactorBetween(fromTier: number, toTier: number): number {
  return tierFactor(toTier) / tierFactor(fromTier);
}

function tierFactor(divisionTier: number): number {
  return TIER_DECAY ** Math.max(0, divisionTier - 1);
}

export function wageBill(players: readonly Player[]): number {
  return players.reduce((total, player) => total + player.salary, 0);
}

function sponsorIncome({ divisionTier, sponsorMood, sponsorFactor = 1 }: WeeklyFinanceInput): number {
  const moodFactor = 1 + ((sponsorMood - NEUTRAL_SPONSOR_MOOD) / 100) * SPONSOR_MOOD_SPAN;
  return Math.round(ELITE_SPONSOR_WEEKLY * tierFactor(divisionTier) * moodFactor * sponsorFactor);
}

function buvetteIncome({ divisionTier, homeMatch, matchOutcome, buvetteFactor = 1 }: WeeklyFinanceInput): number {
  if (!homeMatch || matchOutcome === null) return 0;
  const winFactor = matchOutcome === 'win' ? BUVETTE_HOME_WIN_FACTOR : 1;
  return Math.round(ELITE_BUVETTE_PER_HOME_MATCH * tierFactor(divisionTier) * winFactor * buvetteFactor);
}

function resultBonus({ divisionTier, matchOutcome }: WeeklyFinanceInput): number {
  if (matchOutcome === null) return 0;
  return Math.round(ELITE_RESULT_BONUS[matchOutcome] * tierFactor(divisionTier));
}

/** Lignes du bilan de la semaine (CLUB-01). Les lignes nulles sont omises. */
export function weeklyBalance(input: WeeklyFinanceInput): FinanceLine[] {
  const lines: FinanceLine[] = [
    { label: 'Sponsors', amount: sponsorIncome(input) },
    { label: 'Buvette', amount: buvetteIncome(input) },
    { label: 'Prime de résultat', amount: resultBonus(input) },
    { label: 'Salaires', amount: -input.wageBill },
  ];
  return lines.filter((line) => line.amount !== 0);
}

export function balanceTotal(lines: readonly FinanceLine[]): number {
  return lines.reduce((total, line) => total + line.amount, 0);
}

/** Renvoie le club avec le bilan de la semaine appliqué à son budget (qui peut devenir négatif). */
export function applyBalance(club: Club, lines: readonly FinanceLine[]): Club {
  return { ...club, budget: club.budget + balanceTotal(lines) };
}
