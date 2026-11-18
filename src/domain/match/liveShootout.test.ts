import { describe, expect, test } from 'bun:test';
import { makeSheet, playToEnd, testMatchOptions } from './fixtures';
import { defaultShootoutOrder, setShootoutOrder, shootoutScore, shootoutWinner } from './liveShootout';
import { chooseKeeperDive, choosePenaltyStyle } from './plays';
import { tick } from './simulation';
import { createMatch, teamOf } from './state';
import { substitutePlayer } from './substitutions';
import { toMatchResult } from './summary';
import type { LiveShootout, MatchState } from './types';
import { dismissEventWindow } from './windows';

/** Match de coupe, coach humain à domicile, joué jusqu'au bout du temps réglementaire à égalité. */
function tiedCupMatch(): MatchState {
  for (let seed = 0; seed < 80; seed++) {
    const state = createMatch({ ...testMatchOptions(makeSheet({ clubId: 'h', isHuman: true }), makeSheet({ clubId: 'a' }), seed), knockout: true });
    for (let i = 0; i < 400 && state.status !== 'shootout' && state.status !== 'finished'; i++) {
      if (state.awaiting) dismissEventWindow(state);
      tick(state);
    }
    if (state.status === 'shootout') return state;
  }
  throw new Error('aucun match nul en 80 graines');
}

describe('tirs au but en direct (TAB-01)', () => {
  test('à égalité, la séance attend l’ordre des tireurs du coach, sans toucher au score du match', () => {
    const state = tiedCupMatch();
    const goals = [state.home.goals, state.away.goals];
    expect(state.awaiting?.shootoutOrder).toBe(true);
    expect(state.awaiting?.side).toBe('home');
    const order = state.liveShootout!.order.home;
    // Le gardien tire en dernier.
    expect(teamOf(state, 'home').players.find((player) => player.id === order.at(-1))!.line).toBe('GK');
    expect(setShootoutOrder(state, 'away', null)).toBe(false);
    expect(setShootoutOrder(state, 'home', order.slice(1))).toBe(false);
    const reversed = [...order].reverse();
    expect(setShootoutOrder(state, 'home', reversed)).toBe(true);
    expect(state.liveShootout!.order.home).toEqual(reversed);
    // Premier penalty posé : une fenêtre de frappe ou de plongeon pour le coach.
    expect(state.pendingPlay?.kind).toBe('penalty');
    expect(state.awaiting?.penalty).toBeDefined();
    playToEnd(state);
    expect([state.home.goals, state.away.goals]).toEqual(goals);
    expect(state.status).toBe('finished');
  });

  test('le coach choisit à chaque tir ; le tireur suit son ordre ; le résultat est rendu', () => {
    const state = tiedCupMatch();
    setShootoutOrder(state, 'home', null);
    const shooters: string[] = [];
    for (let i = 0; i < 200 && state.status === 'shootout'; i++) {
      const play = state.pendingPlay;
      if (play?.side === 'home') {
        shooters.push(play.takerId!);
        expect(choosePenaltyStyle(state, 'home', 'placed')).toBe(true);
      } else if (play) expect(chooseKeeperDive(state, 'home', 'left')).toBe(true);
      if (state.awaiting) dismissEventWindow(state);
      tick(state);
    }
    expect(state.status).toBe('finished');
    const order = defaultShootoutOrder(state, state.home);
    expect(shooters).toEqual(shooters.map((_, index) => order[index % order.length]));
    const kicks = state.shootout!.kicks!;
    expect(kicks.filter((kick) => kick.side === 'home').every((kick) => kick.style === 'placed')).toBe(true);
    expect(kicks.filter((kick) => kick.side === 'away').every((kick) => kick.dive === 'left')).toBe(true);
    expect(state.shootout!.home).not.toBe(state.shootout!.away);
    expect(toMatchResult(state).penaltyWinnerId).toBe(state.shootout!.winner === 'home' ? 'h' : 'a');
  });

  test('la séance s’arrête dès qu’une équipe ne peut plus être rattrapée, puis mort subite à tirs égaux', () => {
    const kick = (side: 'home' | 'away', scored: boolean) => ({ side, playerId: 'x', keeperId: null, style: 'placed' as const, dive: 'left' as const, aim: 'left' as const, scored });
    const shootout = (pattern: [boolean, boolean][]): LiveShootout => ({
      first: 'home',
      order: { home: [], away: [] },
      ordering: [],
      kicks: pattern.flatMap(([home, away]) => [kick('home', home), kick('away', away)]),
    });
    // 3-0 après trois tirs chacun : plus rattrapable.
    expect(shootoutWinner(shootout([[true, false], [true, false], [true, false]]))).toBe('home');
    // 4-1 après le 4e tir de domicile : avec deux tirs, l’extérieur ne peut plus revenir.
    const early = shootout([[true, false], [true, false], [true, true]]);
    early.kicks.push(kick('home', true));
    expect(shootoutWinner(early)).toBe('home');
    // 5-5 : mort subite ; à tirs égaux et score différent, c'est fini.
    const level = shootout([[true, true], [true, true], [true, true], [true, true], [true, true]]);
    expect(shootoutWinner(level)).toBeNull();
    level.kicks.push(kick('home', false));
    expect(shootoutWinner(level)).toBeNull();
    level.kicks.push(kick('away', true));
    expect(shootoutWinner(level)).toBe('away');
    expect(shootoutScore(level)).toEqual({ home: 5, away: 6 });
  });

  test('pendant la séance, pas de remplacement', () => {
    const state = tiedCupMatch();
    const bench = state.home.players.find((player) => player.line === null);
    const starter = state.home.players.find((player) => player.line !== null && player.line !== 'GK')!;
    expect(state.status).toBe('shootout');
    if (bench) {
      expect(substitutePlayer(state, 'home', starter.id, bench.id)).toBe(false);
    }
  });
});
