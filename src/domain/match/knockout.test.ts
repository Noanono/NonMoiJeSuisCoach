import { describe, expect, test } from 'bun:test';
import { recordGoal } from './actions';
import { makeSheet, playToEnd } from './fixtures';
import { beginRun, createMatch, endRun } from './state';

/** Joueurs au sol (CAP-09) : ils ne comptent plus dans la force de l'équipe, ne tirent pas, ne passent pas. */
const RUNS = 150;
const UNTIL_END = 1000;

/** Buts moyens (marqués, encaissés) de l'équipe à domicile quand `downed` reste au sol tout le match. */
function averageGoals(downed: number[]): { scored: number; conceded: number } {
  let scored = 0;
  let conceded = 0;
  for (let seed = 1; seed <= RUNS; seed++) {
    const state = createMatch({ home: makeSheet({ clubId: 'h' }), away: makeSheet({ clubId: 'a' }), seed });
    for (const index of downed) state.home.players[index]!.knockedOutUntil = UNTIL_END;
    playToEnd(state);
    scored += state.home.goals;
    conceded += state.away.goals;
  }
  return { scored: scored / RUNS, conceded: conceded / RUNS };
}

describe('joueurs au sol (CAP-09)', () => {
  // 4-4-2 : 0 = gardien, 1-4 défenseurs, 5-8 milieux, 9-10 attaquants.
  const reference = averageGoals([]);

  test('sans gardien debout, on encaisse beaucoup plus', () => {
    expect(averageGoals([0]).conceded).toBeGreaterThan(reference.conceded * 1.4);
  });

  test('sans attaquants debout, on marque beaucoup moins', () => {
    expect(averageGoals([9, 10]).scored).toBeLessThan(reference.scored * 0.8);
  });

  test('sans défenseurs debout, la défense prend l’eau', () => {
    expect(averageGoals([1, 2, 3, 4]).conceded).toBeGreaterThan(reference.conceded * 2);
  });

  test('un joueur au sol ne délivre pas de passe décisive', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = createMatch({ home: makeSheet({ clubId: 'h' }), away: makeSheet({ clubId: 'a' }), seed });
      state.home.players.forEach((player, index) => {
        if (index !== 9) player.knockedOutUntil = UNTIL_END;
      });
      const run = beginRun(state);
      recordGoal(run, 'home', state.home.players[9]!);
      endRun(run);
      expect(state.goals[0]!.assistId).toBeUndefined();
    }
  });
});
