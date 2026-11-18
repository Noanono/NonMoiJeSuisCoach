import { describe, expect, test } from 'bun:test';
import { ABILITIES } from '../abilities/catalog';
import { albumProgress, discoveredAbilityIds, recordSeenAbilities } from './album';
import { COACH_FIELDS } from './coaches';
import { newGame } from './newGame';
import { humanSquad } from './selectors';

const report = (abilityId: string) => ({ side: 'away' as const, playerId: 'x', playerName: 'X', abilityId, abilityName: '', minute: 10, byAi: true, impact: 0, xp: 0, text: '' });

describe('album des capacités (ENC-01)', () => {
  test('au départ, seules les capacités de l’effectif sont découvertes', () => {
    const state = newGame({ seed: 7 });
    const own = new Set(humanSquad(state).map((player) => player.ability.abilityId));
    expect(discoveredAbilityIds(state)).toEqual(own);
    expect(albumProgress(state)).toEqual({ discovered: own.size, total: ABILITIES.length });
  });

  test('une capacité vue partir en match est découverte, une seule fois, avec une ligne d’actualité', () => {
    const state = newGame({ seed: 8 });
    const unknown = ABILITIES.find((ability) => !discoveredAbilityIds(state).has(ability.id))!;
    const news = state.news.length;
    expect(recordSeenAbilities(state, { abilities: [report(unknown.id), report(unknown.id)] })).toBe(1);
    expect(discoveredAbilityIds(state).has(unknown.id)).toBe(true);
    expect(state.news.length).toBe(news + 1);
    expect(recordSeenAbilities(state, { abilities: [report(unknown.id)] })).toBe(0);
    expect(state.news.length).toBe(news + 1);
  });

  test('en multijoueur, chaque coach a son album', () => {
    expect(COACH_FIELDS).toContain('seenAbilityIds');
  });
});
