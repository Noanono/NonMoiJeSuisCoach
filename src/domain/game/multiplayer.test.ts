import { describe, expect, test } from 'bun:test';
import { dismissEventWindow, tick } from '../match';
import { DIALOGUES } from '../club/dialogues';
import { SEASON_WEEKS } from '../league/calendar';
import { answerDialogue, autoPickLineup } from './actions';
import { acceptJob } from './career';
import { asCoach, focusCoach, isMultiplayer, syncFocus } from './coaches';
import { finishHumanMatch, humanLineupErrors, startHumanMatch } from './matches';
import { joinMidGame, newMultiplayerGame, signupError } from './multiplayer';
import { newGame } from './newGame';
import { humanClub, humanDivision, humanFixture } from './selectors';
import type { GameState } from './state';
import { advanceWeek, canAdvanceWeek, withRng } from './week';

const SIGNUPS = [
  { id: 'a', name: 'Alice', clubName: 'Les Gros Mollets' },
  { id: 'b', name: 'Bob', clubName: 'Racing Pastis' },
  { id: 'c', name: 'Chloé', clubName: 'Olympique Merguez' },
];

/** Chaque coach joue son match et répond à son dialogue, puis la semaine avance. */
function playWeekForAll(state: GameState): void {
  for (const coach of state.coaches!) {
    asCoach(state, coach.id, () => {
      // Licencié : il signe tout de suite dans le premier club qui l'appelle.
      if (state.status === 'fired') acceptJob(state, state.jobOffers[0]!);
      const fixture = humanFixture(state);
      if (fixture && !fixture.result) {
        if (humanLineupErrors(state).length > 0) autoPickLineup(state);
        const match = withRng(state, (rng) => startHumanMatch(state, rng));
        while (match.status !== 'finished') {
          if (match.awaiting) dismissEventWindow(match);
          tick(match);
        }
        finishHumanMatch(state, match);
      }
      if (state.dialogue) {
        const dialogue = DIALOGUES.find((candidate) => candidate.id === state.dialogue!.dialogueId)!;
        answerDialogue(state, dialogue.choices[0]!.id);
      }
    });
  }
  advanceWeek(state);
}

describe('ligue entre amis (MULTI-01 à MULTI-03)', () => {
  test('chaque coach a son club, dans la division de départ, avec son nom', () => {
    const state = newMultiplayerGame({ seed: 11, coaches: SIGNUPS });
    expect(isMultiplayer(state)).toBe(true);
    const clubIds = state.coaches!.map((coach) => coach.clubId);
    expect(new Set(clubIds).size).toBe(3);
    const tiers = clubIds.map((id) => state.divisions.find((division) => division.clubIds.includes(id))!.tier);
    expect(new Set(tiers).size).toBe(1);
    for (const [index, coach] of state.coaches!.entries()) {
      expect(state.clubs[coach.clubId]!.name).toBe(SIGNUPS[index]!.clubName);
      expect(state.clubs[coach.clubId]!.isHuman).toBe(true);
      asCoach(state, coach.id, () => {
        expect(humanClub(state).id).toBe(coach.clubId);
        expect(state.objective.speech).not.toBe('');
        expect(state.rivalId).not.toBe(coach.clubId);
      });
    }
  });

  test('la semaine n’avance que quand chaque coach a joué son match', () => {
    const state = newMultiplayerGame({ seed: 12, coaches: SIGNUPS });
    const bob = state.coaches![1]!;
    while (!asCoach(state, bob.id, () => humanFixture(state))) playWeekForAll(state);
    const week = state.week;
    const blocked = asCoach(state, bob.id, () => canAdvanceWeek(state));
    expect(blocked.ok).toBe(false);
    expect(() => advanceWeek(state)).toThrow();
    playWeekForAll(state);
    expect(state.week).toBe(week + 1);
  });

  test('une saison complète : chacun ses finances, son actualité et son bilan', () => {
    const state = newMultiplayerGame({ seed: 13, coaches: SIGNUPS });
    for (let week = 1; week <= SEASON_WEEKS; week++) playWeekForAll(state);
    expect(state.season).toBe(2);
    syncFocus(state);
    for (const coach of state.coaches!) {
      expect(coach.history.length).toBe(1);
      expect(coach.history[0]!.clubName).toBe(state.clubs[coach.clubId]!.name);
      // Les actualités d'un coach ne parlent pas des primes des autres.
      expect(coach.lastFinance.length).toBeGreaterThan(0);
    }
    const [alice, bob] = state.coaches!;
    expect(alice!.news).not.toEqual(bob!.news);
  });

  test('changer de focus ne mélange rien : les champs reviennent intacts', () => {
    const state = newMultiplayerGame({ seed: 14, coaches: SIGNUPS });
    state.outlook.presidentConfidence = 12;
    focusCoach(state, 'b');
    expect(state.outlook.presidentConfidence).not.toBe(12);
    focusCoach(state, 'a');
    expect(state.outlook.presidentConfidence).toBe(12);
  });

  test('un ami qui arrive en cours de partie récupère le club IA le plus faible et le renomme', () => {
    const state = newMultiplayerGame({ seed: 15, coaches: SIGNUPS.slice(0, 2) });
    playWeekForAll(state);
    const clubId = joinMidGame(state, { id: 'd', name: 'Dédé', clubName: 'AS Cassoulet' });
    expect(state.clubs[clubId]!.name).toBe('AS Cassoulet');
    expect(state.clubs[clubId]!.isHuman).toBe(true);
    expect(state.focusedCoachId).toBe('a');
    asCoach(state, 'd', () => {
      expect(humanDivision(state).tier).toBe(4);
      expect(state.objective.speech).not.toBe('');
    });
    playWeekForAll(state);
    expect(state.week).toBe(3);
  });

  test('inscriptions : noms obligatoires et uniques', () => {
    expect(signupError(null, SIGNUPS, { id: 'd', name: 'alice', clubName: 'X' })).toContain('coach');
    expect(signupError(null, SIGNUPS, { id: 'd', name: 'Dédé', clubName: 'racing pastis' })).toContain('club');
    expect(signupError(null, SIGNUPS, { id: 'd', name: ' ', clubName: 'X' })).not.toBeNull();
    expect(signupError(null, SIGNUPS, { id: 'd', name: 'Dédé', clubName: 'AS Cassoulet' })).toBeNull();
  });

  test('le solo ne change pas : pas de fiche de coach', () => {
    const state = newGame({ seed: 1, clubName: 'Solo FC' });
    expect(isMultiplayer(state)).toBe(false);
    expect(state.coaches).toBeUndefined();
  });
});
