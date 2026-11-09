import { describe, expect, test } from 'bun:test';
import { makePlayer } from '../testing/fixtures';
import { weeklySquadUpdate } from './squadLife';

describe('fatigue, blessures et suspensions (EFF-04, EFF-05)', () => {
  test('le repos fait récupérer la fatigue et décompte les blessures', () => {
    const tired = makePlayer({ id: 'tired', fatigue: 70, injuryWeeks: 3 });
    const [after] = weeklySquadUpdate({ squad: [tired], appearances: [], matchPlayed: false });
    expect(after!.fatigue).toBeLessThan(70);
    expect(after!.injuryWeeks).toBe(2);
  });

  test('celui qui a joué récupère moins que celui qui s’est reposé', () => {
    const tired = [makePlayer({ id: 'a', fatigue: 70 }), makePlayer({ id: 'b', fatigue: 70 })];
    const squad = weeklySquadUpdate({ squad: tired, appearances: ['a'], matchPlayed: true });
    expect(squad[0]!.fatigue).toBeGreaterThan(squad[1]!.fatigue);
  });

  test('une suspension est purgée par le match manqué, pas par celui où elle a été reçue', () => {
    const suspended = makePlayer({ id: 'out', suspendedMatches: 1 });
    const sentOff = makePlayer({ id: 'red', suspendedMatches: 1 });
    const squad = weeklySquadUpdate({ squad: [suspended, sentOff], appearances: ['red'], matchPlayed: true });
    expect(squad[0]!.suspendedMatches).toBe(0);
    expect(squad[1]!.suspendedMatches).toBe(1);
  });
});
