/**
 * Phases de jeu de la simulation minute par minute (MATCH-01) : occasions, tirs,
 * fautes, cartons, coups de pied arrêtés, penalties, blessures.
 */
import type { Instructions, Mentality, Position } from '../types';
import type { Rng } from '../core/rng';
import { clamp } from '../core/rng';
import { injuryRisk } from '../player/rating';
import { bookPlayer, injurePlayer, recordGoal } from './actions';
import { comment } from './commentary';
import { creditActive, IMPACT } from './impact';
import { isActive, opponentSide, pushEvent, teamOf, type Run } from './state';
import { createStrength, measureTeam, shootingValue, type TeamStrength } from './strength';
import type { ChanceKind, MatchPlayer, MatchState, Side, TeamState } from './types';
import { openTriggers } from './windows';

// --- Occasions -------------------------------------------------------------

/** Occasions par équipe et par minute entre deux équipes égales (~8 par match). */
export const BASE_CHANCE_RATE = 0.085;
/** Rapport attaque/défense de deux équipes égales en 4-4-2 : sert à neutraliser l'échelle. */
const NEUTRAL_ATTACK_DEFENSE_RATIO = 0.65;
const ATTACK_EXPONENT = 1;
const MIDFIELD_EXPONENT = 0.5;
/** Le jeu long saute le milieu : la bataille du milieu pèse deux fois moins. */
const LONG_BALL_MIDFIELD_SHARE = 0.5;
const HIGH_PRESS_MIDFIELD = 1.12;
export const HOME_ADVANTAGE = 1.1;
/** Match figé (Le Pleureur…) : beaucoup moins d'occasions des deux côtés. */
const FREEZE_FACTOR = 0.3;
const MAX_CHANCE_RATE = 0.45;
export const REGULATION_MINUTES = 90;

/** Effet de la mentalité sur ses propres occasions et sur celles concédées (MATCH-05). */
export const MENTALITY_ATTACK: Record<Mentality, number> = { defensive: 0.8, balanced: 1, offensive: 1.2 };
export const MENTALITY_EXPOSURE: Record<Mentality, number> = { defensive: 0.85, balanced: 1, offensive: 1.12 };

/** Probabilité de base de marquer selon le type d'occasion. */
const BASE_CONVERSION: Record<ChanceKind, number> = {
  open: 0.13,
  counter: 0.2,
  longShot: 0.05,
  setPiece: 0.09,
  penalty: 0.76,
};
const SHOOTING_EXPONENT = 0.7;
/** Sur penalty, le talent compte peu face au point blanc. */
const PENALTY_SKILL_EXPONENT = 0.3;
const MIN_SKILL_RATIO = 0.4;
const MAX_SKILL_RATIO = 2.5;
const EMPTY_NET_CONVERSION = 0.8;
const MIN_CONVERSION = 0.01;
const MAX_CONVERSION = 0.97;
const SAVE_SHARE = 0.5;
const CORNER_AFTER_SAVE = 0.3;

const COUNTER_SHARE = 0.2;
const LONG_SHOT_SHARE = 0.2;
const LONG_BALL_COUNTER_SHARE = 0.3;
const LONG_BALL_LONG_SHOT_SHARE = 0.25;
/** Face à un pressing haut, plus d'espaces dans le dos : plus de contres. */
const HIGH_PRESS_COUNTER_BONUS = 0.1;

export const SHOOTER_WEIGHTS: Record<Position, number> = { GK: 0, DEF: 0.5, MID: 2, ATT: 5 };
const HEADER_WEIGHTS: Record<Position, number> = { GK: 0, DEF: 2, MID: 1.5, ATT: 3 };

// --- Fautes et blessures ---------------------------------------------------

const FOUL_RATE = 0.11;
const HIGH_PRESS_FOULS = 1.25;
const YELLOW_ON_FOUL = 0.13;
const RED_ON_FOUL = 0.006;
const PENALTY_ON_FOUL = 0.012;
const DANGEROUS_FREE_KICK = 0.18;
const FOUL_COMMENT_CHANCE = 0.3;
const FOULER_WEIGHTS: Record<Position, number> = { GK: 0.1, DEF: 3, MID: 2, ATT: 1 };

const STARTERS = 11;
const HOME_SHARE = 0.5;
/** Un joueur tiré par minute parmi les 22 : on ramène `injuryRisk` (par match) à ce tirage. */
const INJURY_ROLL_SCALE = (2 * STARTERS) / REGULATION_MINUTES;

const scratchStrength = createStrength();

/** Une équipe vue par la simulation : ses consignes et la force de ses lignes. */
export interface TacticalSide {
  instructions: Instructions;
  strength: TeamStrength;
}

/** Occasions par minute d'après les forces et les consignes, hors terrain et gel (MATCH-01, MATCH-05). */
export function baseChanceRate(attacking: TacticalSide, defending: TacticalSide): number {
  const att = attacking.strength;
  const def = defending.strength;
  const attackRatio = att.attack / Math.max(1, def.defense) / NEUTRAL_ATTACK_DEFENSE_RATIO;
  const press = attacking.instructions.highPress ? HIGH_PRESS_MIDFIELD : 1;
  const midfieldRatio = (att.midfield * press) / Math.max(1, def.midfield);
  const midfieldExponent = MIDFIELD_EXPONENT * (attacking.instructions.longBall ? LONG_BALL_MIDFIELD_SHARE : 1);
  return (
    BASE_CHANCE_RATE *
    attackRatio ** ATTACK_EXPONENT *
    midfieldRatio ** midfieldExponent *
    MENTALITY_ATTACK[attacking.instructions.mentality] *
    MENTALITY_EXPOSURE[defending.instructions.mentality]
  );
}

/** Taux d'occasions de la minute : avantage du terrain et match figé compris. */
function chanceRate(state: MatchState, attacking: TacticalSide, defending: TacticalSide, side: Side): number {
  let rate = baseChanceRate(attacking, defending);
  if (side === 'home' && state.homeAdvantageCancelledUntil < state.elapsed) rate *= HOME_ADVANTAGE;
  if (state.frozenUntil >= state.elapsed) rate *= FREEZE_FACTOR;
  return clamp(rate, 0, MAX_CHANCE_RATE);
}

const homeSide: TacticalSide = { instructions: { mentality: 'balanced', highPress: false, longBall: false }, strength: createStrength() };
const awaySide: TacticalSide = { instructions: { mentality: 'balanced', highPress: false, longBall: false }, strength: createStrength() };

/** Au plus une occasion par minute, tirée avec un seul nombre aléatoire. */
export function playChances(run: Run, home: TeamStrength, away: TeamStrength): void {
  const { state, rng } = run;
  homeSide.instructions = state.home.instructions;
  homeSide.strength = home;
  awaySide.instructions = state.away.instructions;
  awaySide.strength = away;
  const homeRate = chanceRate(state, homeSide, awaySide, 'home');
  const awayRate = chanceRate(state, awaySide, homeSide, 'away');
  const roll = rng.next();
  if (roll < homeRate) playOpenChance(run, state.home, away);
  else if (roll < homeRate + awayRate) playOpenChance(run, state.away, home);
}

function playOpenChance(run: Run, attacking: TeamState, defense: TeamStrength): void {
  const shooter = pickWeighted(run.rng, attacking, run.state.elapsed, SHOOTER_WEIGHTS);
  if (!shooter) return;
  const defending = teamOf(run.state, opponentSide(attacking.side));
  takeShot(run, { attacking, shooter, kind: rollChanceKind(run.rng, attacking, defending), keeper: defense.keeper });
}

function chanceShares(attacking: Instructions, defending: Instructions): { counter: number; longShot: number } {
  const counter =
    (attacking.longBall ? LONG_BALL_COUNTER_SHARE : COUNTER_SHARE) + (defending.highPress ? HIGH_PRESS_COUNTER_BONUS : 0);
  return { counter, longShot: attacking.longBall ? LONG_BALL_LONG_SHOT_SHARE : LONG_SHOT_SHARE };
}

function rollChanceKind(rng: Rng, attacking: TeamState, defending: TeamState): ChanceKind {
  const shares = chanceShares(attacking.instructions, defending.instructions);
  const roll = rng.next();
  if (roll < shares.counter) return 'counter';
  if (roll < shares.counter + shares.longShot) return 'longShot';
  return 'open';
}

/** Conversion moyenne d'une occasion de jeu, pour la simulation rapide. `skill` = tireurs / gardien. */
export function expectedConversion(skill: number, attacking: Instructions, defending: Instructions): number {
  const shares = chanceShares(attacking, defending);
  const open = 1 - shares.counter - shares.longShot;
  const base =
    open * BASE_CONVERSION.open +
    shares.counter * BASE_CONVERSION.counter +
    shares.longShot * BASE_CONVERSION.longShot;
  return base * clamp(skill, MIN_SKILL_RATIO, MAX_SKILL_RATIO) ** SHOOTING_EXPONENT;
}

interface Shot {
  attacking: TeamState;
  shooter: MatchPlayer;
  kind: ChanceKind;
  keeper: number;
}

/** Résout un tir : annulation éventuelle, but, arrêt (parfois corner) ou tir non cadré. */
function takeShot(run: Run, shot: Shot): void {
  const { state, rng } = run;
  const { attacking, shooter, kind } = shot;
  const defending = teamOf(state, opponentSide(attacking.side));
  const vars = { player: shooter.name, team: attacking.name, opponent: defending.name };
  if (kind !== 'penalty' && defending.pendingCancels > 0) {
    defending.pendingCancels--;
    pushEvent(run, 'actionCancelled', attacking.side, comment(rng, 'actionCancelled', { ...vars, label: 'action annulée' }));
    creditActive(state, defending.side, IMPACT.actionCancelled, 'action adverse annulée');
    return;
  }
  if (rng.chance(conversionChance(state, shot, defending))) {
    recordGoal(run, attacking.side, shooter, { penalty: kind === 'penalty' });
    return;
  }
  creditActive(state, defending.side, IMPACT.chanceStopped, 'occasion adverse repoussée');
  reportMissedShot(run, shot, vars);
}

function reportMissedShot(run: Run, shot: Shot, vars: { player: string; team: string; opponent: string }): void {
  const { rng } = run;
  const side = shot.attacking.side;
  if (shot.kind === 'penalty') {
    pushEvent(run, 'save', side, comment(rng, 'penaltyMissed', vars), { playerId: shot.shooter.id });
    return;
  }
  if (shot.kind === 'setPiece') {
    pushEvent(run, 'miss', side, comment(rng, 'setPieceMissed', vars), { playerId: shot.shooter.id });
    return;
  }
  const saved = rng.chance(SAVE_SHARE);
  pushEvent(run, saved ? 'save' : 'miss', side, comment(rng, saved ? 'save' : 'miss', vars), {
    playerId: shot.shooter.id,
  });
  if (saved && rng.chance(CORNER_AFTER_SAVE)) announceSetPiece(run, side, 'corner');
}

function conversionChance(state: MatchState, shot: Shot, defending: TeamState): number {
  const exponent = shot.kind === 'penalty' ? PENALTY_SKILL_EXPONENT : SHOOTING_EXPONENT;
  const skill = clamp(shootingValue(shot.shooter) / Math.max(1, shot.keeper), MIN_SKILL_RATIO, MAX_SKILL_RATIO);
  let chance =
    defending.emptyNetUntil >= state.elapsed ? EMPTY_NET_CONVERSION : BASE_CONVERSION[shot.kind] * skill ** exponent;
  chance += consumeChanceBoost(shot.attacking, shot.kind);
  chance *= 1 - consumeShotMalus(defending);
  return clamp(chance, MIN_CONVERSION, MAX_CONVERSION);
}

/** Consomme le premier bonus d'occasion qui s'applique à ce type d'occasion. */
function consumeChanceBoost(team: TeamState, kind: ChanceKind): number {
  const index = team.chanceBoosts.findIndex(({ on }) => on === 'nextChance' || on === kind);
  if (index < 0) return 0;
  const [boost] = team.chanceBoosts.splice(index, 1);
  return boost!.value;
}

/** Consomme un tir du premier malus infligé par l'équipe qui défend. */
function consumeShotMalus(defending: TeamState): number {
  const malus = defending.shotMaluses[0];
  if (!malus) return 0;
  malus.shotsLeft--;
  if (malus.shotsLeft <= 0) defending.shotMaluses.shift();
  return clamp(malus.value, 0, 1);
}

// --- Coups de pied arrêtés et penalties -------------------------------------

/** Annonce un coup franc ou un corner, joué au tick suivant après la fenêtre éventuelle (CAP-19). */
export function announceSetPiece(run: Run, side: Side, kind: 'freeKick' | 'corner'): void {
  const { state } = run;
  if (state.pendingPlay) return;
  pushEvent(run, kind, side, comment(run.rng, kind, { team: teamOf(state, side).name }));
  state.pendingPlay = { kind, side, takerId: null };
  openTriggers(run, side, 'ownSetPiece', 'opponentSetPiece');
}

/** Siffle un penalty pour `side` (il remplace un coup de pied arrêté en attente). */
export function awardPenalty(run: Run, side: Side, takerId: string | null): void {
  const { state } = run;
  pushEvent(run, 'penalty', side, comment(run.rng, 'penalty', { team: teamOf(state, side).name }));
  state.pendingPlay = { kind: 'penalty', side, takerId };
  openTriggers(run, side, 'ownPenalty', 'opponentPenalty');
}

export function resolvePendingPlay(run: Run): void {
  const { state } = run;
  const play = state.pendingPlay;
  if (!play) return;
  state.pendingPlay = null;
  const attacking = teamOf(state, play.side);
  measureTeam(teamOf(state, opponentSide(play.side)), state.elapsed, scratchStrength);
  const shooter = chooseTaker(run, attacking, play.kind, play.takerId);
  if (!shooter) return;
  const kind: ChanceKind = play.kind === 'penalty' ? 'penalty' : 'setPiece';
  takeShot(run, { attacking, shooter, kind, keeper: scratchStrength.keeper });
}

function chooseTaker(run: Run, team: TeamState, kind: 'freeKick' | 'corner' | 'penalty', takerId: string | null) {
  const elapsed = run.state.elapsed;
  const designated = takerId ? team.players.find((player) => player.id === takerId) : undefined;
  if (designated && isActive(designated, elapsed)) return designated;
  if (kind === 'corner') return pickWeighted(run.rng, team, elapsed, HEADER_WEIGHTS);
  return bestShooter(team, elapsed);
}

function bestShooter(team: TeamState, elapsed: number): MatchPlayer | undefined {
  let best: MatchPlayer | undefined;
  let bestValue = -1;
  for (const player of team.players) {
    if (player.line === null || player.line === 'GK' || !isActive(player, elapsed)) continue;
    const value = shootingValue(player);
    if (value > bestValue) {
      best = player;
      bestValue = value;
    }
  }
  return best;
}

// --- Fautes ----------------------------------------------------------------

export function playFouls(run: Run, home: TeamStrength, away: TeamStrength): void {
  const { state, rng } = run;
  if (rng.chance(foulRate(state.home, home))) commitFoul(run, state.home);
  if (rng.chance(foulRate(state.away, away))) commitFoul(run, state.away);
}

function foulRate(team: TeamState, strength: TeamStrength): number {
  const press = team.instructions.highPress ? HIGH_PRESS_FOULS : 1;
  return clamp(FOUL_RATE * (1 + strength.aggression) * press, 0, 1);
}

function commitFoul(run: Run, team: TeamState): void {
  const { state, rng } = run;
  const fouler = pickWeighted(rng, team, state.elapsed, FOULER_WEIGHTS);
  if (!fouler) return;
  const vars = { player: fouler.name, team: team.name };
  if (team.foulsIgnored > 0) {
    team.foulsIgnored--;
    pushEvent(run, 'foul', team.side, comment(rng, 'foulIgnored', vars), { playerId: fouler.id });
    return;
  }
  const cardRoll = rng.next();
  const card = cardRoll < RED_ON_FOUL ? 'red' : cardRoll < RED_ON_FOUL + YELLOW_ON_FOUL ? 'yellow' : null;
  const booked = card ? bookPlayer(run, fouler, card) : null;
  const victim = opponentSide(team.side);
  const outcome = rng.next();
  if (outcome < PENALTY_ON_FOUL) awardPenalty(run, victim, null);
  else if (outcome < PENALTY_ON_FOUL + DANGEROUS_FREE_KICK) announceSetPiece(run, victim, 'freeKick');
  else if (!booked && rng.chance(FOUL_COMMENT_CHANCE)) {
    pushEvent(run, 'foul', team.side, comment(rng, 'foul', vars), { playerId: fouler.id });
  }
}

// --- Blessures -------------------------------------------------------------

/** Un titulaire tiré au hasard risque la blessure selon sa fatigue (EFF-04, EFF-05). */
export function rollInjury(run: Run): void {
  const { state, rng } = run;
  const team = rng.chance(HOME_SHARE) ? state.home : state.away;
  const player = team.players[rng.int(0, STARTERS - 1)];
  if (!player || !isActive(player, state.elapsed)) return;
  if (rng.chance(injuryRisk(player.profile) * INJURY_ROLL_SCALE)) injurePlayer(run, player);
}

// --- Utilitaires -----------------------------------------------------------

/** Tire un joueur actif selon le poids de sa ligne, sans allocation. */
function pickWeighted(rng: Rng, team: TeamState, elapsed: number, weights: Record<Position, number>) {
  let total = 0;
  for (const player of team.players) {
    if (player.line !== null && isActive(player, elapsed)) total += weights[player.line];
  }
  if (total <= 0) return undefined;
  let roll = rng.next() * total;
  for (const player of team.players) {
    if (player.line === null || !isActive(player, elapsed)) continue;
    roll -= weights[player.line];
    if (roll < 0) return player;
  }
  return undefined;
}
