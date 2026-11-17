import { describe, expect, test } from 'bun:test';
import { DIALOGUES } from '../club/dialogues';
import { dismissEventWindow, tick } from '../match';
import { SEASON_WEEKS } from '../league/calendar';
import { answerDialogue, autoPickLineup, sellNow, setLineup } from './actions';
import { humanLineupErrors } from './matches';
import { finishHumanMatch, startHumanMatch } from './matches';
import { newGame } from './newGame';
import { createGameSaves } from './save';
import { divisionStandings } from './season';
import { humanClub, humanDivision, humanFixture } from './selectors';
import type { GameState } from './state';
import { advanceWeek, canAdvanceWeek, withRng } from './week';

/** Joue le match du coach sans activer de capacité, en laissant passer les fenêtres. */
function playHumanMatch(state: GameState): void {
  const match = withRng(state, (rng) => startHumanMatch(state, rng));
  while (match.status !== 'finished') {
    if (match.awaiting) dismissEventWindow(match);
    tick(match);
  }
  finishHumanMatch(state, match);
}

function playWeek(state: GameState): void {
  const fixture = humanFixture(state);
  if (fixture && !fixture.result) {
    if (humanLineupErrors(state).length > 0) autoPickLineup(state);
    playHumanMatch(state);
  }
  if (state.dialogue) {
    const dialogue = DIALOGUES.find((entry) => entry.id === state.dialogue!.dialogueId)!;
    answerDialogue(state, dialogue.choices[0]!.id);
  }
  advanceWeek(state);
}

describe('boucle de saison', () => {
  test('les barrages se jouent la dernière semaine et les divisions gardent 10 clubs (UNIV-04)', () => {
    const state = newGame({ seed: 77 });
    while (state.status === 'playing' && state.week < SEASON_WEEKS) playWeek(state);
    if (state.status === 'fired') return;
    const playoffs = state.fixtures.filter((fixture) => fixture.competition === 'playoff');
    expect(playoffs).toHaveLength(3);
    playWeek(state);
    expect(playoffs.every((fixture) => fixture.result !== null)).toBe(true);
    expect(state.season).toBe(2);
    expect(state.divisions.every((division) => division.clubIds.length === 10)).toBe(true);
  });

  test('une nouvelle partie démarre en district avec un calendrier complet (UNIV-02, UNIV-05)', () => {
    const state = newGame({ seed: 11, clubName: 'AS Test-sur-Comptoir' });
    expect(humanClub(state).name).toBe('AS Test-sur-Comptoir');
    expect(humanDivision(state).tier).toBe(4);
    expect(state.fixtures).toHaveLength(4 * 90);
    expect(state.objective.speech.length).toBeGreaterThan(0);
  });

  test('on ne passe pas la semaine tant que le match du coach n’est pas joué', () => {
    const state = newGame({ seed: 3 });
    while (!humanFixture(state)) playWeek(state);
    expect(canAdvanceWeek(state).ok).toBe(false);
    expect(() => advanceWeek(state)).toThrow();
  });

  test('une saison complète se joue, puis la suivante commence (UNIV-04, UNIV-05, UNIV-06)', () => {
    const state = newGame({ seed: 2026 });
    for (let week = 0; week < SEASON_WEEKS && state.status === 'playing'; week++) playWeek(state);
    if (state.status === 'fired') return; // licencié avant la fin : autre test.
    expect(state.season).toBe(2);
    expect(state.week).toBe(1);
    expect(state.history).toHaveLength(1);
    const table = divisionStandings(state, humanDivision(state).id);
    expect(table.every((row) => row.played === 0)).toBe(true);
    expect(state.divisions.every((division) => division.clubIds.length === 10)).toBe(true);
  });

  test('la confiance à zéro licencie le coach et fige la partie (CLUB-05)', () => {
    const state = newGame({ seed: 5 });
    state.outlook.presidentConfidence = 0;
    playWeek(state);
    expect(state.status).toBe('fired');
    expect(canAdvanceWeek(state).ok).toBe(false);
  });

  test('la partie se sauvegarde et se recharge à l’identique (TECH-03, TECH-04)', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
      removeItem: (key: string) => void memory.delete(key),
    };
    const saves = createGameSaves(storage);
    const state = newGame({ seed: 8 });
    playWeek(state);
    saves.save(1, state, { clubName: humanClub(state).name, season: state.season, week: state.week });
    expect(saves.load(1)).toEqual(state);
    expect(saves.list()[0]).toMatchObject({ status: 'ok' });
  });

  test('vendre un titulaire garde une composition valide et la formation du coach (CLUB-02)', () => {
    const state = newGame({ seed: 21 });
    const lineup = humanClub(state).lineup!;
    setLineup(state, { ...lineup, formation: '4-3-3' });
    autoPickLineup(state);
    const starter = humanClub(state).lineup!.starters[5]!;
    expect(sellNow(state, starter).ok).toBe(true);
    expect(humanClub(state).lineup!.formation).toBe('4-3-3');
    expect(humanLineupErrors(state)).toEqual([]);
  });

  test('vendre un titulaire ne change que sa place, le reste de la compo ne bouge pas (CLUB-02)', () => {
    const state = newGame({ seed: 22 });
    const before = humanClub(state).lineup!;
    // Compo « du coach » : le onze de l'adjoint, avec deux remplaçants inversés.
    setLineup(state, { ...before, bench: [before.bench[1]!, before.bench[0]!, ...before.bench.slice(2)] });
    const mine = humanClub(state).lineup!;
    const sold = mine.starters[9]!;
    expect(sellNow(state, sold).ok).toBe(true);
    const after = humanClub(state).lineup!;
    after.starters.forEach((id, index) => {
      if (index !== 9) expect(id).toBe(mine.starters[index]!);
    });
    expect(after.starters[9]).not.toBe(sold);
    expect(after.starters[9]).not.toBe('');
    expect(after.bench.filter((id) => mine.bench.includes(id))).toEqual(mine.bench.filter((id) => after.bench.includes(id)));
    expect(humanLineupErrors(state)).toEqual([]);
  });

  test('vendre un joueur de la tribune ne touche pas à la compo (CLUB-02)', () => {
    const state = newGame({ seed: 23 });
    const lineup = humanClub(state).lineup!;
    const benched = lineup.bench.at(-1)!;
    setLineup(state, { ...lineup, bench: lineup.bench.slice(0, -1) });
    const mine = JSON.stringify(humanClub(state).lineup);
    expect(sellNow(state, benched).ok).toBe(true);
    expect(JSON.stringify(humanClub(state).lineup)).toBe(mine);
  });

  test('les offres tombent quand le mercato ferme (CLUB-02, CLUB-03)', () => {
    const state = newGame({ seed: 4 });
    state.offers = [{ id: 'o1', playerId: humanClub(state).playerIds[0]!, fromClubId: 'club-01', amount: 1000, expiresWeek: 10 }];
    playWeek(state);
    playWeek(state);
    expect(state.week).toBe(3);
    expect(state.offers).toEqual([]);
  });
});
