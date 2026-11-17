import { describe, expect, test } from 'bun:test';
import { avatarTraits, hashSeed } from './avatar';

const player = { id: 'player-42', age: 25, clubId: 'club-03', position: 'MID' as const };

describe('trombines des joueurs', () => {
  test('un joueur garde toujours le même visage', () => {
    expect(avatarTraits({ ...player })).toEqual(avatarTraits({ ...player }));
    expect(hashSeed('abc')).toBe(hashSeed('abc'));
  });

  test('les joueurs ne se ressemblent pas tous', () => {
    const faces = new Set(
      Array.from({ length: 200 }, (_, index) => JSON.stringify(avatarTraits({ ...player, id: `p-${index}` }))),
    );
    expect(faces.size).toBeGreaterThan(150);
  });

  test('les coéquipiers partagent le maillot, le gardien a le sien', () => {
    const mate = avatarTraits({ ...player, id: 'other' });
    expect(mate.jerseyColor).toBe(avatarTraits(player).jerseyColor);
    expect(avatarTraits({ ...player, position: 'GK' }).jerseyColor).not.toBe(mate.jerseyColor);
  });

  test('les vétérans peuvent grisonner, jamais les jeunes', () => {
    const young = Array.from({ length: 100 }, (_, index) => avatarTraits({ ...player, id: `y-${index}`, age: 20 }));
    const old = Array.from({ length: 100 }, (_, index) => avatarTraits({ ...player, id: `y-${index}`, age: 36 }));
    expect(young.some((traits) => traits.hairColor === '#b9b6ad')).toBe(false);
    expect(old.some((traits) => traits.hairColor === '#b9b6ad')).toBe(true);
  });
});
