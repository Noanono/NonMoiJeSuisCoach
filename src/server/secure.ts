/**
 * Hasard et empreintes cryptographiques, communs au navigateur et à Node. Jamais `Math.random` pour
 * ce qui protège l'accès à une ligue (codes de serveur, secrets des coachs, codes de reprise).
 */

/** Octets aléatoires sûrs (`crypto.getRandomValues` existe aussi en http, contrairement à `randomUUID`). */
export function randomBytes(count: number): Uint8Array {
  const bytes = new Uint8Array(count);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function randomHex(byteCount: number): string {
  return toHex(randomBytes(byteCount));
}

/** Entier sûr dans [min, max]. */
export function randomInt(min: number, max: number): number {
  const span = max - min + 1;
  const [value] = new Uint32Array(randomBytes(4).buffer);
  return min + (value! % span);
}

/** Empreinte SHA-256 en hexadécimal. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(new Uint8Array(digest));
}

/** Comparaison à temps constant : la durée ne trahit pas à partir de quel caractère deux empreintes diffèrent. */
export function sameDigest(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}
