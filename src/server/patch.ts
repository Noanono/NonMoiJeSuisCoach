/**
 * Envoi partiel de la partie (C8) : au lieu de renvoyer toute la partie (environ 500 Ko) à chaque action,
 * le serveur compare, morceau par morceau, ce qu'il a déjà envoyé à chaque navigateur et n'envoie que ce
 * qui a changé. Un morceau est une clé de premier niveau, ou un élément d'une grande collection
 * (un joueur, un club, un match du calendrier).
 */

/** À partir de cette taille, une collection est comparée élément par élément. */
const SPLIT_MIN = 16;
const SEP = '\u0000';
/** Marqueurs de collection découpée ; la longueur d'un tableau est un morceau à part. */
const ARRAY_MARK = JSON.stringify('\u0000A');
const OBJECT_MARK = JSON.stringify('\u0000O');
const LENGTH_KEY = '#';

/** Morceaux sérialisés d'un objet : chemin → JSON. */
export type Parts = Map<string, string>;

export interface GamePatch {
  /** Chemin → nouvelle valeur. Un marqueur annonce une collection découpée, à recréer vide. */
  set: Record<string, unknown>;
  remove: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function splits(value: unknown): value is unknown[] | Record<string, unknown> {
  if (Array.isArray(value)) return value.length >= SPLIT_MIN;
  return isPlainObject(value) && Object.keys(value).length >= SPLIT_MIN;
}

/** Découpe un objet en morceaux sérialisés. À appeler tout de suite : l'objet peut changer ensuite. */
export function toParts(source: Record<string, unknown>): Parts {
  const parts: Parts = new Map();
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    if (!splits(value)) {
      parts.set(key, JSON.stringify(value));
      continue;
    }
    if (Array.isArray(value)) {
      parts.set(key, ARRAY_MARK);
      parts.set(`${key}${SEP}${LENGTH_KEY}`, String(value.length));
      value.forEach((item, index) => parts.set(`${key}${SEP}${index}`, JSON.stringify(item) ?? 'null'));
    } else {
      parts.set(key, OBJECT_MARK);
      for (const [child, item] of Object.entries(value)) if (item !== undefined) parts.set(`${key}${SEP}${child}`, JSON.stringify(item));
    }
  }
  return parts;
}

/**
 * Différence entre ce que le navigateur a et ce qu'il doit avoir, déjà sérialisée en JSON
 * (les morceaux sont recopiés tels quels, sans être relus). `null` si rien n'a changé.
 */
export function diffParts(previous: Parts, next: Parts): string | null {
  const set: string[] = [];
  const remove: string[] = [];
  // Une collection qui apparaît ou change de forme est renvoyée en entier.
  const rebuilt = new Set<string>();
  for (const [path, json] of next) {
    if (path.includes(SEP)) continue;
    if ((json === ARRAY_MARK || json === OBJECT_MARK) && previous.get(path) !== json) rebuilt.add(path);
  }
  for (const [path, json] of next) {
    const top = path.split(SEP, 1)[0]!;
    if (previous.get(path) !== json || (path !== top && rebuilt.has(top))) set.push(`${JSON.stringify(path)}:${json}`);
  }
  for (const path of previous.keys()) if (!next.has(path)) remove.push(path);
  if (set.length === 0 && remove.length === 0) return null;
  return `{"set":{${set.join(',')}},"remove":${JSON.stringify(remove)}}`;
}

/** La partie entière en JSON, recomposée à partir de ses morceaux (sans la resérialiser). */
export function partsToJson(parts: Parts): string {
  const top: string[] = [];
  const children = new Map<string, string[]>();
  for (const [path, json] of parts) {
    const at = path.indexOf(SEP);
    if (at < 0) continue;
    const key = path.slice(0, at);
    const child = path.slice(at + 1);
    if (child === LENGTH_KEY) continue;
    const list = children.get(key) ?? [];
    list.push(parts.get(key) === ARRAY_MARK ? json : `${JSON.stringify(child)}:${json}`);
    children.set(key, list);
  }
  for (const [path, json] of parts) {
    if (path.includes(SEP)) continue;
    const inner = children.get(path) ?? [];
    const value = json === ARRAY_MARK ? `[${inner.join(',')}]` : json === OBJECT_MARK ? `{${inner.join(',')}}` : json;
    top.push(`${JSON.stringify(path)}:${value}`);
  }
  return `{${top.join(',')}}`;
}

/**
 * Côté navigateur : applique la différence à la partie connue et rend une nouvelle partie.
 * Les morceaux inchangés gardent leur identité ; les collections touchées sont copiées.
 */
export function applyPatch<T extends object>(base: T, patch: GamePatch): T {
  const next: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  const copied = new Set<string>();
  const container = (key: string): Record<string, unknown> | unknown[] => {
    if (!copied.has(key)) {
      const current = next[key];
      next[key] = Array.isArray(current) ? [...current] : isPlainObject(current) ? { ...current } : {};
      copied.add(key);
    }
    return next[key] as Record<string, unknown> | unknown[];
  };
  const entries = Object.entries(patch.set);
  // D'abord les collections recréées, puis leur contenu.
  for (const [path, value] of entries) {
    if (path.includes(SEP)) continue;
    if (value === '\u0000A') {
      next[path] = [];
      copied.add(path);
    } else if (value === '\u0000O') {
      next[path] = {};
      copied.add(path);
    } else next[path] = value;
  }
  for (const [path, value] of entries) {
    const at = path.indexOf(SEP);
    if (at < 0) continue;
    const key = path.slice(0, at);
    const child = path.slice(at + 1);
    const target = container(key);
    if (Array.isArray(target)) {
      if (child === LENGTH_KEY) target.length = Number(value);
      else target[Number(child)] = value;
    } else target[child] = value;
  }
  for (const path of patch.remove) {
    const at = path.indexOf(SEP);
    if (at < 0) {
      delete next[path];
      continue;
    }
    const key = path.slice(0, at);
    const target = container(key);
    // Les éléments d'un tableau disparaissent avec sa nouvelle longueur.
    if (!Array.isArray(target)) delete target[path.slice(at + 1)];
  }
  return next as T;
}
