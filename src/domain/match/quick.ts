/**
 * Simulation rapide des matchs IA contre IA (green code) : pas de minute par minute,
 * les buts attendus sont calculés une fois à partir des mêmes forces et consignes
 * que la simulation détaillée, puis tirés selon une loi de Poisson. Les capacités
 * spéciales n'y sont pas jouées ; cartons et blessures, si (C2), aux mêmes taux qu'en direct.
 */
import type { MatchResult, Player, Position } from '../types';
import type { Rng } from '../core/rng';
import { effectiveRating, FORMATION_SLOTS, injuryRisk } from '../player/rating';
import { SERIOUS_INJURY_CHANCE, SERIOUS_INJURY_WEEKS_MAX, SERIOUS_INJURY_WEEKS_MIN } from './actions';
import { cardChances, FOULER_WEIGHTS, foulRate, SUSPENSION_DIRECT_RED, SUSPENSION_SECOND_YELLOW } from './discipline';
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

/** En moyenne, un titulaire finit un match simulé à mi-chemin de sa fatigue d'après-match. */
const QUICK_MID_MATCH_FATIGUE = 20;

/** Cartons et blessures d'un match simulé, mêmes taux qu'en direct (C2). */
export interface QuickIncidents {
  cards: { playerId: string; card: 'yellow' | 'red'; suspension: number }[];
  /** Blessures sérieuses seulement : une petite blessure ne dure que le match. */
  injuries: { playerId: string; weeks: number }[];
}

export interface QuickMatch {
  result: MatchResult;
  incidents: QuickIncidents;
}

interface QuickTeam extends TacticalSide {
  sheet: TeamSheet;
  shooting: number;
}

export function simulateQuick(home: TeamSheet, away: TeamSheet, rng: Rng, knockout = false, derby = false): QuickMatch {
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
  const incidents: QuickIncidents = { cards: [], injuries: [] };
  for (const sheet of [home, away]) {
    drawCards(rng, sheet, derby, incidents);
    drawInjuries(rng, sheet, incidents);
  }
  return { result, incidents };
}

/** Une faute possible par minute, comme en direct ; le fautif est tiré selon son poste. */
function drawCards(rng: Rng, sheet: TeamSheet, derby: boolean, incidents: QuickIncidents): void {
  const slots = FORMATION_SLOTS[sheet.formation];
  const yellows = new Map<string, number>();
  const sentOff = new Set<string>();
  const rate = foulRate(sheet.instructions.highPress);
  for (let minute = 0; minute < REGULATION_MINUTES + AVERAGE_STOPPAGE; minute++) {
    if (!rng.chance(rate)) continue;
    const fouler = pickByLine(rng, sheet.starters.filter((player) => !sentOff.has(player.id)), slots, sheet.starters);
    if (!fouler) continue;
    const booked = (yellows.get(fouler.id) ?? 0) > 0;
    const chances = cardChances({ fatigue: fouler.fatigue + QUICK_MID_MATCH_FATIGUE, distraction: 0, derby, booked });
    const roll = rng.next();
    if (roll < chances.red) {
      incidents.cards.push({ playerId: fouler.id, card: 'red', suspension: SUSPENSION_DIRECT_RED });
      sentOff.add(fouler.id);
    } else if (roll < chances.red + chances.yellow) {
      yellows.set(fouler.id, (yellows.get(fouler.id) ?? 0) + 1);
      incidents.cards.push({ playerId: fouler.id, card: 'yellow', suspension: 0 });
      if (booked) {
        incidents.cards.push({ playerId: fouler.id, card: 'red', suspension: SUSPENSION_SECOND_YELLOW });
        sentOff.add(fouler.id);
      }
    }
  }
}

function pickByLine(rng: Rng, players: readonly Player[], slots: readonly Position[], starters: readonly Player[]): Player | undefined {
  const weightOf = (player: Player) => FOULER_WEIGHTS[slots[starters.indexOf(player)] ?? player.position];
  let total = 0;
  for (const player of players) total += weightOf(player);
  let roll = rng.next() * total;
  for (const player of players) {
    roll -= weightOf(player);
    if (roll < 0) return player;
  }
  return undefined;
}

/** Chaque titulaire risque la blessure selon sa fatigue, comme en direct ; une sur dix est sérieuse. */
function drawInjuries(rng: Rng, sheet: TeamSheet, incidents: QuickIncidents): void {
  for (const player of sheet.starters) {
    const midMatch = { ...player, fatigue: Math.min(100, player.fatigue + QUICK_MID_MATCH_FATIGUE) };
    if (!rng.chance(injuryRisk(midMatch))) continue;
    if (rng.chance(SERIOUS_INJURY_CHANCE)) incidents.injuries.push({ playerId: player.id, weeks: rng.int(SERIOUS_INJURY_WEEKS_MIN, SERIOUS_INJURY_WEEKS_MAX) });
  }
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
