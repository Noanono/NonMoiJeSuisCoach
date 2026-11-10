/**
 * Capacités et feuilles de match de test, injectées via `lookupAbility`.
 */
import type { Ability, Formation, Player } from '../types';
import { FORMATION_SLOTS } from '../player/rating';
import { makePlayer } from '../testing/fixtures';
import { tick } from './simulation';
import { createMatch } from './state';
import type { MatchOptions, MatchState, TeamSheet } from './types';
import { dismissEventWindow } from './windows';

function ability(id: string, overrides: Partial<Ability>): Ability {
  return {
    id,
    name: id,
    rarity: 'common',
    category: 'attack',
    position: 'ANY',
    targeting: { kind: 'self' },
    trigger: 'anytime',
    description: `Effet de ${id}`,
    effects: [],
    hidden: false,
    ...overrides,
  };
}

export const TEST_ABILITIES: readonly Ability[] = [
  ability('pilier', { effects: [{ type: 'modifier', scope: 'self', stat: 'all', value: 0.4, duration: 15 }] }),
  ability('boucher', {
    rarity: 'rare',
    category: 'sabotage',
    position: 'DEF',
    targeting: { kind: 'opponent', count: 1, line: 'ATT' },
    effects: [{ type: 'knockout', scope: 'targets', duration: 15 }],
  }),
  ability('chambreur', {
    category: 'sabotage',
    targeting: { kind: 'opponent', count: 2 },
    effects: [{ type: 'modifier', scope: 'targets', stat: 'concentration', value: -0.15, duration: 10 }],
  }),
  ability('vomisseur', {
    rarity: 'rare',
    category: 'sabotage',
    position: 'MID',
    targeting: { kind: 'zone' },
    effects: [{ type: 'knockout', scope: 'zoneOpponents', duration: 3 }],
  }),
  ability('kebab', {
    category: 'sabotage',
    position: 'BENCH',
    targeting: { kind: 'randomOpponent', count: 2 },
    effects: [{ type: 'knockout', scope: 'targets', duration: 10 }],
  }),
  ability('mur', {
    category: 'defense',
    trigger: 'opponentSetPiece',
    effects: [{ type: 'opponentChanceMalus', value: 0.3, shots: 1 }],
  }),
  ability('malediction', {
    rarity: 'legendary',
    category: 'legendary',
    position: 'BENCH',
    targeting: { kind: 'opponentTeam' },
    effects: [{ type: 'modifier', scope: 'opponents', stat: 'all', value: -0.2, duration: 15 }],
  }),
  ability('discours', {
    category: 'support',
    trigger: 'halftime',
    effects: [{ type: 'modifier', scope: 'team', stat: 'all', value: 0.05, duration: 45 }],
  }),
  ability('bus', { category: 'defense', effects: [{ type: 'modifier', scope: 'team', stat: 'defense', value: 0.45, duration: 10 }] }),
  ability('cache', { category: 'support', hidden: true, effects: [{ type: 'cancelAction' }] }),
];

const BY_ID = new Map(TEST_ABILITIES.map((entry) => [entry.id, entry]));

export function lookupTestAbility(id: string): Ability {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Capacité de test inconnue : ${id}`);
  return found;
}

const NO_ABILITY = 'aucune';

interface SheetOptions {
  clubId: string;
  /** Niveau de tous les attributs des joueurs (1 à 99). */
  level?: number;
  isHuman?: boolean;
  formation?: Formation;
  /** Capacité par index de titulaire. */
  abilities?: Record<number, string>;
  /** Capacités des remplaçants, un remplaçant par capacité. */
  benchAbilities?: string[];
  /** Niveau des capacités (1 à 5). */
  abilityLevel?: number;
}

export function makeSheet(options: SheetOptions): TeamSheet {
  const { clubId, level = 60, isHuman = false, formation = '4-4-2', abilities = {}, benchAbilities = [], abilityLevel = 1 } = options;
  const starters = FORMATION_SLOTS[formation].map((position, index) =>
    squadPlayer({ id: `${clubId}-${index}`, clubId, position, level, abilityId: abilities[index] ?? NO_ABILITY, abilityLevel }),
  );
  const bench = benchAbilities.map((abilityId, index) =>
    squadPlayer({ id: `${clubId}-b${index}`, clubId, position: 'MID', level, abilityId, abilityLevel }),
  );
  return {
    clubId,
    name: `FC ${clubId}`,
    starters,
    bench,
    formation,
    instructions: { mentality: 'balanced', highPress: false, longBall: false },
    captainId: starters[5]!.id,
    isHuman,
  };
}

interface SquadPlayer {
  id: string;
  clubId: string;
  position: Player['position'];
  level: number;
  abilityId: string;
  abilityLevel: number;
}

function squadPlayer({ id, clubId, position, level, abilityId, abilityLevel }: SquadPlayer): Player {
  return makePlayer({
    id,
    clubId,
    position,
    lastName: id,
    attributes: { speed: level, technique: level, physical: level, shooting: level, defense: level, goalkeeping: level },
    ability: { abilityId, level: abilityLevel, xp: 0, revealed: true },
  });
}

/** Options de match prêtes à l'emploi : capacités de test injectées. */
export function testMatchOptions(home: TeamSheet, away: TeamSheet, seed = 42): MatchOptions {
  return { home, away, seed, lookupAbility: lookupTestAbility };
}

/** Match IA contre IA avec quelques capacités de chaque côté. */
export function aiMatch(seed: number): MatchState {
  return createMatch(
    testMatchOptions(
      makeSheet({ clubId: 'h', abilities: { 1: 'boucher', 5: 'pilier', 9: 'chambreur' }, benchAbilities: ['kebab'] }),
      makeSheet({ clubId: 'a', abilities: { 1: 'boucher', 5: 'vomisseur', 6: 'bus' }, benchAbilities: ['mur'] }),
      seed,
    ),
  );
}

const MAX_TICKS = 400;

/** Joue jusqu'au bout en laissant passer toutes les fenêtres d'événement. */
export function playToEnd(state: MatchState): void {
  for (let i = 0; i < MAX_TICKS && state.status !== 'finished'; i++) {
    if (state.awaiting) dismissEventWindow(state);
    tick(state);
  }
}
