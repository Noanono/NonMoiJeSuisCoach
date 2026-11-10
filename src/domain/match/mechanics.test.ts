import { describe, expect, test } from 'bun:test';
import { getAbility } from '../abilities/catalog';
import type { Effect } from '../types';
import { recordGoal } from './actions';
import { confirmActivation, previewActivation, selectTarget, startActivation } from './activation';
import { makeSheet } from './fixtures';
import { activeEffects } from './queries';
import { tick } from './simulation';
import { beginRun, createMatch, endRun, requirePlayer } from './state';
import { summarize } from './summary';
import type { MatchState } from './types';
import { dismissEventWindow } from './windows';

/** Effet d'un type donné d'une capacité du catalogue, au niveau 1 : les tests suivent l'équilibrage. */
function effectOf<T extends Effect['type']>(id: string, type: T): Extract<Effect, { type: T }> {
  const effect = getAbility(id).effects.find((candidate) => candidate.type === type);
  if (!effect) throw new Error(`${id} n'a pas d'effet ${type}`);
  return effect as Extract<Effect, { type: T }>;
}

/** Le vrai catalogue, deux coachs humains, jauge pleine. */
function match(abilities: Record<number, string>, bench: string[] = []): MatchState {
  const state = createMatch({
    home: makeSheet({ clubId: 'h', isHuman: true, abilities, benchAbilities: bench }),
    away: makeSheet({ clubId: 'a', isHuman: true }),
    seed: 42,
  });
  state.home.gauge = 10;
  return state;
}

function shout(state: MatchState, playerId: string, targets: string[] = []) {
  startActivation(state, 'home', playerId);
  for (const target of targets) selectTarget(state, target);
  return confirmActivation(state);
}

function goal(state: MatchState, side: 'home' | 'away', scorerIndex = 9): void {
  const run = beginRun(state);
  recordGoal(run, side, state[side].players[scorerIndex]!);
  endRun(run);
  if (state.awaiting) dismissEventWindow(state);
}

function advanceTo(state: MatchState, elapsed: number): void {
  while (state.elapsed < elapsed) {
    if (state.awaiting) dismissEventWindow(state);
    state.home.chanceBoosts.length = 0;
    tick(state);
  }
}

describe('mécaniques des rares', () => {
  test('Le Gardien kamikaze annule les prochaines actions et rend un point', () => {
    const state = match({ 0: 'le-gardien-kamikaze' });
    shout(state, 'h-0');
    expect(state.home.pendingCancels).toBe(effectOf('le-gardien-kamikaze', 'cancelAction').count ?? 1);
    expect(state.home.gauge).toBe(8);
  });

  test('Le Gardien fumeur devient plus fort à chaque but encaissé', () => {
    const state = match({ 0: 'le-gardien-fumeur' });
    goal(state, 'away');
    goal(state, 'away');
    shout(state, 'h-0');
    const smoke = effectOf('le-gardien-fumeur', 'scaledModifier');
    expect(activeEffects(state, 'h-0')[0]!.value).toBeCloseTo(smoke.base + 2 * smoke.perUnit);
  });

  test('Le Bus de l’amicale rend 2 points si la cage reste inviolée', () => {
    const state = match({ 1: 'le-bus-de-l-amicale' });
    shout(state, 'h-1');
    const after = state.home.gauge;
    state.home.delayed[0]!.at = 1;
    advanceTo(state, 1);
    expect(state.home.gauge).toBe(after + 2 - 0);
  });

  test('Le Bus de l’amicale ne rend rien si un but est encaissé', () => {
    const state = match({ 1: 'le-bus-de-l-amicale' });
    shout(state, 'h-1');
    goal(state, 'away');
    const after = state.home.gauge;
    state.home.delayed[0]!.at = 1;
    advanceTo(state, 1);
    expect(state.home.gauge).toBe(after);
  });

  test('Le Retraité de 42 ans prépare deux occasions', () => {
    const state = match({ 5: 'le-retraite-de-42-ans' });
    shout(state, 'h-5');
    expect(state.home.chanceBoosts).toHaveLength(2);
  });

  test('Le Pique-assiette vole deux points, jamais plus que ce qu’il y a', () => {
    const state = match({ 5: 'le-pique-assiette' });
    state.away.gauge = 1;
    state.home.gauge = 5;
    shout(state, 'h-5');
    expect(state.away.gauge).toBe(0);
    expect(state.home.gauge).toBe(3);
  });

  test('Le Revenant de la Feria vaut la minute de jeu', () => {
    const state = match({ 9: 'le-revenant-de-la-feria' });
    state.minute = 70;
    shout(state, 'h-9');
    expect(activeEffects(state, 'h-9')[0]!.value).toBeCloseTo(70 * effectOf('le-revenant-de-la-feria', 'scaledModifier').perUnit);
  });

  test('Le Chef de chant gagne 5 minutes à chaque but marqué', () => {
    const state = match({ 5: 'le-chef-de-chant' });
    shout(state, 'h-5');
    goal(state, 'home');
    expect(activeEffects(state, 'h-3')[0]!.remaining).toBe(effectOf('le-chef-de-chant', 'modifier').duration + 5);
  });

  test('Le Capitaine gueulard efface les malus et rend un point à partir de trois', () => {
    const state = match({ 5: 'le-capitaine-gueulard' });
    for (const id of ['h-1', 'h-2', 'h-3']) requirePlayer(state, id).effects.push({ label: 'x', stat: 'speed', value: -0.3, endsAt: 50 });
    const before = state.home.gauge;
    shout(state, 'h-5');
    expect(activeEffects(state, 'h-1').every((effect) => effect.value > 0)).toBe(true);
    expect(state.home.gauge).toBe(before - 3 + 1);
  });

  test('Le Chien du président change de victime', () => {
    const state = match({}, ['le-chien-du-president']);
    shout(state, 'h-b0', ['a-9']);
    const bite = effectOf('le-chien-du-president', 'knockout').duration;
    expect(requirePlayer(state, 'a-9').knockedOutUntil).toBe(bite);
    advanceTo(state, bite + 1);
    const others = state.away.players.filter((player) => player.id !== 'a-9' && player.knockedOutUntil >= bite + 1);
    expect(others).toHaveLength(1);
  });

  test('Le Sombrero bourré tire lui-même : s’il marque, sa recharge repart à zéro', () => {
    const state = match({ 9: 'le-sombrero-bourre' });
    shout(state, 'h-9');
    expect(state.home.chanceBoosts[0]).toMatchObject({ shooterId: 'h-9' });
    expect(requirePlayer(state, 'h-9').cooldownUntil).toBe(15);
  });
});

describe('durée des effets', () => {
  test('relancer une capacité encore active la prolonge sans la cumuler', () => {
    const state = match({ 3: 'l-agriculteur' });
    shout(state, 'h-3');
    requirePlayer(state, 'h-3').cooldownUntil = 0;
    shout(state, 'h-3');
    expect(activeEffects(state, 'h-3')).toHaveLength(1);
  });
});

describe('mécaniques des légendaires', () => {
  test('La Panenka ivre crée une occasion tout de suite', () => {
    let goals = 0;
    for (let seed = 0; seed < 40; seed++) {
      const state = createMatch({
        home: makeSheet({ clubId: 'h', isHuman: true, abilities: { 9: 'la-panenka-ivre' } }),
        away: makeSheet({ clubId: 'a', isHuman: true }),
        seed,
      });
      state.home.gauge = 5;
      shout(state, 'h-9');
      goals += state.home.goals;
    }
    expect(goals).toBeGreaterThan(20);
    expect(goals).toBeLessThan(40);
  });

  test('L’Échange de maillots inverse les niveaux et se voit sur tous les joueurs', () => {
    const state = match({ 5: 'l-echange-de-maillots' });
    shout(state, 'h-5');
    expect(state.swappedUntil).toBe(effectOf('l-echange-de-maillots', 'swapTeams').duration);
    expect(activeEffects(state, 'h-1')[0]).toMatchObject({ stat: 'swap', value: 1 });
    expect(activeEffects(state, 'a-1')[0]).toMatchObject({ stat: 'swap', value: -1 });
  });

  test('La Mêlée générale sort trois adversaires et le porteur', () => {
    const state = match({ 5: 'la-melee-generale' });
    shout(state, 'h-5', ['a-1', 'a-2', 'a-3']);
    const [brawl, self] = getAbility('la-melee-generale').effects as Extract<Effect, { type: 'knockout' }>[];
    for (const id of ['a-1', 'a-2', 'a-3']) expect(requirePlayer(state, id).knockedOutUntil).toBe(brawl!.duration);
    expect(requirePlayer(state, 'h-5').knockedOutUntil).toBe(self!.duration);
  });

  test('La Coupure de courant n’est possible que juste après un but adverse', () => {
    const state = match({}, ['la-coupure-de-courant']);
    expect(previewActivation(state, 'home', 'h-b0').available).toBe(false);
    goal(state, 'away');
    expect(state.away.goals).toBe(1);
    shout(state, 'h-b0');
    expect(state.away.goals).toBe(0);
  });
});

describe('mécaniques des mythiques', () => {
  const full = (state: MatchState) => {
    state.home.gauge = 10;
    return state;
  };

  test('une mythique coûte 7 et ne sert qu’une fois par match', () => {
    const state = match({ 3: 'le-miracle-du-kine' });
    shout(state, 'h-3');
    expect(state.home.gauge).toBe(3);
    state.home.gauge = 10;
    expect(previewActivation(state, 'home', 'h-3').reason).toContain('Déjà utilisée');
  });

  test('Le Transfert du parking prend le meilleur joueur de champ adverse', () => {
    const state = match({ 5: 'le-transfert-du-parking' });
    requirePlayer(state, 'a-9').rating = 90;
    requirePlayer(state, 'a-0').rating = 99;
    shout(state, 'h-5');
    const star = requirePlayer(state, 'a-9');
    expect(star.side).toBe('home');
    expect(state.home.players).toContain(star);
    expect(state.away.players).not.toContain(star);
    expect(state.home.players.filter((player) => player.line !== null)).toHaveLength(12);
    expect(state.activations[0]!.targetIds).toEqual(['a-9']);
  });

  test('Le But en or massif fait compter double et booste toute l’équipe', () => {
    const state = match({ 9: 'le-but-en-or-massif' });
    shout(state, 'h-9');
    expect(activeEffects(state, 'h-2')[0]).toMatchObject({ stat: 'all', value: effectOf('le-but-en-or-massif', 'modifier').value });
    goal(state, 'home');
    expect(state.home.goals).toBe(2);
    expect(state.goals[0]!.value).toBe(2);
    goal(state, 'away');
    expect(state.away.goals).toBe(1);
  });

  test('un but double annulé retire bien ses deux points', () => {
    const state = createMatch({
      home: makeSheet({ clubId: 'h', isHuman: true, abilities: { 9: 'le-but-en-or-massif' } }),
      away: makeSheet({ clubId: 'a', isHuman: true, benchAbilities: ['la-coupure-de-courant'] }),
      seed: 42,
    });
    state.home.gauge = 10;
    state.away.gauge = 10;
    shout(state, 'h-9');
    goal(state, 'home');
    startActivation(state, 'away', 'a-b0');
    confirmActivation(state);
    expect(state.home.goals).toBe(0);
  });

  test('Le Kebab du siècle sort six adversaires', () => {
    const state = full(match({}, ['le-kebab-du-siecle']));
    shout(state, 'h-b0');
    expect(state.away.players.filter((player) => player.knockedOutUntil > 0)).toHaveLength(6);
  });

  test('Le Miracle du kiné ramène exclus et blessés, sans suite après le match', () => {
    const state = match({ 3: 'le-miracle-du-kine' });
    const sent = requirePlayer(state, 'h-1');
    const hurt = requirePlayer(state, 'h-2');
    sent.sentOff = true;
    hurt.injured = true;
    state.injuries.push({ side: 'home', playerId: 'h-2', minute: 5, weeks: 4 });
    state.home.consequences.push({ type: 'suspension', playerId: 'h-1', matches: 2, reason: 'x' }, { type: 'injury', playerId: 'h-2', weeks: 4, reason: 'x' });
    requirePlayer(state, 'h-4').profile.fatigue = 60;
    shout(state, 'h-3');
    expect([sent.sentOff, hurt.injured]).toEqual([false, false]);
    expect(requirePlayer(state, 'h-4').profile.fatigue).toBe(0);
    expect(state.home.consequences).toEqual([]);
    expect(state.injuries).toEqual([]);
    expect(summarize(state).players.find((report) => report.playerId === 'h-4')!.fatigue).toBe(60);
  });

  test('Le Miracle du kiné booste toute l’équipe, joueurs revenus compris', () => {
    const state = match({ 3: 'le-miracle-du-kine' });
    requirePlayer(state, 'h-1').sentOff = true;
    shout(state, 'h-3');
    const boost = effectOf('le-miracle-du-kine', 'modifier');
    expect(activeEffects(state, 'h-1')[0]).toMatchObject({ stat: 'all', value: boost.value, remaining: boost.duration });
    expect(activeEffects(state, 'h-6')[0]).toMatchObject({ stat: 'all', value: boost.value });
  });

  test('l’IA économise sa jauge et déclenche sa mythique', () => {
    const state = createMatch({
      home: makeSheet({ clubId: 'h', isHuman: true }),
      away: makeSheet({ clubId: 'a', abilities: { 5: 'le-transfert-du-parking', 6: 'le-chambreur', 7: 'le-lacet-fou' } }),
      seed: 12,
    });
    while (state.status !== 'finished') {
      if (state.awaiting) dismissEventWindow(state);
      tick(state);
    }
    const used = state.activations.filter((record) => record.side === 'away').map((record) => record.abilityId);
    expect(used[0]).toBe('le-transfert-du-parking');
  });
});

describe('les capacités restent dans le match', () => {
  test('Le Porteur d’eau soulage pendant le match, pas après', () => {
    const state = match({}, ['le-porteur-d-eau']);
    requirePlayer(state, 'h-5').profile.fatigue = 40;
    shout(state, 'h-b0');
    expect(requirePlayer(state, 'h-5').profile.fatigue).toBeCloseTo(40 * (1 - effectOf('le-porteur-d-eau', 'energy').value));
    expect(summarize(state).players.find((report) => report.playerId === 'h-5')!.fatigue).toBe(40);
  });

  test('Le Kiné douteux ne vise que les joueurs au sol, et les relève', () => {
    const state = match({}, ['le-kine-douteux']);
    expect(previewActivation(state, 'home', 'h-b0').available).toBe(false);
    requirePlayer(state, 'h-5').knockedOutUntil = 20;
    expect(previewActivation(state, 'home', 'h-b0').validTargetIds).toEqual(['h-5']);
    shout(state, 'h-b0', ['h-5']);
    expect(requirePlayer(state, 'h-5').knockedOutUntil).toBe(-1);
  });

  test('un joueur boosté tente nettement plus de tirs', () => {
    const shotsBy = (boosted: boolean) => {
      let shots = 0;
      for (let seed = 0; seed < 30; seed++) {
        const state = createMatch({
          home: makeSheet({ clubId: 'h', isHuman: true }),
          away: makeSheet({ clubId: 'a', isHuman: true }),
          seed,
        });
        if (boosted) state.home.players[9]!.effects.push({ label: 'x', stat: 'shooting', value: 0.6, endsAt: 1000 });
        while (state.status !== 'finished') {
          if (state.awaiting) dismissEventWindow(state);
          tick(state);
        }
        shots += state.events.filter((event) => event.playerId === 'h-9' && ['goal', 'save', 'miss'].includes(event.kind)).length;
      }
      return shots;
    };
    expect(shotsBy(true)).toBeGreaterThan(shotsBy(false) * 1.3);
  });
});
