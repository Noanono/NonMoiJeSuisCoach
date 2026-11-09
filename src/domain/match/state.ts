/**
 * Création de l'état du match et accès communs (équipes, joueurs, zones).
 */
import type { Ability, Player, Position } from '../types';
import { createRng, type Rng } from '../core/rng';
import { effectiveRating, FORMATION_SLOTS } from '../player/rating';
import { getAbility } from '../abilities/catalog';
import { statsAtLevel } from '../abilities/progression';
import { trainingMatchBonus } from '../club/training';
import type {
  MatchEvent,
  MatchEventKind,
  MatchOptions,
  MatchPlayer,
  MatchState,
  PreparedAbility,
  Side,
  TeamSheet,
  TeamState,
} from './types';
import { comment } from './commentary';

/** Jauge de Gueulante au coup d'envoi (CAP-05). */
export const GAUGE_START = 3;
export const GAUGE_MAX = 10;
/** Durée d'un effet « jusqu'à la fin du match ». */
export const UNTIL_FINAL_WHISTLE = 1000;
/** Valeur des échéances « jusqu'à la minute X incluse » quand rien n'est en cours. */
export const NEVER = -1;

/** Contexte d'un appel au moteur : l'état, le Rng reconstitué et les événements produits. */
export interface Run {
  state: MatchState;
  rng: Rng;
  events: MatchEvent[];
}

export function beginRun(state: MatchState): Run {
  return { state, rng: createRng(state.rngState), events: [] };
}

/** Sauvegarde l'état du Rng dans le match et rend les événements produits. */
export function endRun(run: Run): MatchEvent[] {
  run.state.rngState = run.rng.state();
  return run.events;
}

export function opponentSide(side: Side): Side {
  return side === 'home' ? 'away' : 'home';
}

export function teamOf(state: MatchState, side: Side): TeamState {
  return side === 'home' ? state.home : state.away;
}

export function findPlayer(state: MatchState, playerId: string): MatchPlayer | undefined {
  return (
    state.home.players.find((player) => player.id === playerId) ??
    state.away.players.find((player) => player.id === playerId)
  );
}

export function requirePlayer(state: MatchState, playerId: string): MatchPlayer {
  const player = findPlayer(state, playerId);
  if (!player) throw new Error(`Joueur absent du match : ${playerId}`);
  return player;
}

/** Sur la pelouse : titulaire, ni exclu ni blessé. */
export function isOnPitch(player: MatchPlayer): boolean {
  return player.line !== null && !player.sentOff && !player.injured;
}

/** Sur la pelouse et pas hors jeu en ce moment. */
export function isActive(player: MatchPlayer, elapsed: number): boolean {
  return isOnPitch(player) && player.knockedOutUntil < elapsed;
}

/** Zone du terrain (0 = surface domicile, 2 = surface extérieur) : sert aux portées « 5 m » et aux zones. */
const HOME_ZONE: Record<Position, number> = { GK: 0, DEF: 0, MID: 1, ATT: 2 };
const LAST_ZONE = 2;

export function zoneOf(player: MatchPlayer): number | null {
  if (player.line === null) return null;
  const zone = HOME_ZONE[player.line];
  return player.side === 'home' ? zone : LAST_ZONE - zone;
}

export function keeperOf(team: TeamState): MatchPlayer | undefined {
  return team.players.find((player) => player.line === 'GK');
}

export function pushEvent(
  run: Run,
  kind: MatchEventKind,
  side: Side | null,
  text: string,
  extra: Pick<MatchEvent, 'playerId' | 'abilityId' | 'score' | 'label'> = {},
): void {
  const { state } = run;
  const event: MatchEvent = { minute: state.minute, addedMinute: state.addedMinute, kind, side, text, ...extra };
  run.events.push(event);
  state.events.push(event);
}

export function refreshRating(player: MatchPlayer): void {
  player.rating = effectiveRating(player.profile, player.line ?? player.profile.position);
}

// ---------------------------------------------------------------------------
// Création (MATCH-01)
// ---------------------------------------------------------------------------

type AbilityLookup = (id: string) => Ability;

export function createMatch(options: MatchOptions): MatchState {
  const lookup = options.lookupAbility ?? getAbility;
  const home = createTeam(options.home, 'home', lookup);
  const away = createTeam(options.away, 'away', lookup);
  const state: MatchState = {
    seed: options.seed,
    rngState: options.seed >>> 0,
    knockout: options.knockout ?? false,
    status: 'firstHalf',
    minute: 0,
    addedMinute: 0,
    elapsed: 0,
    stoppage: 0,
    stoppageAnnounced: false,
    swappedUntil: NEVER,
    home,
    away,
    goals: [],
    cards: [],
    injuries: [],
    activations: [],
    events: [],
    awaiting: null,
    pending: null,
    pendingPlay: null,
    triggers: { home: null, away: null },
    shootout: null,
    xpGains: {},
    nextActivationId: 1,
  };
  const run = beginRun(state);
  pushEvent(run, 'kickoff', null, comment(run.rng, 'kickoff', { team: home.name, opponent: away.name }));
  endRun(run);
  return state;
}

function createTeam(sheet: TeamSheet, side: Side, lookup: AbilityLookup): TeamState {
  const slots = FORMATION_SLOTS[sheet.formation];
  const players: MatchPlayer[] = [];
  sheet.starters.forEach((player, index) => {
    players.push(createMatchPlayer({ player, side, line: slots[index] ?? player.position, lookup, trained: sheet.isHuman }));
  });
  for (const player of sheet.bench) players.push(createMatchPlayer({ player, side, line: null, lookup, trained: sheet.isHuman }));
  return {
    side,
    clubId: sheet.clubId,
    name: sheet.name,
    formation: sheet.formation,
    instructions: { ...sheet.instructions },
    isHuman: sheet.isHuman,
    captainId: sheet.captainId,
    players,
    goals: 0,
    gauge: GAUGE_START,
    chanceBoosts: [],
    shotMaluses: [],
    pendingCancels: 0,
    delayed: [],
    substitutionsUsed: 0,
    doubleGoalsUntil: NEVER,
    consequences: [],
  };
}

interface PlayerSetup {
  player: Player;
  side: Side;
  line: Position | null;
  lookup: AbilityLookup;
  /** Applique le bonus de la séance de la semaine (TRAIN-04). */
  trained: boolean;
}

function createMatchPlayer({ player, side, line, lookup, trained }: PlayerSetup): MatchPlayer {
  const profile: Player = { ...player };
  const ability = findAbility(lookup, player.ability.abilityId);
  const bonus = trained ? trainingMatchBonus(player.training.focus) : null;
  return {
    id: player.id,
    name: `${player.firstName} ${player.lastName}`,
    side,
    line,
    profile,
    rating: effectiveRating(profile, line ?? player.position),
    yellowCards: 0,
    sentOff: false,
    injured: false,
    knockedOutUntil: NEVER,
    effects: bonus ? [{ label: 'Entraînement', stat: bonus.stat, value: bonus.value, endsAt: UNTIL_FINAL_WHISTLE, quiet: true }] : [],
    ability: ability && prepareAbility(ability, player.ability.level),
    abilityRevealed: player.ability.revealed,
    cooldownUntil: 0,
    fatigueRestored: 0,
    goals: 0,
    hasPlayed: line !== null,
    subbedOff: false,
    usedAbility: false,
  };
}

/** Une capacité absente du catalogue (catalogue incomplet) rend simplement le joueur sans capacité. */
function findAbility(lookup: AbilityLookup, id: string): Ability | null {
  try {
    return lookup(id);
  } catch {
    return null;
  }
}

/** Applique le niveau (CAP-11) à une capacité du catalogue. */
export function prepareAbility(ability: Ability, level: number): PreparedAbility {
  const stats = statsAtLevel(ability, level);
  return {
    id: ability.id,
    name: ability.name,
    rarity: ability.rarity,
    category: ability.category,
    position: ability.position,
    targeting: stats.targeting,
    trigger: ability.trigger,
    requiresRecentOpponentGoal: ability.requiresRecentOpponentGoal ?? null,
    description: ability.description,
    hidden: ability.hidden,
    cost: stats.cost,
    cooldown: stats.cooldown,
    effects: stats.effects,
  };
}
