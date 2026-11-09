import type { HouseRule, Player, TeamNight } from '../types';
import type { Rng } from '../core/rng';
import type { AbilityContext } from '../abilities/progression';
import { houseRuleMoralePenalty, TEAM_NIGHT_OPTIONS } from './discipline';
import { clampGauge, playerName, type AbilityLookup, type FrasqueEvent, type MatchOutcome } from './model';

/**
 * Vie de l'effectif entre deux matchs (EFF-04 à EFF-07, FRAS-01, FRAS-06) :
 * récupération, blessures, suspensions, moral et coups de sang des joueurs.
 */

/** Fatigue effacée en une semaine (EFF-04). */
const REST_RECOVERY = 35;
const PLAYED_RECOVERY = 27;

/** Moral (EFF-06). */
const PLAYED_MORALE = 3;
const BENCHED_MORALE = -2;
const RESULT_MORALE: Record<MatchOutcome, number> = { win: 4, draw: 0, loss: -4 };
const NEW_SUSPENSION_MORALE = -5;

/** Comportements de moral très bas (EFF-07). */
export const VERY_LOW_MORALE = 20;
/** Sous ce seuil, le joueur demande son transfert à coup sûr. */
export const CRITICAL_MORALE = 5;
const RANT_CHANCE = 0.3;
const REFUSAL_CHANCE = 0.2;
const TRANSFER_REQUEST_CHANCE = 0.15;

/** Une grosse soirée finit souvent dans le journal (FRAS-03). */
const BIG_NIGHT_PRESS_CHANCE = 0.35;

export interface WeeklySquadInput {
  squad: readonly Player[];
  /** Joueurs ayant joué le match de la semaine. */
  appearances: readonly string[];
  /** Résultat du match de la semaine, `null` sans match. */
  matchOutcome: MatchOutcome | null;
  houseRules: readonly HouseRule[];
  teamNight: TeamNight;
  abilityOf: AbilityLookup;
  rng: Rng;
}

export interface WeeklySquadResult {
  squad: Player[];
  /** Contexte des capacités pour le prochain match (CAP-14, FRAS-06). */
  abilityContext: AbilityContext;
  /** Frasques susceptibles de faire la une (FRAS-03). */
  events: FrasqueEvent[];
  /** Joueurs qui refusent de jouer le prochain match (EFF-07). */
  refusingToPlay: string[];
  messages: string[];
}

interface PlayerWeek {
  player: Player;
  events: FrasqueEvent[];
  refusesToPlay: boolean;
  messages: string[];
}

function recoverFatigue(player: Player, played: boolean, teamNight: TeamNight): number {
  const recovery = played ? PLAYED_RECOVERY : REST_RECOVERY;
  return clampGauge(player.fatigue - recovery + TEAM_NIGHT_OPTIONS[teamNight].fatigueDelta);
}

/**
 * Le match de la semaine est purgé par les suspendus qui ne l'ont pas joué ;
 * un joueur qui a joué et porte une suspension vient de la recevoir.
 */
function serveSuspension(player: Player, played: boolean, matchPlayed: boolean): number {
  return matchPlayed && !played && player.suspendedMatches > 0 ? player.suspendedMatches - 1 : player.suspendedMatches;
}

function moraleDelta(player: Player, played: boolean, input: WeeklySquadInput): number {
  const tags = input.abilityOf(player.ability.abilityId).tags;
  const night = TEAM_NIGHT_OPTIONS[input.teamNight];
  let delta = night.moraleDelta + (tags.includes('alcohol') ? night.alcoholMoraleBonus : 0);
  delta -= houseRuleMoralePenalty(tags, input.houseRules);
  if (input.matchOutcome === null) return delta;
  const wasAvailable = player.injuryWeeks === 0 && player.suspendedMatches === 0;
  if (played) delta += PLAYED_MORALE;
  else if (wasAvailable) delta += BENCHED_MORALE;
  if (played && player.suspendedMatches > 0) delta += NEW_SUSPENSION_MORALE;
  return delta + RESULT_MORALE[input.matchOutcome];
}

/** Coup de sang d'un joueur au fond du trou (EFF-07) : il râle, refuse de jouer ou demande à partir. */
function lowMoraleBehaviour(week: PlayerWeek, rng: Rng): PlayerWeek {
  const { player } = week;
  if (player.morale > VERY_LOW_MORALE) return week;
  const name = playerName(player);
  const requestTransfer = (): PlayerWeek => ({
    ...week,
    player: { ...player, transferRequested: true },
    events: [...week.events, { kind: 'transferRequest', playerId: player.id, playerName: name }],
    messages: [...week.messages, `${name} demande son transfert.`],
  });
  if (player.morale <= CRITICAL_MORALE && !player.transferRequested) return requestTransfer();
  const roll = rng.next();
  if (roll < RANT_CHANCE) {
    return {
      ...week,
      events: [...week.events, { kind: 'playerRant', playerId: player.id, playerName: name }],
      messages: [...week.messages, `${name} râle publiquement contre le coach.`],
    };
  }
  if (roll < RANT_CHANCE + REFUSAL_CHANCE) {
    return {
      ...week,
      player: { ...player, suspendedMatches: player.suspendedMatches + 1 },
      refusesToPlay: true,
      messages: [...week.messages, `${name} refuse de jouer le prochain match.`],
    };
  }
  if (roll < RANT_CHANCE + REFUSAL_CHANCE + TRANSFER_REQUEST_CHANCE && !player.transferRequested) return requestTransfer();
  return week;
}

function updatePlayer(player: Player, played: boolean, input: WeeklySquadInput): PlayerWeek {
  const updated: Player = {
    ...player,
    fatigue: recoverFatigue(player, played, input.teamNight),
    injuryWeeks: Math.max(0, player.injuryWeeks - 1),
    suspendedMatches: serveSuspension(player, played, input.matchOutcome !== null),
    morale: clampGauge(player.morale + moraleDelta(player, played, input)),
  };
  return lowMoraleBehaviour({ player: updated, events: [], refusesToPlay: false, messages: [] }, input.rng);
}

function bigNightEvent(squad: readonly Player[], input: WeeklySquadInput): FrasqueEvent | null {
  if (input.teamNight !== 'bigNight' || squad.length === 0 || !input.rng.chance(BIG_NIGHT_PRESS_CHANCE)) return null;
  const partyAnimal = input.rng.pick(squad);
  return { kind: 'bigNight', playerId: partyAnimal.id, playerName: playerName(partyAnimal) };
}

/**
 * Semaine de l'effectif (EFF-04 à EFF-07) : appelée après le match de la semaine,
 * avec la soirée d'équipe choisie (FRAS-06) et le règlement intérieur en vigueur (FRAS-01).
 */
export function weeklySquadUpdate(input: WeeklySquadInput): WeeklySquadResult {
  const squad: Player[] = [];
  const events: FrasqueEvent[] = [];
  const refusingToPlay: string[] = [];
  const messages: string[] = [];
  const appeared = new Set(input.appearances);
  for (const player of input.squad) {
    const week = updatePlayer(player, appeared.has(player.id), input);
    squad.push(week.player);
    events.push(...week.events);
    messages.push(...week.messages);
    if (week.refusesToPlay) refusingToPlay.push(player.id);
  }
  const nightEvent = bigNightEvent(squad, input);
  if (nightEvent) events.push(nightEvent);
  return {
    squad,
    abilityContext: { teamNight: input.teamNight, houseRules: [...input.houseRules] },
    events,
    refusingToPlay,
    messages,
  };
}
