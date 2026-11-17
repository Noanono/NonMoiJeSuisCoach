import { describe, expect, test } from 'bun:test';
import { newGame } from '../domain/game';
import { applyPatch, diffParts, partsToJson, toParts, type GamePatch } from './patch';

const roundTrip = <T extends object>(before: T, after: T): { result: T; size: number } => {
  const message = diffParts(toParts(before as Record<string, unknown>), toParts(after as Record<string, unknown>));
  if (message === null) return { result: before, size: 0 };
  return { result: applyPatch(before, JSON.parse(message) as GamePatch), size: message.length };
};

describe('envoi partiel de la partie (C8)', () => {
  test('la partie reconstruite est identique à celle du serveur', () => {
    const before = newGame({ seed: 70 });
    const after = JSON.parse(JSON.stringify(before)) as typeof before;
    const someone = Object.keys(after.players)[3]!;
    after.players[someone]!.fatigue = 77;
    after.week += 1;
    after.news = ['Nouvelle'];
    after.fixtures[5]!.result = { homeGoals: 2, awayGoals: 1, scorers: [] };
    after.fixtures.push({ ...after.fixtures[0]!, id: 'nouveau' });
    delete after.players[Object.keys(after.players)[0]!];
    const { result, size } = roundTrip(before, after);
    expect(result).toEqual(after);
    // Bien plus léger que la partie entière.
    expect(size).toBeLessThan(JSON.stringify(after).length / 20);
  });

  test('les morceaux inchangés gardent leur identité, rien n’est envoyé si rien ne change', () => {
    const before = newGame({ seed: 71 });
    const after = JSON.parse(JSON.stringify(before)) as typeof before;
    const id = Object.keys(after.players)[0]!;
    after.players[id]!.fatigue = 50;
    const { result } = roundTrip(before, after);
    const other = Object.keys(after.players)[1]!;
    expect(result.players[other]).toBe(before.players[other]);
    expect(result.clubs).toBe(before.clubs);
    expect(diffParts(toParts(after as never), toParts(JSON.parse(JSON.stringify(after)) as never))).toBeNull();
  });

  test('une petite collection qui grandit est découpée, puis rétrécit sans rester périmée', () => {
    const small = { list: [1, 2], other: 'a' };
    const big = { list: Array.from({ length: 20 }, (_, index) => index), other: 'a' };
    expect(roundTrip(small, big).result).toEqual(big);
    expect(roundTrip(big, small).result).toEqual(small);
    const shorter = { list: Array.from({ length: 17 }, (_, index) => index * 2), other: 'b' };
    expect(roundTrip(big, shorter).result).toEqual(shorter);
  });

  test('le premier envoi recompose la partie entière à partir des morceaux', () => {
    const game = newGame({ seed: 72 });
    expect(JSON.parse(partsToJson(toParts(game as never)))).toEqual(JSON.parse(JSON.stringify(game)));
  });
});
