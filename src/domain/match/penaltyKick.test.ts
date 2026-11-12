import { describe, expect, test } from 'bun:test';
import { makeSheet } from './fixtures';
import { expectedAgainstDive, expectedPenaltyChance, KEEPER_STAY_CHANCE, keeperHabit, PENALTY_STYLE_CHANCE } from './penaltyKick';
import { awardPenalty, chooseKeeperDive, choosePenaltyStyle, penaltyChances } from './plays';
import { confirmActivation, startActivation } from './activation';
import { tick } from './simulation';
import { beginRun, createMatch, endRun } from './state';
import { dismissEventWindow } from './windows';
import type { KeeperDive, MatchState, PenaltyStyle } from './types';

function penaltyMatch(seed: number, humanSide: 'home' | 'away'): MatchState {
  const state = createMatch({
    home: makeSheet({ clubId: 'h', isHuman: humanSide === 'home' }),
    away: makeSheet({ clubId: 'a', isHuman: humanSide === 'away' }),
    seed,
  });
  const run = beginRun(state);
  awardPenalty(run, 'home', null);
  endRun(run);
  return state;
}

/** Joue le penalty de `home` et rend vrai s'il est marqué. */
function kick(state: MatchState): boolean {
  const before = state.home.goals;
  dismissEventWindow(state);
  tick(state);
  return state.home.goals > before;
}

function conversion(choose: (state: MatchState) => void, humanSide: 'home' | 'away', runs = 3000): number {
  let scored = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const state = penaltyMatch(seed, humanSide);
    choose(state);
    if (kick(state)) scored++;
  }
  return scored / runs;
}

describe('penalty : style de frappe et plongeon (P4)', () => {
  test('le coach qui tire a une fenêtre pour choisir sa frappe, celui qui défend pour plonger', () => {
    expect(penaltyMatch(1, 'home').awaiting?.penalty).toBe('attack');
    expect(penaltyMatch(1, 'away').awaiting?.penalty).toBe('defense');
  });

  test('le tireur choisit sa frappe, pas l’adversaire ; le gardien choisit son plongeon, pas le tireur', () => {
    const state = penaltyMatch(1, 'home');
    expect(choosePenaltyStyle(state, 'away', 'panenka')).toBe(false);
    expect(chooseKeeperDive(state, 'home', 'center')).toBe(false);
    expect(choosePenaltyStyle(state, 'home', 'panenka')).toBe(true);
    expect(chooseKeeperDive(state, 'away', 'center')).toBe(true);
    expect(state.pendingPlay).toMatchObject({ style: 'panenka', dive: 'center' });
  });

  test('une Panenka face à un gardien qui reste au centre finit presque toujours dans ses bras', () => {
    const rate = conversion((state) => {
      choosePenaltyStyle(state, 'home', 'panenka');
      chooseKeeperDive(state, 'away', 'center');
    }, 'home', 400);
    expect(rate).toBeLessThan(0.15);
  });

  test('une Panenka réussie fait gagner de la gueulante au tireur et en fait perdre au gardien', () => {
    for (let seed = 1; seed < 50; seed++) {
      const state = penaltyMatch(seed, 'home');
      choosePenaltyStyle(state, 'home', 'panenka');
      chooseKeeperDive(state, 'away', 'left');
      const [home, away] = [state.home.gauge, state.away.gauge];
      if (!kick(state)) continue;
      // Le but encaissé rapporte 1 point à l'adversaire, la Panenka lui en reprend 1.
      expect(state.home.gauge).toBe(home + 1);
      expect(state.away.gauge).toBe(away);
      return;
    }
    throw new Error('Aucune Panenka marquée en 50 essais');
  });

  test('l’habitude d’un gardien est fixe et la frappe placée punit celui qui reste au centre', () => {
    expect(keeperHabit('gardien-1')).toBe(keeperHabit('gardien-1'));
    expect(expectedPenaltyChance('placed', KEEPER_STAY_CHANCE.stayer)).toBeGreaterThan(expectedPenaltyChance('power', KEEPER_STAY_CHANCE.stayer));
    expect(expectedPenaltyChance('panenka', KEEPER_STAY_CHANCE.diver)).toBeGreaterThan(expectedPenaltyChance('placed', KEEPER_STAY_CHANCE.diver));
  });

  test('équilibre : laissé à l’IA, un penalty rentre toujours environ 3 fois sur 4', () => {
    const rate = conversion(() => {}, 'away');
    expect(rate).toBeGreaterThan(0.7);
    expect(rate).toBeLessThan(0.82);
  });

  test('équilibre : aucun plongeon du gardien ne ferme le penalty', () => {
    for (const dive of ['left', 'right', 'center'] as KeeperDive[]) expect(expectedAgainstDive(dive)).toBeGreaterThan(0.65);
    for (const style of ['placed', 'power', 'panenka'] as PenaltyStyle[]) expect(PENALTY_STYLE_CHANCE[style].wrong).toBeGreaterThan(0.9);
  });

  test('chances exactes : chaque frappe et chaque plongeon donnent ce que la simulation joue', () => {
    const cases: [PenaltyStyle, KeeperDive][] = [['placed', 'left'], ['power', 'center'], ['panenka', 'right'], ['panenka', 'center']];
    for (const [style, dive] of cases) {
      const shown = (() => {
        const state = penaltyMatch(1, 'home');
        choosePenaltyStyle(state, 'home', style);
        chooseKeeperDive(state, 'away', dive);
        return penaltyChances(state)!.byStyle[style];
      })();
      const rate = conversion((state) => {
        choosePenaltyStyle(state, 'home', style);
        chooseKeeperDive(state, 'away', dive);
      }, 'home', 2000);
      expect(Math.abs(rate - shown)).toBeLessThan(0.035);
    }
  });

  test('Le Danseur divise les chances du tireur par deux, et les chiffres le montrent', () => {
    const state = createMatch({
      home: makeSheet({ clubId: 'h' }),
      away: makeSheet({ clubId: 'a', isHuman: true, abilities: { 0: 'le-danseur' } }),
      seed: 3,
    });
    state.away.gauge = 10;
    const run = beginRun(state);
    awardPenalty(run, 'home', null);
    endRun(run);
    expect(state.awaiting?.eligiblePlayerIds).toEqual(['a-0']);
    const before = penaltyChances(state)!;
    startActivation(state, 'away', 'a-0');
    confirmActivation(state);
    const after = penaltyChances(state)!;
    expect(after.malus).toBe(0.5);
    // Moitié des chances avant le plafond de 97 % : un poil plus que la moitié des chances plafonnées.
    for (const dive of ['left', 'center'] as KeeperDive[]) {
      expect(after.byDive[dive]).toBeGreaterThan(before.byDive[dive] * 0.48);
      expect(after.byDive[dive]).toBeLessThan(before.byDive[dive] * 0.52);
    }
  });
});
