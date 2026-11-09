import { describe, expect, test } from 'bun:test';
import { aiMatch, playToEnd } from './fixtures';
import { summarize, toMatchResult } from './summary';

describe('résumé de fin de match', () => {
  test('un match complet va au bout avec un score cohérent et un résumé (MATCH-01, MATCH-06)', () => {
    const state = aiMatch(7);
    playToEnd(state);
    expect(state.status).toBe('finished');
    expect(state.minute).toBe(90);
    const summary = summarize(state);
    expect(summary.goals.filter((goal) => goal.side === 'home')).toHaveLength(state.home.goals);
    expect(summary.goals.filter((goal) => goal.side === 'away')).toHaveLength(state.away.goals);
    expect(summary.homeGoals).toBe(state.home.goals);
    expect(summary.abilities.length).toBe(state.activations.length);
    for (const report of summary.abilities) expect(report.text.length).toBeGreaterThan(0);
    expect(summary.players.find((player) => player.played)!.fatigue).toBeGreaterThan(0);
    const result = toMatchResult(state);
    expect(result.homeGoals + result.awayGoals).toBe(summary.goals.length);
  });

  test('chaque capacité utilisée a son joueur, sa réussite, son impact et son XP (MATCH-06, CAP-10)', () => {
    const state = aiMatch(21);
    playToEnd(state);
    const summary = summarize(state);
    expect(summary.abilities.length).toBeGreaterThan(0);
    for (const report of summary.abilities) {
      expect(report.playerName).not.toBe('?');
      expect(report.impact).toBeGreaterThanOrEqual(0);
      if (report.success) expect(report.xp).toBeGreaterThanOrEqual(10);
      else expect(report.xp).toBe(0);
    }
    const successful = summary.abilities.filter((report) => report.success);
    const totalXp = Object.values(summary.xpGains).reduce((sum, xp) => sum + xp, 0);
    expect(totalXp).toBe(successful.reduce((sum, report) => sum + report.xp, 0));
  });
});
