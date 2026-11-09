/**
 * Capacités et feuilles de match de test, injectées via `lookupAbility` / `combos`
 * (le catalogue réel est rempli ailleurs).
 */
import type { Ability, AbilityStats, Combo, Formation, Player } from '../types';
import { FORMATION_SLOTS } from '../player/rating';
import { makePlayer } from '../testing/fixtures';
import { tick } from './simulation';
import { createMatch } from './state';
import type { MatchOptions, MatchState, TeamSheet } from './types';
import { dismissEventWindow } from './windows';

function ability(id: string, overrides: Partial<Ability>, stats: Partial<AbilityStats>): Ability {
  return {
    id,
    name: id,
    rarity: 'common',
    category: 'attack',
    position: 'ANY',
    targeting: { kind: 'self' },
    trigger: 'anytime',
    description: `Effet de ${id}`,
    downside: '',
    level5Text: '',
    base: { successChance: 1, effects: [], risks: [], cooldown: { kind: 'minutes', value: 20 }, cost: 1, ...stats },
    level5: {},
    tags: [],
    hidden: false,
    ...overrides,
  };
}

export const TEST_ABILITIES: readonly Ability[] = [
  ability(
    'pilier',
    { category: 'attack', tags: ['alcohol'] },
    {
      cost: 2,
      effects: [{ type: 'modifier', scope: 'self', stat: 'all', value: 0.4, duration: 15 }],
      risks: [{ chance: 0.2, label: 'Coup de barre', effects: [] }],
    },
  ),
  ability(
    'boucher',
    { category: 'sabotage', position: 'DEF', targeting: { kind: 'opponent', range: 'facing' } },
    {
      cost: 3,
      cooldown: { kind: 'perMatch', uses: 1 },
      effects: [{ type: 'knockout', scope: 'targets', duration: 15 }],
      risks: [{ chance: 0.3, label: 'Carton jaune', effects: [{ type: 'card', scope: 'self', card: 'yellow', chance: 1 }] }],
    },
  ),
  ability(
    'chambreur',
    { category: 'provoc', targeting: { kind: 'opponent', count: 2, range: 'any' } },
    { cost: 1, effects: [{ type: 'modifier', scope: 'targets', stat: 'concentration', value: -0.15, duration: 10 }] },
  ),
  ability(
    'vomisseur',
    { category: 'sabotage', position: 'MID', targeting: { kind: 'zone' } },
    { cost: 2, effects: [{ type: 'knockout', scope: 'zoneOpponents', duration: 3 }] },
  ),
  ability(
    'kebab',
    { category: 'sabotage', position: 'BENCH', targeting: { kind: 'randomOpponent', count: 2 } },
    { cost: 3, cooldown: { kind: 'perMatch', uses: 1 }, effects: [{ type: 'knockout', scope: 'targets', duration: 10 }] },
  ),
  ability(
    'mur',
    { category: 'defense', trigger: 'opponentSetPiece' },
    { cost: 1, cooldown: { kind: 'perEvent' }, effects: [{ type: 'opponentChanceMalus', value: 0.3, shots: 1 }] },
  ),
  ability(
    'torse-nu',
    { category: 'provoc', position: 'ATT', trigger: 'afterOwnGoal' },
    {
      cost: 0,
      cooldown: { kind: 'perEvent' },
      effects: [{ type: 'morale', scope: 'team', value: 0.1 }],
      risks: [{ chance: 1, label: 'Carton jaune automatique', effects: [{ type: 'card', scope: 'self', card: 'yellow', chance: 1 }] }],
    },
  ),
  ability(
    'malediction',
    { category: 'legendary', rarity: 'legendary', position: 'BENCH', targeting: { kind: 'opponentTeam' } },
    {
      cost: 3,
      cooldown: { kind: 'perSeason', uses: 1 },
      effects: [{ type: 'modifier', scope: 'opponents', stat: 'all', value: -0.2, duration: 15 }],
      risks: [{ chance: 1, label: 'Lendemain difficile', effects: [{ type: 'squadFatigue', value: 30 }, { type: 'fine', amount: 500 }] }],
    },
  ),
  ability(
    'discours',
    { category: 'support', trigger: 'halftime' },
    { cost: 1, cooldown: { kind: 'perEvent' }, effects: [{ type: 'modifier', scope: 'team', stat: 'all', value: 0.05, duration: 45 }] },
  ),
  ability('beau-gosse', { category: 'provoc' }, { cost: 1, effects: [{ type: 'foulsIgnored', count: 3 }] }),
  ability('ex-president', { category: 'provoc' }, { cost: 1, effects: [{ type: 'modifier', scope: 'self', stat: 'all', value: 0.4, duration: 20 }] }),
  ability('bus', { category: 'defense' }, { cost: 2, effects: [{ type: 'modifier', scope: 'team', stat: 'defense', value: 0.45, duration: 10 }] }),
  ability(
    'cache',
    { category: 'chaos', hidden: true },
    { cost: 1, effects: [{ type: 'freeze', duration: 3 }], risks: [{ chance: 0.5, label: 'Temps additionnel', effects: [{ type: 'stoppageTime', minutes: 2 }] }] },
  ),
];

export const TEST_COMBOS: readonly Combo[] = [
  {
    id: 'drame-conjugal',
    name: 'Drame conjugal',
    abilityIds: ['beau-gosse', 'ex-president'],
    description: '+20 % à toutes les stats pour les deux pendant 15 min',
    downside: 'Le président apprend tout',
    effects: [{ type: 'modifier', scope: 'self', stat: 'all', value: 0.2, duration: 15 }],
    risks: [{ chance: 1, label: 'Le président apprend tout', effects: [{ type: 'presidentConfidence', value: -15 }] }],
  },
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
}

export function makeSheet(options: SheetOptions): TeamSheet {
  const { clubId, level = 60, isHuman = false, formation = '4-4-2', abilities = {}, benchAbilities = [] } = options;
  const starters = FORMATION_SLOTS[formation].map((position, index) =>
    squadPlayer({ id: `${clubId}-${index}`, clubId, position, level, abilityId: abilities[index] ?? NO_ABILITY }),
  );
  const bench = benchAbilities.map((abilityId, index) =>
    squadPlayer({ id: `${clubId}-b${index}`, clubId, position: 'MID', level, abilityId }),
  );
  return {
    clubId,
    name: `FC ${clubId}`,
    starters,
    bench,
    formation,
    instructions: { mentality: 'balanced', highPress: false, longBall: false },
    captainId: starters[5]!.id,
    context: { teamNight: 'none', houseRules: [] },
    isHuman,
  };
}

interface SquadPlayer {
  id: string;
  clubId: string;
  position: Player['position'];
  level: number;
  abilityId: string;
}

function squadPlayer({ id, clubId, position, level, abilityId }: SquadPlayer): Player {
  return makePlayer({
    id,
    clubId,
    position,
    lastName: id,
    attributes: { speed: level, technique: level, physical: level, shooting: level, defense: level, goalkeeping: level },
    ability: { abilityId, level: 1, xp: 0, revealed: true, seasonUses: 0 },
  });
}

/** Options de match prêtes à l'emploi : capacités et combos de test injectés. */
export function testMatchOptions(home: TeamSheet, away: TeamSheet, seed = 42): MatchOptions {
  return { home, away, seed, lookupAbility: lookupTestAbility, combos: TEST_COMBOS };
}

/** Match IA contre IA avec quelques capacités de chaque côté. */
export function aiMatch(seed: number): MatchState {
  return createMatch(
    testMatchOptions(
      makeSheet({ clubId: 'h', abilities: { 1: 'boucher', 5: 'pilier', 9: 'torse-nu' }, benchAbilities: ['kebab'] }),
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
