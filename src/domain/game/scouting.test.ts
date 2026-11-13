import { describe, expect, test } from 'bun:test';
import { facilityBonus, NO_FACILITIES } from '../club/facilities';
import { asCoach } from './coaches';
import { newMultiplayerGame } from './multiplayer';
import { newGame } from './newGame';
import { abilityKnown, knowledgeOf, potentialView, refillScoutReports, scoutingOf, scoutOpponents, scoutPlayer, weeklyReports } from './scouting';
import { humanClub } from './selectors';
import type { GameState } from './state';

function strangers(state: GameState) {
  return Object.values(state.players).filter((player) => player.clubId !== state.humanClubId);
}

describe('cellule de scouts (CLUB-10)', () => {
  test('progression : 2 à 12 rapports par semaine, 5 à 30 % connus d’office, plage qui se resserre', () => {
    const at = (level: number) => facilityBonus.scouting({ ...NO_FACILITIES, scouts: level });
    expect(at(0)).toEqual({ weeklyReports: 2, autoShare: 0.05, rangeHalfWidth: 10 });
    expect(at(5)).toEqual({ weeklyReports: 12, autoShare: 0.3, rangeHalfWidth: 2 });
  });

  test('par défaut, environ 5 % des joueurs des autres clubs sont connus ; ses joueurs, tous', () => {
    const state = newGame({ seed: 4, clubName: 'Scout FC' });
    const others = strangers(state);
    const share = others.filter((player) => knowledgeOf(state, player) === 1).length / others.length;
    expect(share).toBeGreaterThan(0.02);
    expect(share).toBeLessThan(0.09);
    for (const playerId of humanClub(state).playerIds) expect(knowledgeOf(state, state.players[playerId]!)).toBe(2);
    humanClub(state).facilities = { ...NO_FACILITIES, scouts: 5 };
    const bigger = others.filter((player) => knowledgeOf(state, player) === 1).length / others.length;
    expect(bigger).toBeGreaterThan(0.24);
  });

  test('un rapport révèle la capacité et une plage contenant le potentiel ; le 2e, le potentiel exact', () => {
    const state = newGame({ seed: 5, clubName: 'Scout FC' });
    const target = strangers(state).find((player) => knowledgeOf(state, player) === 0)!;
    expect(abilityKnown(state, target)).toBe(false);
    expect(potentialView(state, target)).toEqual({ kind: 'unknown' });
    expect(scoutingOf(state).reports).toBe(2);
    expect(scoutPlayer(state, target.id).ok).toBe(true);
    expect(abilityKnown(state, target)).toBe(true);
    const range = potentialView(state, target);
    if (range.kind !== 'range') throw new Error('plage attendue');
    expect(range.min).toBeLessThanOrEqual(target.potential);
    expect(range.max).toBeGreaterThanOrEqual(target.potential);
    expect(range.max - range.min).toBeLessThanOrEqual(20);
    expect(scoutPlayer(state, target.id).ok).toBe(true);
    expect(potentialView(state, target)).toEqual({ kind: 'exact', value: target.potential });
    // Plus de rapport cette semaine, et rien à apprendre de plus sur lui.
    expect(scoutPlayer(state, target.id).ok).toBe(false);
    const other = strangers(state).find((player) => knowledgeOf(state, player) === 0)!;
    expect(scoutPlayer(state, other.id).ok).toBe(false);
  });

  test('les rapports reviennent chaque semaine, stockables 2 semaines', () => {
    const state = newGame({ seed: 6, clubName: 'Scout FC' });
    refillScoutReports(state);
    refillScoutReports(state);
    refillScoutReports(state);
    expect(scoutingOf(state).reports).toBe(2 * weeklyReports(state));
  });

  test('un adversaire affronté est connu, et chaque coach a ses propres connaissances', () => {
    const state = newMultiplayerGame({
      seed: 7,
      coaches: [
        { id: 'a', name: 'Alice', clubName: 'Les Gros Mollets' },
        { id: 'b', name: 'Bob', clubName: 'Racing Pastis' },
      ],
    });
    const opponent = Object.values(state.clubs).find((club) => !club.isHuman)!;
    asCoach(state, 'a', () => scoutOpponents(state, opponent.id));
    const player = state.players[opponent.playerIds[0]!]!;
    expect(asCoach(state, 'a', () => knowledgeOf(state, player))).toBeGreaterThanOrEqual(1);
    const bobKnows = opponent.playerIds.filter((id) => asCoach(state, 'b', () => knowledgeOf(state, state.players[id]!)) > 0).length;
    expect(bobKnows).toBeLessThan(opponent.playerIds.length);
  });
});
