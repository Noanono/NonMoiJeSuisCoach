/**
 * Identifiants TURN temporaires (MULTI-16), selon le schéma recommandé par Metered : chaque identifiant vit 48 h
 * et un nouveau est créé toutes les 24 h. Les deux se chevauchent, donc un joueur ne reçoit jamais un identifiant
 * qui expire en pleine ligue. Un identifiant neuf met jusqu'à 2 minutes à se propager sur le réseau Metered :
 * on continue de servir le précédent tant qu'il n'est pas prêt.
 *
 * Pas de tâche planifiée : la rotation se fait à la première demande qui la rend nécessaire.
 */

export const LIFETIME_S = 48 * 3600;
export const ROTATE_AFTER_MS = 24 * 3600 * 1000;
/** Propagation annoncée par Metered (2 min), avec de la marge. */
export const PROPAGATION_MS = 3 * 60 * 1000;
/** On ne donne pas un identifiant qui expire avant la fin d'une longue soirée de ligue. */
export const MIN_REMAINING_MS = 6 * 3600 * 1000;

export interface StoredCredential {
  /** Clé propre à l'identifiant (sans danger côté navigateur) : elle donne la liste des serveurs ICE. */
  apiKey: string;
  createdAt: number;
  expiresAt: number;
}

export interface RotationState {
  credentials: StoredCredential[];
}

/** Faut-il créer un nouvel identifiant ? Aucun, ou le plus récent a plus de 24 h. */
export function needsRotation(state: RotationState, now: number): boolean {
  const newest = newestFirst(state.credentials)[0];
  return !newest || now - newest.createdAt >= ROTATE_AFTER_MS || newest.expiresAt - now < MIN_REMAINING_MS;
}

/**
 * Identifiant à servir : le plus récent déjà propagé et encore valable assez longtemps. Au tout premier
 * démarrage, il n'y en a pas d'autre que le neuf : on le sert quand même (le relais marche au bout de 2 min).
 */
export function pickCredential(state: RotationState, now: number): StoredCredential | null {
  const valid = newestFirst(state.credentials).filter((credential) => credential.expiresAt - now >= MIN_REMAINING_MS);
  return valid.find((credential) => now - credential.createdAt >= PROPAGATION_MS) ?? valid[0] ?? null;
}

/** Ajoute un identifiant et oublie ceux qui ont expiré. */
export function withCredential(state: RotationState, credential: StoredCredential, now: number): RotationState {
  return { credentials: newestFirst([credential, ...state.credentials]).filter((entry) => entry.expiresAt > now) };
}

function newestFirst(credentials: readonly StoredCredential[]): StoredCredential[] {
  return [...credentials].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Pages autorisées à demander des identifiants depuis un autre domaine : la version CrazyGames (le jeu tourne
 * dans un cadre servi par CrazyGames) et le serveur de dev. Le site Netlify lui-même est sur le même domaine.
 */
const ALLOWED_ORIGINS = [/^https:\/\/([a-z0-9-]+\.)*crazygames\.(com|[a-z]{2}|co\.uk|com\.br)$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  return ALLOWED_ORIGINS.some((pattern) => pattern.test(origin)) ? origin : null;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/** Réponse de Metered vérifiée : seulement des serveurs STUN/TURN bien formés. */
export function parseIceServers(raw: unknown): IceServer[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is IceServer => {
    if (typeof entry !== 'object' || entry === null) return false;
    const urls = (entry as IceServer).urls;
    const list = Array.isArray(urls) ? urls : [urls];
    return list.length > 0 && list.every((url) => typeof url === 'string' && /^(stun|turns?):/.test(url));
  });
}
