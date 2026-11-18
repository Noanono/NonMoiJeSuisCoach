/**
 * Stockage synchronisé avec le compte CrazyGames (PLAT-03). Le module « data » du SDK a l'API du localStorage
 * mais plafonne à 1 Mo par joueur : une partie solo pèse ~500 Ko en JSON, ~60 Ko compressée. On compresse donc
 * les grosses valeurs (gzip natif, `CompressionStream`), et on garde une copie en clair en mémoire pour que la
 * lecture reste synchrone (les emplacements de sauvegarde n'attendent pas).
 */
import type { SaveStorage } from '../../domain/save/saveSlots';

/** Marque d'une valeur compressée : une valeur sans elle est lue telle quelle (anciennes données, petites clés). */
const COMPRESSED_PREFIX = 'gz1:';
/** En dessous, la compression ne vaut pas le coût (identité du coach, profil). */
const COMPRESS_FROM_LENGTH = 2_048;
const BASE64_CHUNK = 0x8000;

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let start = 0; start < bytes.length; start += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + BASE64_CHUNK));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function encodeValue(value: string): Promise<string> {
  if (value.length < COMPRESS_FROM_LENGTH) return value;
  const packed = await pipe(new TextEncoder().encode(value), new CompressionStream('gzip'));
  return COMPRESSED_PREFIX + toBase64(packed);
}

export async function decodeValue(stored: string): Promise<string> {
  if (!stored.startsWith(COMPRESSED_PREFIX)) return stored;
  const bytes = await pipe(fromBase64(stored.slice(COMPRESSED_PREFIX.length)), new DecompressionStream('gzip'));
  return new TextDecoder().decode(bytes);
}

export interface CloudStorage extends SaveStorage {
  /** Attend que toutes les écritures en cours soient parties au SDK. */
  flush(): Promise<void>;
}

export interface CloudStorageOptions {
  /** Les clés que le jeu utilise : elles sont lues (et décompressées) au démarrage. */
  keys: readonly string[];
  /** Données déjà présentes ailleurs (localStorage d'avant le SDK) : recopiées si le compte n'a rien (PLAT-03). */
  legacy?: Pick<Storage, 'getItem'> | null;
  /** Écriture refusée par le SDK (limite de 1 Mo dépassée, module désactivé…). */
  onError?: (message: string) => void;
}

/** Prépare le stockage : à attendre avant le premier `getItem` (le SDK doit être initialisé). */
export async function createCloudStorage(remote: SaveStorage, options: CloudStorageOptions): Promise<CloudStorage> {
  const cache = new Map<string, string>();
  const pending = new Map<string, Promise<void>>();
  const report = (error: unknown) => options.onError?.(error instanceof Error ? error.message : (error as { message?: string })?.message ?? 'Sauvegarde dans le compte impossible.');

  /** Une écriture par clé à la fois, dans l'ordre : la dernière valeur gagne toujours. */
  function write(key: string, value: string | null): void {
    const previous = pending.get(key) ?? Promise.resolve();
    const next = previous.then(async () => {
      try {
        if (value === null) remote.removeItem(key);
        else remote.setItem(key, await encodeValue(value));
      } catch (error) {
        report(error);
      }
    });
    pending.set(key, next);
    void next.then(() => {
      if (pending.get(key) === next) pending.delete(key);
    });
  }

  for (const key of options.keys) {
    const stored = remote.getItem(key);
    if (stored !== null) {
      try {
        cache.set(key, await decodeValue(stored));
      } catch {
        // Valeur illisible : on la garde telle quelle, l'emplacement de sauvegarde la signalera comme abîmée.
        cache.set(key, stored);
      }
      continue;
    }
    const old = options.legacy?.getItem(key) ?? null;
    if (old !== null) {
      cache.set(key, old);
      write(key, old);
    }
  }

  return {
    getItem: (key) => cache.get(key) ?? null,
    setItem(key, value) {
      cache.set(key, value);
      write(key, value);
    },
    removeItem(key) {
      cache.delete(key);
      write(key, null);
    },
    async flush() {
      await Promise.all(pending.values());
    },
  };
}
