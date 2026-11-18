import { describe, expect, test } from 'bun:test';
import type { SaveStorage } from '../../domain/save/saveSlots';
import { createCloudStorage, decodeValue, encodeValue } from './cloudStorage';

function memory(initial: Record<string, string> = {}): SaveStorage & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

const bigSave = JSON.stringify({ players: Array.from({ length: 2_000 }, (_, index) => ({ id: index, name: 'Raymond', note: 54 })) });

describe('stockage dans le compte CrazyGames (PLAT-03)', () => {
  test('une grosse partie est compressée bien sous la limite de 1 Mo, et relue à l’identique', async () => {
    const encoded = await encodeValue(bigSave);
    expect(encoded.startsWith('gz1:')).toBe(true);
    expect(encoded.length).toBeLessThan(bigSave.length / 5);
    expect(await decodeValue(encoded)).toBe(bigSave);
  });

  test('une petite valeur (identité du coach) reste en clair', async () => {
    expect(await encodeValue('coach-abc')).toBe('coach-abc');
    expect(await decodeValue('coach-abc')).toBe('coach-abc');
  });

  test('lecture synchrone après démarrage, écriture compressée envoyée au SDK', async () => {
    const remote = memory({ nmjsc1: await encodeValue(bigSave) });
    const storage = await createCloudStorage(remote, { keys: ['nmjsc1', 'nmjsc2'] });
    expect(storage.getItem('nmjsc1')).toBe(bigSave);
    expect(storage.getItem('nmjsc2')).toBeNull();

    storage.setItem('nmjsc2', bigSave);
    expect(storage.getItem('nmjsc2')).toBe(bigSave);
    await storage.flush();
    expect(await decodeValue(remote.items.get('nmjsc2')!)).toBe(bigSave);

    storage.removeItem('nmjsc1');
    await storage.flush();
    expect(remote.items.has('nmjsc1')).toBe(false);
  });

  test('la dernière écriture gagne, même si les compressions se chevauchent', async () => {
    const remote = memory();
    const storage = await createCloudStorage(remote, { keys: ['nmjsc1'] });
    storage.setItem('nmjsc1', bigSave);
    storage.setItem('nmjsc1', 'petite');
    await storage.flush();
    expect(remote.items.get('nmjsc1')).toBe('petite');
  });

  test('les anciennes sauvegardes du navigateur sont recopiées dans un compte vide, pas par-dessus', async () => {
    const remote = memory({ nmjsc2: 'du compte' });
    const legacy = memory({ nmjsc1: bigSave, nmjsc2: 'du navigateur' });
    const storage = await createCloudStorage(remote, { keys: ['nmjsc1', 'nmjsc2'], legacy });
    await storage.flush();
    expect(storage.getItem('nmjsc1')).toBe(bigSave);
    expect(storage.getItem('nmjsc2')).toBe('du compte');
    expect(remote.items.has('nmjsc1')).toBe(true);
  });

  test('une écriture refusée par le SDK est signalée', async () => {
    const errors: string[] = [];
    const remote = memory();
    remote.setItem = () => {
      throw { code: 'dataLimitExcedeed', message: 'Game data cannot exceed 1048576 bytes' };
    };
    const storage = await createCloudStorage(remote, { keys: [], onError: (message) => errors.push(message) });
    storage.setItem('nmjsc1', 'x');
    await storage.flush();
    expect(errors).toEqual(['Game data cannot exceed 1048576 bytes']);
  });
});
