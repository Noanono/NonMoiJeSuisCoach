/**
 * Annuaire des serveurs publics (MULTI-13), sans serveur : les hôtes publics s'annoncent dans une salle
 * pair-à-pair commune ; la page « Rejoindre » écoute. Tout ce qui arrive est vérifié et borné : une annonce
 * vient d'un inconnu.
 */
import { MAX_COACHES } from '../../domain/game/multiplayer';
import { formatCode, parseCode } from './serverCode';

/** L'hôte public se rappelle au bon souvenir de tous à ce rythme. */
export const ANNOUNCE_EVERY_MS = 15_000;
/** Sans nouvelles depuis ce délai, le serveur disparaît de la liste. */
export const ANNOUNCE_TTL_MS = 45_000;
export const SERVER_NAME_MAX = 40;
const HOST_NAME_MAX = 24;

export interface Announcement {
  /** Code complet, à coller dans « Rejoindre ». */
  code: string;
  name: string;
  hostName: string;
  coaches: number;
  max: number;
  phase: 'lobby' | 'playing';
  season: number | null;
  week: number | null;
  version: number;
}

/** Annonce retirée : l'hôte ferme ou repasse en privé. */
export interface Withdrawal {
  withdraw: string;
}

export interface PublicServer extends Announcement {
  seenAt: number;
}

const cleanText = (value: unknown, max: number): string =>
  typeof value === 'string'
    ? value
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, max)
    : '';

const smallInt = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;

/**
 * Lit une annonce reçue de `senderId` (identité vérifiée par WebRTC). Elle n'est retenue que si le code
 * désigne bien son expéditeur comme hôte : personne n'annonce le serveur d'un autre.
 */
export function readAnnouncement(raw: unknown, senderId: string): Announcement | Withdrawal | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  if (typeof record.withdraw === 'string') {
    const code = parseCode(record.withdraw);
    return code && code.hostId === senderId ? { withdraw: formatCode(code) } : null;
  }
  const code = typeof record.code === 'string' ? parseCode(record.code) : null;
  if (!code || code.hostId !== senderId) return null;
  const name = cleanText(record.name, SERVER_NAME_MAX);
  const coaches = smallInt(record.coaches, 0, MAX_COACHES);
  const max = smallInt(record.max, 1, MAX_COACHES);
  const version = smallInt(record.version, 0, 1_000_000);
  const phase = record.phase === 'lobby' || record.phase === 'playing' ? record.phase : null;
  if (!name || coaches === null || max === null || version === null || !phase) return null;
  return {
    code: formatCode(code),
    name,
    hostName: cleanText(record.hostName, HOST_NAME_MAX),
    coaches,
    max,
    phase,
    season: smallInt(record.season, 1, 10_000),
    week: smallInt(record.week, 0, 100),
    version,
  };
}

/** Met la liste à jour avec une annonce (ou un retrait). */
export function applyAnnouncement(list: readonly PublicServer[], entry: Announcement | Withdrawal, now: number): PublicServer[] {
  if ('withdraw' in entry) return list.filter((server) => server.code !== entry.withdraw);
  return [...list.filter((server) => server.code !== entry.code), { ...entry, seenAt: now }];
}

/** Oublie les serveurs muets, et trie : salles d'attente d'abord, puis les plus remplies. */
export function freshServers(list: readonly PublicServer[], now: number): PublicServer[] {
  return list
    .filter((server) => now - server.seenAt <= ANNOUNCE_TTL_MS)
    .sort((a, b) => (a.phase === b.phase ? b.coaches - a.coaches : a.phase === 'lobby' ? -1 : 1) || a.name.localeCompare(b.name, 'fr'));
}
