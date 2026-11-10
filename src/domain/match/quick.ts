/**
 * Simulation rapide des matchs IA contre IA (green code) : pas de minute par minute,
 * les buts attendus sont calculés une fois à partir des mêmes forces et consignes
 * que la simulation détaillée, puis tirés selon une loi de Poisson. Les capacités
 * spéciales n'y sont pas jouées.
 */
import type { MatchResult, Player, Position } from '../types';
import type { Rng } from '../core/rng';
import { effectiveRating, FORMATION_SLOTS } from '../player/rating';
import {
  baseChanceRate,
  expectedConversion,
  HOME_ADVANTAGE,
  REGULATION_MINUTES,
  SHOOTER_WEIGHTS,
  type TacticalSide,
} from './plays';
import { pickAssister } from './assists';
import { runShootout, shootoutConversion } from './shootout';
import { addContribution, createStrength } from './strength';
import type { TeamSheet } from './types';

/** Temps additionnel moyen. */
const AVERAGE_STOPPAGE = 5;
/** Part des buts venant des coups de pied arrêtés et penalties, en plus du jeu. */
const SET_PIECE_FACTOR = 1.35;

interface QuickTeam extends TacticalSide {
  sheet: TeamSheet;
  shooting: number;
}

export function simulateQuick(home: TeamSheet, away: TeamSheet, rng: Rng, knockout = false): MatchResult {
  const homeTeam = assess(home);
  const awayTeam = assess(away);
  const homeGoals = samplePoisson(rng, expectedGoals(homeTeam, awayTeam, HOME_ADVANTAGE));
  const awayGoals = samplePoisson(rng, expectedGoals(awayTeam, homeTeam, 1));
  const result: MatchResult = {
    homeGoals,
    awayGoals,
    scorers: [...drawScorers(rng, homeTeam, homeGoals), ...drawScorers(rng, awayTeam, awayGoals)].sort(
      (a, b) => a.minute - b.minute,
    ),
  };
  if (knockout && homeGoals === awayGoals) {
    const shootout = runShootout(
      rng,
      shootoutConversion(homeTeam.shooting, awayTeam.strength.keeper),
      shootoutConversion(awayTeam.shooting, homeTeam.strength.keeper),
    );
    result.penaltyWinnerId = shootout.winner === 'home' ? home.clubId : away.clubId;
  }
  return result;
}

function assess(sheet: TeamSheet): QuickTeam {
  const slots = FORMATION_SLOTS[sheet.formation];
  const strength = createStrength();
  const ratings = sheet.starters.map((player, index) => effectiveRating(player, slots[index] ?? player.position));
  ratings.forEach((rating, index) => addContribution(strength, slots[index] ?? 'MID', rating));
  return { sheet, instructions: sheet.instructions, strength, shooting: averageShooting(sheet, ratings) };
}

/** Note moyenne des tireurs, pondérée comme le choix du tireur en match. */
function averageShooting(sheet: TeamSheet, ratings: number[]): number {
  const slots = FORMATION_SLOTS[sheet.formation];
  let total = 0;
  let weights = 0;
  ratings.forEach((rating, index) => {
    const weight = SHOOTER_WEIGHTS[slots[index] ?? 'MID'];
    total += rating * weight;
    weights += weight;
  });
  return weights > 0 ? total / weights : 0;
}

function expectedGoals(attacking: QuickTeam, defending: QuickTeam, venue: number): number {
  const chances = baseChanceRate(attacking, defending) * venue * (REGULATION_MINUTES + AVERAGE_STOPPAGE);
  const skill = attacking.shooting / Math.max(1, defending.strength.keeper);
  return chances * expectedConversion(skill, attacking.instructions, defending.instructions) * SET_PIECE_FACTOR;
}

/** Tirage de Poisson (méthode de Knuth), suffisant pour quelques buts. */
function samplePoisson(rng: Rng, mean: number): number {
  const limit = Math.exp(-mean);
  let count = 0;
  let product = rng.next();
  while (product > limit) {
    count++;
    product *= rng.next();
  }
  return count;
}

function drawScorers(rng: Rng, team: QuickTeam, goals: number): MatchResult['scorers'] {
  const slots = FORMATION_SLOTS[team.sheet.formation];
  const scorers: MatchResult['scorers'] = [];
  for (let goal = 0; goal < goals; goal++) {
    const scorer = pickScorer(rng, team.sheet.starters, slots);
    if (!scorer) continue;
    const teammates = team.sheet.starters.flatMap((player, index) => (player === scorer ? [] : [{ player, line: slots[index] ?? player.position }]));
    const assister = pickAssister(rng, teammates, (entry) => entry.line);
    scorers.push({
      playerId: scorer.id,
      clubId: team.sheet.clubId,
      minute: rng.int(1, REGULATION_MINUTES),
      ...(assister ? { assistId: assister.player.id } : {}),
    });
  }
  return scorers;
}

function pickScorer(rng: Rng, starters: Player[], slots: readonly Position[]): Player | undefined {
  let total = 0;
  for (let i = 0; i < starters.length; i++) total += SHOOTER_WEIGHTS[slots[i] ?? 'MID'];
  let roll = rng.next() * total;
  for (let i = 0; i < starters.length; i++) {
    roll -= SHOOTER_WEIGHTS[slots[i] ?? 'MID'];
    if (roll < 0) return starters[i];
  }
  return starters[starters.length - 1];
}
