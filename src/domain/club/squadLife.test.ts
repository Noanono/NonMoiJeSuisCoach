import { describe, expect, test } from 'bun:test';
import type { Ability } from '../types';
import { createRng } from '../core/rng';
import { makePlayer } from '../testing/fixtures';
import type { AbilityLookup } from './model';
import { weeklySquadUpdate, type WeeklySquadInput } from './squadLife';

const TAGS: Record<string, Ability['tags']> = { 'pilier-de-buvette': ['alcohol'], 'le-plongeur': [] };
const abilityOf: AbilityLookup = (id) => ({ rarity: 'common', tags: TAGS[id] ?? [] });

const drinker = makePlayer({ id: 'drinker', ability: { ...makePlayer().ability, abilityId: 'pilier-de-buvette' } });
const sober = makePlayer({ id: 'sober' });

function week(overrides: Partial<WeeklySquadInput>): WeeklySquadInput {
  return {
    squad: [drinker, sober],
    appearances: [],
    matchOutcome: null,
    houseRules: [],
    teamNight: 'none',
    abilityOf,
    rng: createRng(42),
    ...overrides,
  };
}

const byId = (squad: { id: string; morale: number }[], id: string) => squad.find((player) => player.id === id)!;

describe('fatigue, blessures et suspensions (EFF-04, EFF-05)', () => {
  test('le repos fait récupérer la fatigue et décompte les blessures', () => {
    const tired = makePlayer({ id: 'tired', fatigue: 70, injuryWeeks: 3 });
    const [after] = weeklySquadUpdate(week({ squad: [tired] })).squad;
    expect(after!.fatigue).toBeLessThan(70);
    expect(after!.injuryWeeks).toBe(2);
  });

  test('celui qui a joué récupère moins que celui qui s’est reposé', () => {
    const tired = [makePlayer({ id: 'a', fatigue: 70 }), makePlayer({ id: 'b', fatigue: 70 })];
    const { squad } = weeklySquadUpdate(week({ squad: tired, appearances: ['a'], matchOutcome: 'draw' }));
    expect(squad[0]!.fatigue).toBeGreaterThan(squad[1]!.fatigue);
  });

  test('une suspension est purgée par le match manqué, pas par celui où elle a été reçue', () => {
    const suspended = makePlayer({ id: 'out', suspendedMatches: 1 });
    const sentOff = makePlayer({ id: 'red', suspendedMatches: 1 });
    const { squad } = weeklySquadUpdate(week({ squad: [suspended, sentOff], appearances: ['red'], matchOutcome: 'loss' }));
    expect(squad[0]!.suspendedMatches).toBe(0);
    expect(squad[1]!.suspendedMatches).toBe(1);
  });

  test('une grosse soirée fatigue et alimente les capacités du match suivant (FRAS-06)', () => {
    const result = weeklySquadUpdate(week({ teamNight: 'bigNight', squad: [makePlayer({ fatigue: 50 })] }));
    expect(result.squad[0]!.fatigue).toBeGreaterThan(50 - 35);
    expect(result.abilityContext.teamNight).toBe('bigNight');
  });
});

describe('moral (EFF-06, FRAS-01)', () => {
  test('le règlement intérieur ne baisse que le moral des joueurs concernés', () => {
    const { squad } = weeklySquadUpdate(week({ houseRules: ['noAlcoholEve'] }));
    const { squad: baseline } = weeklySquadUpdate(week({}));
    expect(byId(squad, 'drinker').morale).toBeLessThan(byId(baseline, 'drinker').morale);
    expect(byId(squad, 'sober').morale).toBe(byId(baseline, 'sober').morale);
  });

  test('jouer et gagner remonte le moral, cirer le banc le baisse', () => {
    const { squad } = weeklySquadUpdate(week({ appearances: ['sober'], matchOutcome: 'win' }));
    expect(byId(squad, 'sober').morale).toBeGreaterThan(sober.morale);
    const { squad: lost } = weeklySquadUpdate(week({ appearances: ['sober'], matchOutcome: 'loss' }));
    expect(byId(lost, 'drinker').morale).toBeLessThan(drinker.morale);
  });
});

describe('moral très bas (EFF-07)', () => {
  test('un joueur au fond du trou demande son transfert', () => {
    const depressed = makePlayer({ id: 'sad', morale: 0 });
    const result = weeklySquadUpdate(week({ squad: [depressed] }));
    expect(result.squad[0]!.transferRequested).toBe(true);
    expect(result.events).toContainEqual({ kind: 'transferRequest', playerId: 'sad', playerName: 'Jean-Mi Pastaga' });
  });

  test('un moral très bas finit par faire râler ou refuser de jouer', () => {
    const grumpy = makePlayer({ id: 'grumpy', morale: 15, transferRequested: true });
    const rng = createRng(9);
    const results = Array.from({ length: 20 }, () => weeklySquadUpdate(week({ squad: [grumpy], rng })));
    expect(results.some((result) => result.events.some((event) => event.kind === 'playerRant'))).toBe(true);
    const refusal = results.find((result) => result.refusingToPlay.includes('grumpy'));
    expect(refusal?.squad[0]!.suspendedMatches).toBe(1);
  });
});
