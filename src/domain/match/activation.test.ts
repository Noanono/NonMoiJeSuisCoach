import { describe, expect, test } from 'bun:test';
import type { AbilityContext } from '../abilities/progression';
import { makeSheet, testMatchOptions } from './fixtures';
import { cancelActivation, confirmActivation, previewActivation, selectTarget, startActivation } from './activation';
import { announceSetPiece } from './plays';
import { activeEffects } from './queries';
import { tick } from './simulation';
import { beginRun, createMatch, endRun, requirePlayer } from './state';
import { dismissEventWindow } from './windows';
import type { MatchState } from './types';

/** Match coach contre coach : aucune IA ne vient perturber le test. */
function humanMatch(abilities: Record<number, string>, options: { bench?: string[]; context?: AbilityContext } = {}) {
  const home = makeSheet({ clubId: 'h', isHuman: true, abilities, benchAbilities: options.bench });
  if (options.context) home.context = options.context;
  return createMatch(testMatchOptions(home, makeSheet({ clubId: 'a', isHuman: true })));
}

function activate(state: MatchState, playerId: string, targetIds: string[] = []) {
  startActivation(state, 'home', playerId);
  for (const targetId of targetIds) selectTarget(state, targetId);
  return confirmActivation(state);
}

describe('activation des capacités', () => {
  test('la jauge est débitée et la recharge démarre à la validation (CAP-04, CAP-05)', () => {
    const state = humanMatch({ 5: 'pilier' });
    expect(previewActivation(state, 'home', 'h-5')).toMatchObject({ available: true, cost: 2, successChance: 1 });
    const events = activate(state, 'h-5');
    expect(events.some((event) => event.kind === 'activation')).toBe(true);
    expect(state.home.gauge).toBe(1);
    const preview = previewActivation(state, 'home', 'h-5');
    expect(preview.available).toBe(false);
    expect(preview.cooldownRemaining).toBe(20);
    expect(preview.reason).toContain('20 min');
  });

  test('annuler avant validation ne consomme ni jauge ni recharge (CAP-20)', () => {
    const state = humanMatch({ 1: 'boucher' });
    startActivation(state, 'home', 'h-1');
    expect(state.pending).not.toBeNull();
    expect(tick(state)).toEqual([]);
    cancelActivation(state);
    expect(state.pending).toBeNull();
    expect(state.home.gauge).toBe(3);
    expect(requirePlayer(state, 'h-1').usesThisMatch).toBe(0);
    expect(previewActivation(state, 'home', 'h-1').available).toBe(true);
  });

  test('les cibles valides respectent la portée et excluent les joueurs hors jeu (CAP-16, CAP-17)', () => {
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

  test('une légendaire consomme une utilisation de la saison et ses revers sont reportés (CAP-12)', () => {
    const state = humanMatch({}, { bench: ['malediction'] });
    activate(state, 'h-b0');
    expect(requirePlayer(state, 'h-b0').seasonUses).toBe(1);
    expect(state.home.consequences).toContainEqual({ type: 'seasonUse', playerId: 'h-b0', abilityId: 'malediction', seasonUses: 1 });
    expect(state.home.consequences.some((consequence) => consequence.type === 'squadFatigue')).toBe(true);
    expect(state.home.consequences.some((consequence) => consequence.type === 'fine')).toBe(true);
    state.home.gauge = 10;
    expect(previewActivation(state, 'home', 'h-b0').reason).toContain('saison');
  });

  test('une capacité cachée se révèle à sa première activation (CAP-13)', () => {
    const state = humanMatch({ 5: 'cache' });
    requirePlayer(state, 'h-5').abilityRevealed = false;
    expect(previewActivation(state, 'home', 'h-5').abilityName).toBe('???');
    activate(state, 'h-5');
    expect(previewActivation(state, 'home', 'h-5').abilityName).toBe('cache');
    expect(state.home.consequences).toContainEqual({ type: 'abilityRevealed', playerId: 'h-5', abilityId: 'cache' });
  });

  test('deux capacités compatibles à moins de 5 minutes déclenchent le combo (CAP-15)', () => {
    const state = humanMatch({ 5: 'beau-gosse', 6: 'ex-president' });
    activate(state, 'h-5');
    const events = activate(state, 'h-6');
    expect(events.some((event) => event.kind === 'combo')).toBe(true);
    expect(state.combosTriggered).toEqual([{ side: 'home', name: 'Drame conjugal', minute: 0 }]);
    expect(activeEffects(state, 'h-5').some((effect) => effect.label === 'Drame conjugal')).toBe(true);
    expect(activeEffects(state, 'h-6').some((effect) => effect.label === 'Drame conjugal')).toBe(true);
    expect(state.home.consequences).toContainEqual({ type: 'presidentConfidence', value: -15, reason: 'Drame conjugal' });
  });

  test('après une grosse soirée, les capacités alcoolisées frappent 50 % plus fort (CAP-14)', () => {
    const state = humanMatch({ 5: 'pilier' }, { context: { teamNight: 'bigNight', houseRules: [] } });
    activate(state, 'h-5');
    expect(activeEffects(state, 'h-5')[0]!.value).toBeCloseTo(0.6);
    const ruled = humanMatch({ 5: 'pilier' }, { context: { teamNight: 'none', houseRules: ['noAlcoholEve'] } });
    expect(previewActivation(ruled, 'home', 'h-5').risks[0]!.chance).toBeCloseTo(0.17);
  });
});

describe('fenêtres d’événement (CAP-19)', () => {
  function setPieceAgainstHome(state: MatchState): void {
    const run = beginRun(state);
    announceSetPiece(run, 'away', 'freeKick');
    endRun(run);
  }

  test('un coup franc adverse met le match en pause si le coach a une capacité adaptée', () => {
    const state = humanMatch({ 3: 'mur' });
    expect(previewActivation(state, 'home', 'h-3').available).toBe(false);
    setPieceAgainstHome(state);
    expect(state.awaiting).toEqual({ side: 'home', trigger: 'opponentSetPiece', eligiblePlayerIds: ['h-3'] });
    expect(tick(state)).toEqual([]);
    activate(state, 'h-3');
    expect(state.awaiting).toBeNull();
    expect(state.home.shotMaluses).toEqual([{ value: 0.3, shotsLeft: 1 }]);
    tick(state);
    expect(state.pendingPlay).toBeNull();
    expect(state.elapsed).toBe(0);
  });

  test('le coach peut laisser passer la fenêtre sans rien consommer', () => {
    const state = humanMatch({ 3: 'mur' });
    setPieceAgainstHome(state);
    dismissEventWindow(state);
    expect(state.awaiting).toBeNull();
    expect(state.home.gauge).toBe(3);
    tick(state);
    expect(state.pendingPlay).toBeNull();
  });

  test('sans capacité éligible, le match ne s’arrête pas', () => {
    const state = humanMatch({ 5: 'pilier' });
    setPieceAgainstHome(state);
    expect(state.awaiting).toBeNull();
  });
});
