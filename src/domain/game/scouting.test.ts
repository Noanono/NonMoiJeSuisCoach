import { describe, expect, test } from 'bun:test';
import { facilityBonus, NO_FACILITIES } from '../club/facilities';
import { asCoach } from './coaches';
import { newMultiplayerGame } from './multiplayer';
import { newGame } from './newGame';
import { abilityKnown, isScouted, potentialView, refillScoutReports, revealOwnSquads, scoutingOf, scoutOpponents, scoutPlayer, weeklyReports } from './scouting';
import { autoPickLineup } from './actions';
import { humanLineupErrors, startHumanMatch } from './matches';
import { withRng } from './week';
import { humanClub, humanFixture } from './selectors';
import type { GameState } from './state';

function strangers(state: GameState) {
  return Object.values(state.players).filter((player) => player.clubId !== state.humanClubId);
}

describe('cellule de scouts (CLUB-10)', () => {
  test('progression : 2 à 12 rapports par semaine, 5 à 55 % connus d’office', () => {
    const at = (level: number) => facilityBonus.scouting({ ...NO_FACILITIES, scouts: level });
    expect(at(0).weeklyReports).toBe(2);
    expect(at(0).autoShare).toBeCloseTo(0.05);
    expect(at(5).weeklyReports).toBe(12);
    expect(at(5).autoShare).toBeCloseTo(0.55);
  });

  test('par défaut, environ 5 % des joueurs des autres clubs sont connus ; bien plus avec une cellule améliorée', () => {
    const state = newGame({ seed: 4, clubName: 'Scout FC' });
    const others = strangers(state);
    const share = () => others.filter((player) => isScouted(state, player)).length / others.length;
    expect(share()).toBeGreaterThan(0.02);
    expect(share()).toBeLessThan(0.09);
    for (const playerId of humanClub(state).playerIds) expect(isScouted(state, state.players[playerId]!)).toBe(true);
    humanClub(state).facilities = { ...NO_FACILITIES, scouts: 5 };
    expect(share()).toBeGreaterThan(0.48);
  });

  test('un seul rapport révèle d’un coup la capacité et le potentiel exact', () => {
    const state = newGame({ seed: 5, clubName: 'Scout FC' });
    const target = strangers(state).find((player) => !isScouted(state, player))!;
    expect(abilityKnown(state, target)).toBe(false);
    expect(potentialView(state, target)).toEqual({ kind: 'unknown' });
    expect(scoutingOf(state).reports).toBe(2);
    expect(scoutPlayer(state, target.id).ok).toBe(true);
    expect(abilityKnown(state, target)).toBe(true);
    expect(potentialView(state, target)).toEqual({ kind: 'exact', value: target.potential });
    expect(scoutingOf(state).reports).toBe(1);
    // Rien de plus à apprendre sur lui.
    expect(scoutPlayer(state, target.id).ok).toBe(false);
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
    for (const playerId of opponent.playerIds) expect(asCoach(state, 'a', () => isScouted(state, state.players[playerId]!))).toBe(true);
    const bobKnows = opponent.playerIds.filter((id) => asCoach(state, 'b', () => isScouted(state, state.players[id]!))).length;
    expect(bobKnows).toBeLessThan(opponent.playerIds.length);
  });
});

describe('plus de capacité inconnue chez soi (CAP-13)', () => {
  test('les jeunes promus et les dépanneurs arrivent avec leur capacité connue', () => {
    const state = newGame({ seed: 8, clubName: 'Scout FC' });
    for (const playerId of humanClub(state).playerIds) state.players[playerId]!.ability.revealed = false;
    revealOwnSquads(state);
    for (const playerId of humanClub(state).playerIds) expect(state.players[playerId]!.ability.revealed).toBe(true);
    // Les autres clubs ne sont pas concernés.
    expect(strangers(state).some((player) => !player.ability.revealed)).toBe(true);
  });

  test('en match, un adversaire scouté joue capacités connues', () => {
    const state = newGame({ seed: 9, clubName: 'Scout FC' });
    // Première semaine où le coach a un match.
    while (!humanFixture(state)) state.week += 1;
    const fixture = humanFixture(state)!;
    const opponentId = fixture.homeId === state.humanClubId ? fixture.awayId : fixture.homeId;
    scoutOpponents(state, opponentId);
    if (humanLineupErrors(state).length > 0) autoPickLineup(state);
    const match = withRng(state, (rng) => startHumanMatch(state, rng));
    const opponents = fixture.homeId === state.humanClubId ? match.away : match.home;
    expect(opponents.players.every((player) => player.abilityRevealed)).toBe(true);
  });
});
