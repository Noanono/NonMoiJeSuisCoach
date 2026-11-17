import { describe, expect, test } from 'bun:test';
import type { Ability, Effect } from '../types';
import { recordGoal } from './actions';
import { aiTakeTurn } from './ai';
import { makeSheet } from './fixtures';
import { beginRun, createMatch, endRun, requirePlayer } from './state';
import type { MatchState } from './types';

function def(id: string, effects: Effect[], extra: Partial<Ability> = {}): Ability {
  return { id, name: id, rarity: 'common', category: 'support', position: 'ANY', targeting: { kind: 'self' }, trigger: 'anytime', description: '', hidden: false, effects, ...extra };
}

/** L'IA joue à domicile avec ces capacités ; en face, un coach humain qui ne fait rien. */
function match(abilities: Record<number, Ability>, bench: Ability[] = []): MatchState {
  const all = new Map([...Object.values(abilities), ...bench].map((ability) => [ability.id, ability]));
  const ids = Object.fromEntries(Object.entries(abilities).map(([slot, ability]) => [slot, ability.id]));
  const state = createMatch({
    home: makeSheet({ clubId: 'h', abilities: ids, benchAbilities: bench.map((ability) => ability.id) }),
    away: makeSheet({ clubId: 'a', isHuman: true }),
    seed: 5,
    lookupAbility: (id) => all.get(id)!,
  });
  state.home.gauge = 6;
  return state;
}

function turns(state: MatchState, count: number): void {
  for (let turn = 0; turn < count; turn++) {
    const run = beginRun(state);
    aiTakeTurn(run, 'home');
    endRun(run);
  }
}

describe('IA de match plus réfléchie (MATCH-07)', () => {
  test('elle relève tout de suite un coéquipier au sol', () => {
    const sponge = def('eponge', [{ type: 'revive', scope: 'targets' }], { targeting: { kind: 'teammate', count: 1, downed: true } });
    const state = match({ 5: sponge });
    requirePlayer(state, 'h-9').knockedOutUntil = state.elapsed + 20;
    turns(state, 1);
    expect(state.activations.map((activation) => activation.abilityId)).toEqual(['eponge']);
    expect(requirePlayer(state, 'h-9').knockedOutUntil).toBeLessThan(state.elapsed);
  });

  test('un malus d’arrêts vise le gardien, pas le meilleur joueur de champ', () => {
    const taunt = def('chambreur', [{ type: 'modifier', scope: 'targets', stat: 'goalkeeping', value: -0.8, duration: 20 }], { category: 'sabotage', targeting: { kind: 'opponent', count: 1 } });
    const state = match({ 9: taunt });
    turns(state, 3);
    expect(state.activations[0]?.targetIds).toEqual(['a-0']);
  });

  test('elle ne lance pas un bonus de 30 minutes à deux minutes de la fin quand elle mène', () => {
    const long = def('long', [{ type: 'modifier', scope: 'team', stat: 'defense', value: 0.5, duration: 30 }], { category: 'attack', targeting: { kind: 'team' } });
    const state = match({ 5: long });
    const run = beginRun(state);
    recordGoal(run, 'home', state.home.players[9]!);
    endRun(run);
    state.awaiting = null;
    state.minute = 91;
    turns(state, 1);
    expect(state.activations).toHaveLength(0);
  });

  test('menée en fin de match, elle fait entrer un attaquant à la place d’un défenseur', () => {
    const state = match({}, [def('remplacant', [])]);
    const run = beginRun(state);
    recordGoal(run, 'away', state.away.players[9]!);
    endRun(run);
    state.awaiting = null;
    state.minute = 70;
    // Un attaquant sur le banc.
    const entering = state.home.players.find((player) => player.line === null)!;
    entering.profile = { ...entering.profile, position: 'ATT' };
    turns(state, 1);
    expect(state.home.players.filter((player) => player.line === 'ATT')).toHaveLength(3);
    expect(entering.line).toBe('ATT');
  });
});
