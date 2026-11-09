/**
 * Emplacements de sauvegarde locaux (TECH-03, TECH-04) : trois emplacements, JSON versionné,
 * stockage injecté (`localStorage` en jeu, une simple Map en test).
 * Une sauvegarde abîmée ne casse jamais la liste : elle y apparaît en erreur.
 */

export type SaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const SAVE_SLOTS = [1, 2, 3] as const;
export type SaveSlot = (typeof SAVE_SLOTS)[number];

/** Version courante du format ; à incrémenter quand l'état sauvegardé change de forme. */
export const SAVE_FORMAT_VERSION = 1;
const SAVE_FORMAT = 'non-moi-je-suis-coach';
const DEFAULT_KEY_PREFIX = 'nmjsc:save:';

/** Navigateurs : Chrome et Safari lèvent QuotaExceededError, Firefox NS_ERROR_DOM_QUOTA_REACHED. */
const QUOTA_ERROR_NAMES: ReadonlySet<string> = new Set(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED']);

export interface SaveMeta {
  clubName: string;
  season: number;
  week: number;
}

export interface SavedMeta extends SaveMeta {
  /** Date de la sauvegarde, ISO 8601. */
  savedAt: string;
  version: number;
}

export type SaveErrorCode = 'invalidSlot' | 'emptySlot' | 'corrupted' | 'unknownVersion' | 'quotaExceeded' | 'storageUnavailable';

export class SaveError extends Error {
  readonly code: SaveErrorCode;

  constructor(code: SaveErrorCode, message: string) {
    super(message);
    this.name = 'SaveError';
    this.code = code;
  }
}

export type SlotSummary =
  | { slot: SaveSlot; status: 'empty' }
  | { slot: SaveSlot; status: 'ok'; meta: SavedMeta }
  | { slot: SaveSlot; status: 'error'; error: SaveError };

export interface SaveStoreOptions<T> {
  /** Préfixe des clés de stockage. */
  keyPrefix?: string;
  /** Version écrite et seule version acceptée au chargement. */
  version?: number;
  now?: () => Date;
  /** Vérifie la forme des données chargées ; une donnée refusée est traitée comme corrompue. */
  validate?: (data: unknown) => data is T;
}

export interface SaveStore<T> {
  list(): SlotSummary[];
  /** Écrit la partie dans l'emplacement ; en cas d'échec, l'ancienne sauvegarde reste intacte. */
  save(slot: SaveSlot, data: T, meta: SaveMeta): SavedMeta;
  load(slot: SaveSlot): T;
  remove(slot: SaveSlot): void;
}

interface SaveEnvelope<T> {
  format: typeof SAVE_FORMAT;
  meta: SavedMeta;
  data: T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSavedMeta(value: unknown): value is SavedMeta {
  return (
    isRecord(value) &&
    typeof value.clubName === 'string' &&
    typeof value.season === 'number' &&
    typeof value.week === 'number' &&
    typeof value.savedAt === 'string' &&
    typeof value.version === 'number'
  );
}

function isQuotaError(error: unknown): boolean {
  return isRecord(error) && typeof error.name === 'string' && QUOTA_ERROR_NAMES.has(error.name);
}

function assertSlot(slot: number): asserts slot is SaveSlot {
  if (!(SAVE_SLOTS as readonly number[]).includes(slot)) {
    throw new SaveError('invalidSlot', `Emplacement ${slot} inexistant : choisis l'emplacement 1, 2 ou 3.`);
  }
}

export function createSaveStore<T>(storage: SaveStorage, options: SaveStoreOptions<T> = {}): SaveStore<T> {
  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const version = options.version ?? SAVE_FORMAT_VERSION;
  const now = options.now ?? (() => new Date());
  const keyOf = (slot: SaveSlot) => `${keyPrefix}${slot}`;

  function readRaw(slot: SaveSlot): string | null {
    try {
      return storage.getItem(keyOf(slot));
    } catch {
      throw new SaveError('storageUnavailable', 'Le stockage local est inaccessible (navigation privée ou stockage désactivé ?).');
    }
  }

  function parseEnvelope(slot: SaveSlot, raw: string): SaveEnvelope<T> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new SaveError('corrupted', `La sauvegarde ${slot} est illisible : elle a été abîmée.`);
    }
    if (!isRecord(parsed) || parsed.format !== SAVE_FORMAT || !isSavedMeta(parsed.meta)) {
      throw new SaveError('corrupted', `La sauvegarde ${slot} n'est pas une partie de Non, moi je suis coach.`);
    }
    if (parsed.meta.version !== version) {
      throw new SaveError(
        'unknownVersion',
        `La sauvegarde ${slot} vient d'une autre version du jeu (format ${parsed.meta.version}, attendu ${version}).`,
      );
    }
    if (options.validate && !options.validate(parsed.data)) {
      throw new SaveError('corrupted', `La sauvegarde ${slot} est incomplète : ses données sont abîmées.`);
    }
    return parsed as unknown as SaveEnvelope<T>;
  }

  function summarize(slot: SaveSlot): SlotSummary {
    try {
      const raw = readRaw(slot);
      if (raw === null) return { slot, status: 'empty' };
      return { slot, status: 'ok', meta: parseEnvelope(slot, raw).meta };
    } catch (error) {
      if (error instanceof SaveError) return { slot, status: 'error', error };
      throw error;
    }
  }

  return {
    list: () => SAVE_SLOTS.map(summarize),

    save(slot, data, meta) {
      assertSlot(slot);
      const savedMeta: SavedMeta = { ...meta, savedAt: now().toISOString(), version };
      const envelope: SaveEnvelope<T> = { format: SAVE_FORMAT, meta: savedMeta, data };
      try {
        storage.setItem(keyOf(slot), JSON.stringify(envelope));
      } catch (error) {
        if (isQuotaError(error)) {
          throw new SaveError('quotaExceeded', "Plus de place pour sauvegarder : supprime une ancienne partie et réessaie.");
        }
        throw new SaveError('storageUnavailable', "Impossible d'écrire la sauvegarde dans le stockage local.");
      }
      return savedMeta;
    },

    load(slot) {
      assertSlot(slot);
      const raw = readRaw(slot);
      if (raw === null) throw new SaveError('emptySlot', `L'emplacement ${slot} est vide.`);
      return parseEnvelope(slot, raw).data;
    },

    remove(slot) {
      assertSlot(slot);
      try {
        storage.removeItem(keyOf(slot));
      } catch {
        throw new SaveError('storageUnavailable', `Impossible de supprimer la sauvegarde ${slot}.`);
      }
    },
  };
}
