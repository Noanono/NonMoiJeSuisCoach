/**
 * Ligues de l'hôte pair-à-pair, rangées dans le navigateur (IndexedDB : une ligue pèse ~500 Ko, trop pour
 * le localStorage à trois). Avec chaque ligue, le secret de son code de serveur : la rouvrir garde le même code.
 */
import type { HubSnapshot } from '../../server/hub';
import type { SlotStore } from '../../server/hostEngine';

const DB_NAME = 'nmjsc-ligues';
const DB_VERSION = 1;
const LEAGUES = 'ligues';
const TRASH = 'corbeille';
const CODES = 'codes';

interface StoredLeague {
  snapshot: HubSnapshot;
  savedAt: number;
}

let opening: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of [LEAGUES, TRASH, CODES]) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      opening = null;
      reject(request.error ?? new Error('Stockage du navigateur indisponible.'));
    };
  });
  return opening;
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Écriture impossible.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Écriture annulée (stockage plein ?).'));
  });
}

async function get<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error ?? new Error('Lecture impossible.'));
  });
}

async function put(store: string, key: IDBValidKey, value: unknown): Promise<void> {
  const db = await database();
  const transaction = db.transaction(store, 'readwrite');
  transaction.objectStore(store).put(value, key);
  return done(transaction);
}

export const idbSlotStore: SlotStore = {
  async read(slot) {
    return (await get<StoredLeague>(LEAGUES, slot))?.snapshot ?? null;
  },
  async write(slot, snapshot) {
    // Copie structurée par IndexedDB : la ligue en mémoire peut continuer à changer.
    await put(LEAGUES, slot, { snapshot, savedAt: Date.now() } satisfies StoredLeague);
  },
  async trash(slot) {
    const db = await database();
    const transaction = db.transaction([LEAGUES, TRASH, CODES], 'readwrite');
    const leagues = transaction.objectStore(LEAGUES);
    const request = leagues.get(slot);
    request.onsuccess = () => {
      if (request.result) transaction.objectStore(TRASH).put(request.result, `ligue-${slot}-${new Date().toISOString()}`);
      leagues.delete(slot);
      transaction.objectStore(CODES).delete(slot);
    };
    return done(transaction);
  },
  async savedAt(slot) {
    return (await get<StoredLeague>(LEAGUES, slot))?.savedAt ?? null;
  },
};

/** Secret du code de serveur de cet emplacement. */
export async function readSlotSecret(slot: number): Promise<string | null> {
  return (await get<string>(CODES, slot)) ?? null;
}

export async function writeSlotSecret(slot: number, secret: string): Promise<void> {
  await put(CODES, slot, secret);
}
