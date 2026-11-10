import type { Player } from '../types';

/** Joueur de test : surcharger seulement ce qui compte pour le test. */
export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    firstName: 'Jean-Mi',
    lastName: 'Pastaga',
    age: 28,
    position: 'ATT',
    attributes: { speed: 60, technique: 60, physical: 60, shooting: 80, defense: 30, goalkeeping: 10 },
    potential: 70,
    overallAtSeasonStart: 69,
    training: { focus: 'ability', progress: 0 },
    fatigue: 0,
    injuryWeeks: 0,
    suspendedMatches: 0,
    ability: { abilityId: 'la-mobylette', level: 1, xp: 0, revealed: true },
    salary: 100,
    clubId: 'c1',
    seasonStats: { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
    ...overrides,
  };
}
