import { describe, expect, test } from 'bun:test';
import { AI_STYLE_PLAN, AI_STYLES, aiStyleOf, tacticsFor } from '../club/aiStyle';
import { recordGoal } from './actions';
import { aiTakeTurn } from './ai';
import { makeSheet, testMatchOptions } from './fixtures';
import { beginRun, createMatch, endRun } from './state';
import type { MatchState } from './types';

function aiMatch(style: (typeof AI_STYLES)[number]): MatchState {
  const home = { ...makeSheet({ clubId: 'h', benchAbilities: ['pilier', 'pilier', 'pilier', 'pilier', 'pilier'] }), aiStyle: style };
  home.instructions = AI_STYLE_PLAN[style].instructions;
  return createMatch(testMatchOptions(home, makeSheet({ clubId: 'a', isHuman: true })));
}

describe('styles des coachs IA (C6)', () => {
  test('chaque club IA a un style stable, et les quatre styles existent dans le monde', () => {
    expect(aiStyleOf('club-12')).toBe(aiStyleOf('club-12'));
    const styles = new Set(Array.from({ length: 40 }, (_, index) => aiStyleOf(`club-${index}`)));
    expect(styles.size).toBe(AI_STYLES.length);
  });

  test('le bétonneur ferme tout dès qu’il mène, le fou d’attaque attend la fin', () => {
    expect(tacticsFor('bus', 1, 50).mentality).toBe('defensive');
    expect(tacticsFor('attack', 1, 50).mentality).toBe('offensive');
    expect(tacticsFor('attack', 1, 88).mentality).toBe('defensive');
    expect(tacticsFor('attack', -1, 55)).toMatchObject({ mentality: 'offensive', highPress: true });
    expect(tacticsFor('bus', -1, 60).mentality).toBe('defensive');
  });

  test('en match, l’IA change de consignes selon le score et l’annonce', () => {
    const state = aiMatch('attack');
    const run = beginRun(state);
    recordGoal(run, 'home', state.home.players[9]!);
    state.minute = 86;
    state.awaiting = null;
    aiTakeTurn(run, 'home');
    endRun(run);
    expect(state.home.instructions.mentality).toBe('defensive');
    expect(state.events.some((event) => event.text.includes('ferme la boutique'))).toBe(true);
  });

  test('après l’heure de jeu, l’IA remplace un joueur cuit par un remplaçant du même poste', () => {
    const state = aiMatch('pressing');
    state.minute = 70;
    const tired = state.home.players[6]!;
    tired.profile = { ...tired.profile, fatigue: 90 };
    let replaced = false;
    for (let attempt = 0; attempt < 50 && !replaced; attempt++) {
      const run = beginRun(state);
      aiTakeTurn(run, 'home');
      endRun(run);
      replaced = tired.line === null;
    }
    expect(replaced).toBe(true);
    expect(state.home.substitutionsUsed).toBe(1);
  });
});
