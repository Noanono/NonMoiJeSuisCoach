/**
 * Code d'un serveur pair-à-pair (MULTI-12), à partager aux amis : `K7QF-3XM2-9ZPD-4HWB.<hôte>`.
 *
 * - La première partie est un secret de 80 bits (base32 Crockford, sans lettres ambiguës) : il désigne la
 *   salle et chiffre la mise en relation (les relais publics ne peuvent ni lire ni rejoindre la salle).
 * - Après le point, l'identifiant de l'hôte (22 caractères base62), garanti par une clé cryptographique
 *   vérifiée pendant la connexion WebRTC : quelqu'un qui connaît le code ne peut pas se faire passer pour l'hôte.
 */
import { randomBytes, sha256Hex } from '../../server/secure';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SECRET_BYTES = 10;
const SECRET_LENGTH = 16;
const GROUP = 4;
const HOST_ID = /^[0-9A-Za-z]{22}$/;

export interface ServerCode {
  /** Secret de la salle, 16 caractères base32 sans tirets. */
  secret: string;
  /** Identifiant (vérifié) du navigateur hôte. */
  hostId: string;
}

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31];
  return out;
}

/** Nouveau secret de salle. */
export function newSecret(): string {
  return encodeBase32(randomBytes(SECRET_BYTES)).slice(0, SECRET_LENGTH);
}

/** Secret tapé à la main : minuscules, tirets, espaces, et les confusions O/0, I/L/1 sont tolérés. */
function normalizeSecret(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

export function formatCode(code: ServerCode): string {
  const groups = code.secret.match(new RegExp(`.{1,${GROUP}}`, 'g')) ?? [];
  return `${groups.join('-')}.${code.hostId}`;
}

/** Lit un code collé ou tapé ; `null` s'il n'est pas valable. */
export function parseCode(raw: string): ServerCode | null {
  const trimmed = raw.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0) return null;
  const secret = normalizeSecret(trimmed.slice(0, dot));
  const hostId = trimmed.slice(dot + 1).trim();
  if (secret.length !== SECRET_LENGTH || [...secret].some((char) => !CROCKFORD.includes(char))) return null;
  if (!HOST_ID.test(hostId)) return null;
  return { secret, hostId };
}

/**
 * Nom de la salle chez les relais : une empreinte du secret, jamais le secret lui-même (il sert aussi
 * de mot de passe de chiffrement de la mise en relation).
 */
export async function roomIdOf(secret: string): Promise<string> {
  return (await sha256Hex(`nmjsc-salle:${secret}`)).slice(0, 32);
}
