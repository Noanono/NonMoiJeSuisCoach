import { describe, expect, test } from 'bun:test';
import type { Ability, Effect } from '../types';
import { recordGoal } from './actions';
import { confirmActivation, previewActivation, selectTarget, startActivation } from './activation';
import { makeSheet } from './fixtures';
import { tick } from './simulation';
import { beginRun, createMatch, endRun, requirePlayer } from './state';
import { summarize } from './summary';
import type { MatchState } from './types';
import { dismissEventWindow } from './windows';

/** Capacité de test : n'importe quel effet, sans passer par le catalogue. */
function def(id: string, effects: Effect[], extra: Partial<Ability> = {}): Ability {
  return {
    id,
    name: id,
    rarity: 'common',
    category: 'support',
    position: 'ANY',
    targeting: { kind: 'self' },
    trigger: 'anytime',
    description: '',
    hidden: false,
    effects,
    ...extra,
  };
}

/** Match humain contre humain : `home[slot]` et `away[slot]` portent les capacités données. */
function match(home: Record<number, Ability>, away: Record<number, Ability> = {}): MatchState {
  const all = new Map([...Object.values(home), ...Object.values(away)].map((ability) => [ability.id, ability]));
  const ids = (entries: Record<number, Ability>) => Object.fromEntries(Object.entries(entries).map(([slot, ability]) => [slot, ability.id]));
  const state = createMatch({
    home: makeSheet({ clubId: 'h', isHuman: true, abilities: ids(home) }),
    away: makeSheet({ clubId: 'a', isHuman: true, abilities: ids(away) }),
    seed: 3,
    lookupAbility: (id) => {
      const found = all.get(id);
      if (!found) throw new Error(id);
      return found;
    },
  });
  state.home.gauge = 10;
  state.away.gauge = 10;
  return state;
}

function shout(state: MatchState, side: 'home' | 'away', playerId: string, targets: string[] = []): void {
  startActivation(state, side, playerId);
  for (const target of targets) selectTarget(state, target);
  confirmActivation(state);
}

function play(state: MatchState, minutes: number): void {
  const until = state.elapsed + minutes;
  for (let i = 0; i < 400 && state.elapsed < until && state.status !== 'finished'; i++) {
    if (state.awaiting) dismissEventWindow(state);
    tick(state);
  }
}

describe('nouvelles mécaniques de capacités', () => {
  test('M1 Marquage : le malus tient tant que le marqueur est debout, et tombe s’il est mis au sol', () => {
    const marking = def('marquage', [{ type: 'mark', stat: 'shooting', value: -0.6, duration: 30 }], { targeting: { kind: 'opponent', count: 1 } });
    const state = match({ 2: marking });
    shout(state, 'home', 'h-2', ['a-9']);
    const target = requirePlayer(state, 'a-9');
    expect(target.effects.some((effect) => effect.markerId === 'h-2' && effect.value === -0.6)).toBe(true);
    play(state, 3);
    expect(target.effects.some((effect) => effect.markerId === 'h-2')).toBe(true);
    requirePlayer(state, 'h-2').knockedOutUntil = state.elapsed + 10;
    play(state, 1);
    expect(target.effects.some((effect) => effect.markerId === 'h-2')).toBe(false);
  });

  test('M4 Pari : gagné, l’effet ; perdu, la contrepartie (carton pour le porteur)', () => {
    const sure = def('pari-sur', [{ type: 'gamble', chance: 1, success: [{ type: 'gauge', value: 2 }], failure: [{ type: 'bookSelf', card: 'yellow' }] }]);
    const lost = def('pari-perdu', [{ type: 'gamble', chance: 0, success: [{ type: 'gauge', value: 2 }], failure: [{ type: 'bookSelf', card: 'yellow' }] }]);
    const state = match({ 5: sure, 6: lost });
    shout(state, 'home', 'h-5');
    expect(state.home.gauge).toBe(10 - 2 + 2);
    shout(state, 'home', 'h-6');
    expect(requirePlayer(state, 'h-6').yellowCards).toBe(1);
  });

  test('M5 Chrono : minutes mortes sans occasion, temps additionnel en plus, buts récents effacés', () => {
    const lace = def('lacet', [{ type: 'deadMinutes', duration: 10 }]);
    const doctor = def('medecin', [{ type: 'addedTime', minutes: 4 }]);
    const machine = def('machine', [{ type: 'rewind', minutes: 15 }]);
    const state = match({ 5: lace, 6: doctor, 7: machine });
    shout(state, 'home', 'h-5');
    const shotsBefore = state.events.filter((event) => ['goal', 'save', 'miss'].includes(event.kind)).length;
    play(state, 10);
    expect(state.events.filter((event) => ['goal', 'save', 'miss'].includes(event.kind)).length).toBe(shotsBefore);
    shout(state, 'home', 'h-6');
    expect(state.bonusStoppage).toBe(4);
    const run = beginRun(state);
    recordGoal(run, 'away', requirePlayer(state, 'a-9'));
    recordGoal(run, 'home', requirePlayer(state, 'h-9'));
    endRun(run);
    if (state.awaiting) dismissEventWindow(state);
    shout(state, 'home', 'h-7');
    expect([state.home.goals, state.away.goals]).toEqual([0, 0]);
  });

  test('M7 Bouclier : seul le joueur protégé échappe à la capacité adverse, les autres la subissent', () => {
    const wall = def('mur', [{ type: 'shield', scope: 'targets', charges: 1, duration: 30 }], { targeting: { kind: 'teammate', count: 1 } });
    const taunt = def(
      'chambreur',
      [
        { type: 'modifier', scope: 'targets', stat: 'all', value: -0.5, duration: 20 },
        { type: 'modifier', scope: 'targets', stat: 'shooting', value: -0.3, duration: 20 },
      ],
      { targeting: { kind: 'opponent', count: 2 } },
    );
    const tackle = def('tacle', [{ type: 'knockout', scope: 'targets', duration: 20 }], { targeting: { kind: 'opponent', count: 1 } });
    const state = match({ 4: wall }, { 5: taunt, 3: tackle });
    shout(state, 'home', 'h-4', ['h-9']);
    shout(state, 'away', 'a-5', ['h-9', 'h-10']);
    // Les deux effets de la même capacité sont annulés sur le joueur protégé, pour une seule charge.
    expect(requirePlayer(state, 'h-9').effects.some((effect) => effect.label === 'chambreur')).toBe(false);
    expect(requirePlayer(state, 'h-10').effects.filter((effect) => effect.label === 'chambreur').length).toBe(2);
    expect(state.away.gauge).toBe(8);
    expect(requirePlayer(state, 'h-9').shield?.charges).toBe(0);
    // Plus de charge : la capacité suivante passe.
    shout(state, 'away', 'a-3', ['h-9']);
    expect(requirePlayer(state, 'h-9').knockedOutUntil).toBeGreaterThan(state.elapsed);
  });

  test('M9 Copie : rejoue pour soi la dernière capacité de l’adversaire', () => {
    const copier = def('copieur', [{ type: 'copyLast' }]);
    const chant = def('chant', [{ type: 'modifier', scope: 'team', stat: 'all', value: 0.3, duration: 20 }], { targeting: { kind: 'team' } });
    const state = match({ 5: copier }, { 5: chant });
    expect(previewActivation(state, 'home', 'h-5').available).toBe(false);
    shout(state, 'away', 'a-5');
    shout(state, 'home', 'h-5');
    expect(requirePlayer(state, 'h-9').effects.some((effect) => effect.label.includes('chant') && effect.value === 0.3)).toBe(true);
  });

  test('M9 Copie : rend la différence de Gueulante si la capacité copiée coûtait moins cher', () => {
    const copier = def('copieur', [{ type: 'copyLast' }], { cost: 3 });
    const chant = def('chant', [{ type: 'modifier', scope: 'team', stat: 'all', value: 0.3, duration: 20 }], { targeting: { kind: 'team' }, cost: 1 });
    const state = match({ 5: copier }, { 5: chant });
    shout(state, 'away', 'a-5');
    const before = state.home.gauge;
    shout(state, 'home', 'h-5');
    expect(state.home.gauge).toBe(before - 3 + 2);
  });

  test('M11 Énergie : fatigue imposée le temps du match, rendue après', () => {
    const roller = def('rouleau', [{ type: 'drain', scope: 'targets', value: 25 }], { targeting: { kind: 'opponent', count: 1 } });
    const state = match({ 3: roller });
    const before = requirePlayer(state, 'a-9').profile.fatigue;
    shout(state, 'home', 'h-3', ['a-9']);
    expect(requirePlayer(state, 'a-9').profile.fatigue).toBe(before + 25);
    const report = summarize(state).players.find((entry) => entry.playerId === 'a-9')!;
    expect(report.fatigue).toBe(before);
  });

  test('M12 Conditions : disponible seulement quand on est mené, plus fort par but de retard', () => {
    const remontada = def(
      'remontada',
      [{ type: 'scaledModifier', scope: 'team', stat: 'all', base: 0, perUnit: 0.45, per: 'goalDeficit', duration: 20 }],
      { targeting: { kind: 'team' }, condition: { score: 'behind' } },
    );
    const state = match({ 9: remontada });
    expect(previewActivation(state, 'home', 'h-9').reason).toContain('mené');
    const run = beginRun(state);
    recordGoal(run, 'away', requirePlayer(state, 'a-9'));
    recordGoal(run, 'away', requirePlayer(state, 'a-10'));
    endRun(run);
    if (state.awaiting) dismissEventWindow(state);
    shout(state, 'home', 'h-9');
    expect(requirePlayer(state, 'h-5').effects.find((effect) => effect.label === 'remontada')?.value).toBeCloseTo(0.9);
  });

  test('M13 Surcharge : vide la jauge restante, effet par point dépensé', () => {
    const tifo = def('tifo', [{ type: 'overcharge', scope: 'team', stat: 'all', perPoint: 0.15, duration: 25 }], { targeting: { kind: 'team' } });
    const state = match({ 5: tifo });
    state.home.gauge = 9;
    shout(state, 'home', 'h-5');
    expect(state.home.gauge).toBe(0);
    expect(requirePlayer(state, 'h-2').effects.find((effect) => effect.label === 'tifo')?.value).toBeCloseTo(0.15 * 9);
  });

  test('Soins : retirer les malus d’un seul joueur, ou de l’équipe avec un bonus par malus retiré', () => {
    const spray = def('spray', [{ type: 'clearMaluses', bonusGauge: 0, threshold: 0, scope: 'targets' }], { targeting: { kind: 'teammate', count: 1 } });
    const bottle = def('bouteille', [{ type: 'clearMaluses', bonusGauge: 0, threshold: 0, perMalus: 0.05, perMalusDuration: 15 }], { targeting: { kind: 'team' } });
    const state = match({ 3: spray, 5: bottle });
    for (const id of ['h-7', 'h-8', 'h-9']) requirePlayer(state, id).effects.push({ label: 'sort', stat: 'all', value: -0.3, endsAt: state.elapsed + 20 });
    shout(state, 'home', 'h-3', ['h-9']);
    expect(requirePlayer(state, 'h-9').effects.some((effect) => effect.value < 0)).toBe(false);
    expect(requirePlayer(state, 'h-8').effects.some((effect) => effect.value < 0)).toBe(true);
    const gauge = state.home.gauge;
    shout(state, 'home', 'h-5');
    expect(state.home.gauge).toBe(gauge - 2);
    expect(requirePlayer(state, 'h-8').effects.some((effect) => effect.value < 0)).toBe(false);
    expect(requirePlayer(state, 'h-2').effects.find((effect) => effect.label === 'bouteille')?.value).toBeCloseTo(0.1);
  });

  test('Soins : un pari raté laisse le joueur au sol plus longtemps', () => {
    const quack = def('kine', [{ type: 'gamble', chance: 0, success: [{ type: 'revive', scope: 'targets' }], failure: [{ type: 'prolongDown', scope: 'targets', minutes: 5 }] }], {
      targeting: { kind: 'teammate', count: 1, downed: true },
    });
    const state = match({ 3: quack });
    const victim = requirePlayer(state, 'h-9');
    victim.knockedOutUntil = state.elapsed + 10;
    shout(state, 'home', 'h-3', ['h-9']);
    expect(victim.knockedOutUntil).toBe(state.elapsed + 15);
  });

  test('Soins : un joueur indéboulonnable ne peut pas être mis au sol', () => {
    const remedy = def('remede', [{ type: 'steady', scope: 'team', duration: 15 }], { targeting: { kind: 'team' } });
    const tackle = def('tacle', [{ type: 'knockout', scope: 'targets', duration: 20 }], { targeting: { kind: 'opponent', count: 1 } });
    const state = match({ 5: remedy }, { 3: tackle });
    shout(state, 'home', 'h-5');
    shout(state, 'away', 'a-3', ['h-9']);
    expect(requirePlayer(state, 'h-9').knockedOutUntil).toBeLessThan(state.elapsed);
  });

  test('Soins : le docteur relève vite les joueurs au sol et raccourcit les malus adverses', () => {
    const doctor = def('docteur', [{ type: 'fieldDoctor', reviveAfter: 2, malusFactor: 0.5 }], { targeting: { kind: 'team' } });
    const tackle = def('tacle', [{ type: 'knockout', scope: 'targets', duration: 20 }], { targeting: { kind: 'opponent', count: 1 } });
    const curse = def('sort', [{ type: 'modifier', scope: 'targets', stat: 'all', value: -0.4, duration: 20 }], { targeting: { kind: 'opponent', count: 1 } });
    const state = match({ 5: doctor }, { 3: tackle, 4: curse });
    const already = requirePlayer(state, 'h-10');
    already.knockedOutUntil = state.elapsed + 30;
    shout(state, 'home', 'h-5');
    expect(already.knockedOutUntil).toBe(state.elapsed + 2);
    shout(state, 'away', 'a-3', ['h-9']);
    expect(requirePlayer(state, 'h-9').knockedOutUntil).toBe(state.elapsed + 2);
    shout(state, 'away', 'a-4', ['h-8']);
    expect(requirePlayer(state, 'h-8').effects.find((effect) => effect.label === 'sort')?.endsAt).toBe(state.elapsed + 10);
  });

  test('Un malus de tir lancé sur un penalty adverse sert à ce penalty, avant les malus plus anciens', () => {
    const wall = def('mur', [{ type: 'opponentChanceMalus', value: 0.2, shots: 3 }]);
    const glove = def('gant', [{ type: 'opponentChanceMalus', value: 0.6, shots: 1 }]);
    const state = match({ 2: wall, 0: glove });
    shout(state, 'home', 'h-2');
    state.pendingPlay = { kind: 'penalty', side: 'away', takerId: null };
    shout(state, 'home', 'h-0');
    expect(state.home.shotMaluses.map((malus) => malus.value)).toEqual([0.6, 0.2]);
  });
});
