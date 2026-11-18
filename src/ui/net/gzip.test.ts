import { describe, expect, test } from 'bun:test';
import { packMessage, PACK_FROM_LENGTH, unpackMessage } from './gzip';
import { retryDelay } from './p2p';

const fullGame = JSON.stringify({
  type: 'game',
  game: { players: Array.from({ length: 3_000 }, (_, index) => ({ id: index, name: `Raymond ${index % 40}`, note: 40 + (index % 50) })) },
});

describe('partie entière compressée pour un coach (MULTI-11)', () => {
  test('une grosse partie part compressée, bien plus petite, et se relit à l’identique', async () => {
    const packed = await packMessage(fullGame, true);
    expect(packed).toBeInstanceOf(Uint8Array);
    expect((packed as Uint8Array).byteLength).toBeLessThan(fullGame.length / 4);
    expect(await unpackMessage(packed)).toBe(fullGame);
    // Telle que Trystero peut la livrer : un ArrayBuffer.
    const copy = (packed as Uint8Array).slice();
    expect(await unpackMessage(copy.buffer)).toBe(fullGame);
  });

  test('petit message, ou coach qui ne sait pas décompresser : en clair', async () => {
    const patch = JSON.stringify({ type: 'gamePatch', patch: [] });
    expect(patch.length).toBeLessThan(PACK_FROM_LENGTH);
    expect(await packMessage(patch, true)).toBe(patch);
    expect(await packMessage(fullGame, false)).toBe(fullGame);
    expect(await unpackMessage(patch)).toBe(patch);
  });

  test('octets illisibles : ignorés sans planter', async () => {
    expect(await unpackMessage(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(await unpackMessage(42)).toBeNull();
  });
});

describe('reconnexion active à l’hôte', () => {
  test('délais croissants : 5 s, 15 s, puis 30 s à chaque essai', () => {
    expect([0, 1, 2, 3, 10].map(retryDelay)).toEqual([5_000, 15_000, 30_000, 30_000, 30_000]);
  });
});
