/**
 * Journal local des événements réseau (MULTI-18) : quand un ami n'arrive pas à se connecter, il copie ce journal
 * et l'envoie à l'hôte, au lieu de « ça marche pas ». Il reste dans le navigateur (localStorage), rien ne part
 * tout seul. Aucune donnée personnelle : pas de pseudo, pas d'adresse, et du code serveur seulement les
 * 4 premiers caractères (`codeHint`), qui ne suffisent pas à rejoindre la salle.
 */

/** Taille de la mémoire tampon : au-delà, les plus vieilles entrées partent. */
export const NET_LOG_MAX = 50;
const STORAGE_KEY = 'nmjsc-journal-reseau';

export type NetLogKind =
  /** Coach : connexion à un serveur (code tronqué). */
  | 'connexion'
  /** Coach : relié à l'hôte. */
  | 'connecte'
  /** Coach : l'hôte a disparu de la salle. */
  | 'hote-perdu'
  /** Coach : nouvelle tentative (on rejoint la salle à nouveau). */
  | 'reconnexion'
  /** Coach : état « Réseau bloqué » ou « Hôte injoignable ». */
  | 'etat'
  /** Erreur remontée par Trystero (`room.onError`). */
  | 'erreur'
  /** Résultat du test réseau de l'écran « Rejoindre ». */
  | 'test';

export interface NetLogEntry {
  /** Heure, en millisecondes depuis 1970. */
  at: number;
  kind: NetLogKind;
  detail: string;
}

/** Ce dont le journal a besoin pour durer : le `localStorage` du navigateur, ou une imitation en test. */
export interface NetLogStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Les 4 premiers caractères d'un code serveur, assez pour savoir de quel serveur on parle. */
export function codeHint(code: string): string {
  return `${code.trim().slice(0, 4)}…`;
}

function isEntry(value: unknown): value is NetLogEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<NetLogEntry>;
  return typeof entry.at === 'number' && typeof entry.kind === 'string' && typeof entry.detail === 'string';
}

function defaultStorage(): NetLogStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Stockage refusé (navigation privée stricte, iframe sans accès) : le journal reste en mémoire.
    return null;
  }
}

export class NetLog {
  readonly #storage: NetLogStorage | null;
  readonly #now: () => number;
  #entries: NetLogEntry[] | null = null;

  constructor(options: { storage?: NetLogStorage | null; now?: () => number } = {}) {
    this.#storage = options.storage === undefined ? defaultStorage() : options.storage;
    this.#now = options.now ?? Date.now;
  }

  /** Les entrées, de la plus ancienne à la plus récente. */
  entries(): readonly NetLogEntry[] {
    if (this.#entries) return this.#entries;
    let loaded: NetLogEntry[] = [];
    try {
      const raw = this.#storage?.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) loaded = parsed.filter(isEntry).slice(-NET_LOG_MAX);
    } catch {
      // Journal illisible : on repart d'un journal vide.
    }
    this.#entries = loaded;
    return loaded;
  }

  add(kind: NetLogKind, detail: string): void {
    const entries = [...this.entries(), { at: this.#now(), kind, detail }].slice(-NET_LOG_MAX);
    this.#entries = entries;
    try {
      this.#storage?.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Stockage plein ou refusé : l'entrée reste en mémoire pour cette session.
    }
  }

  clear(): void {
    this.#entries = [];
    try {
      this.#storage?.removeItem(STORAGE_KEY);
    } catch {
      // Rien à faire.
    }
  }
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Heure lisible, sur l'horloge du joueur : « 2026-11-18 14:05:09 ». */
export function formatTime(at: number): string {
  const date = new Date(at);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Texte à coller dans un message : version du jeu, navigateur, puis les entrées. */
export function formatNetLog(entries: readonly NetLogEntry[], context: { version: string | number; userAgent: string; status?: string }): string {
  const lines = [
    'Journal réseau – Non, moi je suis coach',
    `Version du jeu : ${context.version}`,
    `Navigateur : ${context.userAgent}`,
  ];
  if (context.status) lines.push(`État actuel : ${context.status}`);
  lines.push('');
  if (entries.length === 0) lines.push('(aucun événement réseau enregistré)');
  for (const entry of entries) lines.push(`${formatTime(entry.at)}  [${entry.kind}] ${entry.detail}`);
  return lines.join('\n');
}

/** Le journal de ce navigateur. */
export const netLog = new NetLog();
