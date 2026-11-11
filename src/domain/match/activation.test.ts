import { describe, expect, test } from 'bun:test';
import { makeSheet, testMatchOptions } from './fixtures';
import { cancelActivation, confirmActivation, previewActivation, selectTarget, startActivation } from './activation';
import { announceSetPiece, awardPenalty, choosePenaltyStyle } from './plays';
import { activeEffects } from './queries';
import { tick } from './simulation';
import { beginRun, createMatch, endRun, GAUGE_START, requirePlayer } from './state';
import { dismissEventWindow } from './windows';
import type { MatchState } from './types';

/** Match coach contre coach : aucune IA ne vient perturber le test. */
function humanMatch(abilities: Record<number, string>, options: { bench?: string[] } = {}) {
  const home = makeSheet({ clubId: 'h', isHuman: true, abilities, benchAbilities: options.bench });
  return createMatch(testMatchOptions(home, makeSheet({ clubId: 'a', isHuman: true })));
}

function activate(state: MatchState, playerId: string, targetIds: string[] = []) {
  startActivation(state, 'home', playerId);
  for (const targetId of targetIds) selectTarget(state, targetId);
  return confirmActivation(state);
}

describe('activation des capacités', () => {
  test('la jauge est débitée à la validation, et la capacité ne resservira pas du match (CAP-04, CAP-05)', () => {
    const state = humanMatch({ 5: 'pilier' });
    expect(previewActivation(state, 'home', 'h-5')).toMatchObject({ available: true, cost: 2, rarity: 'common' });
    const events = activate(state, 'h-5');
    expect(events.some((event) => event.kind === 'activation')).toBe(true);
    expect(state.home.gauge).toBe(GAUGE_START - 2);
    const preview = previewActivation(state, 'home', 'h-5');
    expect(preview.available).toBe(false);
    expect(preview.reason).toContain('Déjà utilisée');
    state.home.gauge = 10;
    expect(previewActivation(state, 'home', 'h-5').available).toBe(false);
  });

  test('annuler avant validation ne consomme ni jauge ni recharge (CAP-20)', () => {
    const state = humanMatch({ 1: 'boucher' });
    startActivation(state, 'home', 'h-1');
    expect(state.pending).not.toBeNull();
    expect(tick(state)).toEqual([]);
    cancelActivation(state);
    expect(state.pending).toBeNull();
    expect(state.home.gauge).toBe(GAUGE_START);
    expect(previewActivation(state, 'home', 'h-1').available).toBe(true);
  });

  test('les cibles valides respectent la ligne visée et excluent les joueurs hors jeu (CAP-16, CAP-17)', () => {
    const state = humanMatch({ 1: 'boucher' });
    expect(previewActivation(state, 'home', 'h-1').validTargetIds).toEqual(['a-9', 'a-10']);
    requirePlayer(state, 'a-9').knockedOutUntil = 10;
    const preview = startActivation(state, 'home', 'h-1');
    expect(preview.validTargetIds).toEqual(['a-10']);
    expect(selectTarget(state, 'a-9')).toBe(false);
    expect(selectTarget(state, 'a-10')).toBe(true);
    confirmActivation(state);
    expect(requirePlayer(state, 'a-10').knockedOutUntil).toBe(15);
    expect(activeEffects(state, 'a-10')[0]).toMatchObject({ stat: 'knockout', remaining: 15 });
  });

  test('plusieurs cibles se choisissent une à une avant validation (CAP-17)', () => {
    const state = humanMatch({ 6: 'chambreur' });
    startActivation(state, 'home', 'h-6');
    expect(state.pending?.required).toBe(2);
    selectTarget(state, 'a-0');
    expect(confirmActivation(state)).toEqual([]);
    selectTarget(state, 'a-3');
    expect(confirmActivation(state).length).toBeGreaterThan(0);
    expect(activeEffects(state, 'a-3')[0]).toMatchObject({ stat: 'concentration', value: -0.15, remaining: 10 });
  });

  test('une capacité de zone frappe à l’emplacement du joueur, sans choix de cible (CAP-18)', () => {
    const state = humanMatch({ 5: 'vomisseur' });
    expect(previewActivation(state, 'home', 'h-5').targetCount).toBe(0);
    activate(state, 'h-5');
    const knocked = state.away.players.filter((player) => player.knockedOutUntil > 0).map((player) => player.id);
    expect(knocked).toEqual(['a-5', 'a-6', 'a-7', 'a-8']);
    expect(state.activations[0]!.zone).toBe(true);
  });

  test('une capacité « Banc » s’active depuis le banc, au hasard parmi les adversaires (CAP-03, CAP-18)', () => {
    const state = humanMatch({}, { bench: ['kebab'] });
    expect(previewActivation(state, 'home', 'h-b0').available).toBe(true);
    activate(state, 'h-b0');
    expect(state.away.players.filter((player) => player.knockedOutUntil > 0)).toHaveLength(2);
  });

  test('un joueur exclu ne peut plus rien activer', () => {
    const state = humanMatch({ 5: 'pilier' });
    requirePlayer(state, 'h-5').sentOff = true;
    expect(previewActivation(state, 'home', 'h-5')).toMatchObject({ available: false });
  });

  test('une légendaire aussi ne sert qu’une fois, même jauge pleine', () => {
    const state = humanMatch({}, { bench: ['malediction'] });
    state.home.gauge = 10;
    activate(state, 'h-b0');
    expect(state.home.gauge).toBe(5);
    expect(previewActivation(state, 'home', 'h-b0').reason).toContain('Déjà utilisée');
  });

  test('une capacité d’occasion resert à chaque occasion', () => {
    const home = makeSheet({ clubId: 'h', isHuman: true, abilities: { 9: 'biere-tiede' } });
    const state = createMatch({ home, away: makeSheet({ clubId: 'a', isHuman: true }), seed: 1 });
    state.home.gauge = 10;
    for (let penalty = 0; penalty < 2; penalty++) {
      const run = beginRun(state);
      awardPenalty(run, 'home', null);
      endRun(run);
      // Pas de Panenka : elle ferait bouger la jauge.
      choosePenaltyStyle(state, 'home', 'placed');
      expect(previewActivation(state, 'home', 'h-9').available).toBe(true);
      activate(state, 'h-9');
      dismissEventWindow(state);
      tick(state);
    }
    expect(state.home.gauge).toBe(10 - 2 * 2);
  });

  test('sans jauge suffisante, la raison est donnée', () => {
    const state = humanMatch({}, { bench: ['malediction'] });
    state.home.gauge = 2;
    expect(previewActivation(state, 'home', 'h-b0').reason).toContain('3 point(s)');
  });

  test('une capacité cachée se révèle à sa première activation (CAP-13)', () => {
    const state = humanMatch({ 5: 'cache' });
    requirePlayer(state, 'h-5').abilityRevealed = false;
    expect(previewActivation(state, 'home', 'h-5').abilityName).toBe('???');
    activate(state, 'h-5');
    expect(previewActivation(state, 'home', 'h-5').abilityName).toBe('cache');
    expect(state.home.consequences).toContainEqual({ type: 'abilityRevealed', playerId: 'h-5', abilityId: 'cache' });
  });

  test('chaque activation garde de quoi la mettre en scène sur le terrain', () => {
    const state = humanMatch({ 1: 'boucher' });
    activate(state, 'h-1', ['a-9']);
    expect(state.activations[0]).toMatchObject({ rarity: 'rare', targetIds: ['a-9'], floats: [{ playerId: 'a-9', text: 'K.O. 15 MIN', tone: 'malus' }] });
  });
});

describe('fenêtres d’événement (CAP-19)', () => {
  /** Coup franc (ou corner) de l'IA contre le coach. */
  function setPieceAgainstHome(state: MatchState, kind: 'freeKick' | 'corner' = 'freeKick'): void {
    state.away.isHuman = false;
    const run = beginRun(state);
    announceSetPiece(run, 'away', kind);
    endRun(run);
  }

  test('un coup franc adverse met le match en pause si le coach a une capacité adaptée', () => {
    const state = humanMatch({ 3: 'mur' });
    expect(previewActivation(state, 'home', 'h-3').available).toBe(false);
    setPieceAgainstHome(state);
    expect(state.awaiting).toEqual({ side: 'home', trigger: 'opponentFreeKick', eligiblePlayerIds: ['h-3'], freeKick: 'defense' });
    expect(tick(state)).toEqual([]);
    activate(state, 'h-3');
    // La capacité est jouée ; reste le choix du mur.
    expect(state.awaiting).toMatchObject({ eligiblePlayerIds: [], freeKick: 'defense' });
    expect(state.home.shotMaluses).toEqual([{ value: 0.3, shotsLeft: 1 }]);
    dismissEventWindow(state);
    tick(state);
    expect(state.pendingPlay).toBeNull();
    expect(state.elapsed).toBe(0);
  });

  test('le coach peut laisser passer la fenêtre sans rien consommer', () => {
    const state = humanMatch({ 3: 'mur' });
    setPieceAgainstHome(state);
    dismissEventWindow(state);
    expect(state.awaiting).toBeNull();
    expect(state.home.gauge).toBe(GAUGE_START);
    tick(state);
    expect(state.pendingPlay).toBeNull();
  });

  test('sans capacité éligible, un corner ne fait pas s’arrêter le match', () => {
    const state = humanMatch({ 5: 'pilier' });
    setPieceAgainstHome(state, 'corner');
    expect(state.awaiting).toBeNull();
  });

  test('un coup franc arrête toujours le match : le coach choisit son mur', () => {
    const state = humanMatch({ 5: 'pilier' });
    setPieceAgainstHome(state);
    expect(state.awaiting).toMatchObject({ side: 'home', eligiblePlayerIds: [], freeKick: 'defense' });
    expect(state.pendingPlay?.kind).toBe('freeKick');
    expect(state.pendingPlay?.option).toBeDefined();
  });

  test('Bière tiède répond au penalty comme au coup franc', () => {
    const home = makeSheet({ clubId: 'h', isHuman: true, abilities: { 9: 'biere-tiede' } });
    const state = createMatch({ home, away: makeSheet({ clubId: 'a', isHuman: true }), seed: 1 });
    const run = beginRun(state);
    awardPenalty(run, 'home', null);
    endRun(run);
    expect(state.awaiting).toMatchObject({ trigger: 'ownPenalty', eligiblePlayerIds: ['h-9'] });
  });
});
