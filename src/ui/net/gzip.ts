/**
 * Compression gzip native du navigateur (`CompressionStream`). Une partie pèse ~500 Ko en JSON, ~75 Ko
 * compressée : on s'en sert pour la sauvegarde dans le compte CrazyGames (PLAT-03) et pour la partie
 * entière envoyée à un coach qui se connecte (MULTI-11).
 */

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function gzipText(text: string): Promise<Uint8Array> {
  return pipe(new TextEncoder().encode(text), new CompressionStream('gzip'));
}

export async function gunzipText(bytes: Uint8Array): Promise<string> {
  return new TextDecoder().decode(await pipe(bytes, new DecompressionStream('gzip')));
}

/** Le navigateur sait décompresser (tous les récents ; on le vérifie avant de demander des envois compressés). */
export const canGunzip = typeof DecompressionStream === 'function';

/** En dessous, un message de la ligue part en clair : la compression ne vaut pas le coût (différences, salle d'attente). */
export const PACK_FROM_LENGTH = 16 * 1024;

/** Message de l'hôte pour un coach : compressé s'il est gros et que le coach sait le relire. */
export async function packMessage(payload: string, gzip: boolean): Promise<string | Uint8Array> {
  return gzip && payload.length >= PACK_FROM_LENGTH ? gzipText(payload) : payload;
}

/** Message reçu de l'hôte : en clair, ou compressé (octets) ; `null` s'il est illisible. */
export async function unpackMessage(data: unknown): Promise<string | null> {
  if (typeof data === 'string') return data;
  const bytes = data instanceof Uint8Array ? data : data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : null;
  if (!bytes) return null;
  try {
    return await gunzipText(bytes);
  } catch {
    return null;
  }
}
