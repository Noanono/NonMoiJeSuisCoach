import { describe, expect, test } from 'bun:test';
import { createSaveStore, SaveError, type SaveSlot, type SaveStorage } from './saveSlots';

interface GameState {
  week: number;
  budget: number;
}

function memoryStorage(): SaveStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

const isGameState = (data: unknown): data is GameState =>
  typeof data === 'object' && data !== null && typeof (data as GameState).week === 'number';

const meta = { clubName: 'AS Saint-Pastis', season: 2, week: 7 };
const fixedDate = () => new Date('2026-11-09T20:00:00Z');

function saveErrorCode(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof SaveError ? error.code : 'not-a-save-error';
  }
  return undefined;
}

describe('emplacements de sauvegarde (TECH-03, TECH-04)', () => {
  test('aller-retour sauvegarde, liste, chargement et suppression', () => {
    const store = createSaveStore<GameState>(memoryStorage(), { now: fixedDate, validate: isGameState });
    expect(store.list().map((summary) => summary.status)).toEqual(['empty', 'empty', 'empty']);

    store.save(2, { week: 7, budget: 1_500 }, meta);
    const [first, second] = store.list();
    expect(first?.status).toBe('empty');
    expect(second).toEqual({ slot: 2, status: 'ok', meta: { ...meta, savedAt: '2026-11-09T20:00:00.000Z', version: 1 } });
    expect(store.load(2)).toEqual({ week: 7, budget: 1_500 });

    store.remove(2);
    expect(store.list()[1]?.status).toBe('empty');
    expect(saveErrorCode(() => store.load(2))).toBe('emptySlot');
  });

  test('une sauvegarde corrompue renvoie une erreur claire sans casser la liste', () => {
    const storage = memoryStorage();
    const store = createSaveStore<GameState>(storage, { validate: isGameState });
    store.save(1, { week: 1, budget: 0 }, meta);
    storage.items.set('nmjsc:save:2', '{"format": "non-moi-je-suis-coach", "meta": ');
    storage.items.set('nmjsc:save:3', JSON.stringify({ format: 'non-moi-je-suis-coach', meta: { ...meta, savedAt: 'x', version: 1 }, data: 'nope' }));

    const summaries = store.list();
    expect(summaries[0]?.status).toBe('ok');
    expect(summaries[1]?.status).toBe('error');
    expect(summaries[2]?.status).toBe('error');
    expect(saveErrorCode(() => store.load(2))).toBe('corrupted');
    expect(saveErrorCode(() => store.load(3))).toBe('corrupted');
  });

  test('une version inconnue est signalée', () => {
    const storage = memoryStorage();
    createSaveStore<GameState>(storage, { version: 2 }).save(1, { week: 1, budget: 0 }, meta);
    const summary = createSaveStore<GameState>(storage).list()[0];
    expect(summary?.status === 'error' && summary.error.code).toBe('unknownVersion');
  });

  test('quota plein : erreur claire et ancienne sauvegarde intacte', () => {
    const storage = memoryStorage();
    const store = createSaveStore<GameState>(storage);
    store.save(1, { week: 1, budget: 0 }, meta);
    storage.setItem = () => {
      throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    };
    expect(saveErrorCode(() => store.save(1, { week: 2, budget: 10 }, meta))).toBe('quotaExceeded');
    expect(store.load(1)).toEqual({ week: 1, budget: 0 });
  });

  test('un emplacement hors 1 à 3 est refusé', () => {
    const store = createSaveStore<GameState>(memoryStorage());
    expect(saveErrorCode(() => store.load(4 as SaveSlot))).toBe('invalidSlot');
  });
});
