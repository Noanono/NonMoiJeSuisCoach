import { describe, expect, test } from 'bun:test';
import type { MatchSummary } from '../../domain/match';
import { consequenceText, outcomeFor, outcomeLine, windowTitle } from './verdict';

function summary(homeGoals: number, awayGoals: number, shootout: MatchSummary['shootout'] = null): MatchSummary {
  return {
    homeName: 'FC Domicile',
    awayName: 'AS Extérieur',
    homeGoals,
    awayGoals,
    shootout,
    goals: [],
    cards: [],
    injuries: [],
    abilities: [],
    consequences: { home: [], away: [] },
    xpGains: {},
    players: [],
  };
}

describe('résumé de fin de match (MATCH-06)', () => {
  test('le score est donné du point de vue du coach, avant la blague', () => {
    expect(outcomeLine(summary(0, 3), 'home')).toBe("Défaite 0-3. Le président a appelé. Il n'a rien dit. C'est pire.");
    expect(outcomeLine(summary(0, 3), 'away').startsWith('Victoire 3-0.')).toBe(true);
  });

  test('les tirs au but départagent un nul', () => {
    const shootout = { home: 4, away: 3, winner: 'home' as const };
    expect(outcomeFor(summary(1, 1, shootout), 'away')).toBe('D');
    expect(outcomeLine(summary(1, 1, shootout), 'home').startsWith('Victoire 1-1 (4-3 aux tirs au but).')).toBe(true);
    expect(outcomeFor(summary(2, 2), 'home')).toBe('N');
  });

  test('les conséquences hors match sont chiffrées', () => {
    const name = () => 'Michel';
    expect(consequenceText({ type: 'suspension', playerId: 'p', matches: 2, reason: 'Rouge direct' }, name)).toBe(
      'Michel suspendu 2 match(s) : Rouge direct',
    );
    expect(consequenceText({ type: 'abilityRevealed', playerId: 'p', abilityId: 'x' }, name)).toBe('Capacité révélée chez Michel');
  });
});

describe("fenêtres d'événement (CAP-19)", () => {
  test('le bandeau nomme le coup de pied arrêté', () => {
    const window = { side: 'home' as const, trigger: 'ownSetPiece' as const, eligiblePlayerIds: [] };
    expect(windowTitle(window, { kind: 'freeKick', side: 'home', takerId: null })).toBe(
      "Coup franc pour toi : quelqu'un a une idée ?",
    );
    expect(windowTitle(window, { kind: 'corner', side: 'home', takerId: null }).startsWith('Corner pour toi')).toBe(true);
  });
});
