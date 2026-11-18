/**
 * `GET /api/turn` : serveurs ICE (STUN + TURN Metered) avec des identifiants temporaires (MULTI-16).
 * La clé secrète Metered reste ici, côté serveur ; le jeu ne reçoit que des identifiants qui expirent.
 *
 * Variables d'environnement du site Netlify :
 * - `METERED_DOMAIN` : domaine de l'application Metered, par exemple `nmjsc.metered.live` ;
 * - `METERED_SECRET_KEY` : clé secrète (Metered → Developers), à déclarer comme secret.
 */
import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';
import { allowedOrigin, LIFETIME_S, needsRotation, parseIceServers, pickCredential, withCredential, type IceServer, type RotationState } from '../turn/rotation';

const STATE_KEY = 'rotation';
const LABEL = 'nmjsc-ligue';
/** Le navigateur garde la liste une heure : il redemande au besoin, l'identifiant servi vaut encore 6 h au moins. */
const CLIENT_TTL_S = 3600;
/** Cache de l'instance : évite d'interroger Metered à chaque coach qui rejoint. */
const INSTANCE_CACHE_MS = 10 * 60 * 1000;

let cached: { apiKey: string; servers: IceServer[]; until: number } | null = null;

export default async (request: Request): Promise<Response> => {
  const origin = allowedOrigin(request.headers.get('origin'));
  const cors: Record<string, string> = origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {};
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET' } });
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: cors });

  const domain = process.env.METERED_DOMAIN;
  const secretKey = process.env.METERED_SECRET_KEY;
  if (!domain || !secretKey) return json({ iceServers: [], error: 'Relais TURN non configuré.' }, 503, cors);

  try {
    const now = Date.now();
    const apiKey = await currentApiKey(domain, secretKey, now);
    if (!apiKey) return json({ iceServers: [], error: 'Aucun identifiant TURN valable.' }, 503, cors);
    if (!cached || cached.apiKey !== apiKey || cached.until <= now) {
      const response = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`);
      if (!response.ok) throw new Error(`Metered a répondu ${response.status}`);
      cached = { apiKey, servers: parseIceServers(await response.json()), until: now + INSTANCE_CACHE_MS };
    }
    return json({ iceServers: cached.servers, ttl: CLIENT_TTL_S }, 200, { ...cors, 'cache-control': `private, max-age=${CLIENT_TTL_S}` });
  } catch (error) {
    console.error('[turn]', error instanceof Error ? error.message : error);
    return json({ iceServers: [], error: 'Relais TURN indisponible.' }, 502, cors);
  }
};

/** Identifiant à servir, après avoir créé le suivant si l'heure de la rotation est venue. */
async function currentApiKey(domain: string, secretKey: string, now: number): Promise<string | null> {
  const store = getStore({ name: 'turn', consistency: 'strong' });
  let state = ((await store.get(STATE_KEY, { type: 'json' })) as RotationState | null) ?? { credentials: [] };
  if (needsRotation(state, now)) {
    const response = await fetch(`https://${domain}/api/v1/turn/credential?secretKey=${encodeURIComponent(secretKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expiryInSeconds: LIFETIME_S, label: LABEL }),
    });
    if (!response.ok) throw new Error(`Création de l'identifiant refusée par Metered (${response.status})`);
    const created = (await response.json()) as { apiKey?: unknown };
    if (typeof created.apiKey !== 'string') throw new Error('Réponse de Metered sans apiKey');
    state = withCredential(state, { apiKey: created.apiKey, createdAt: now, expiresAt: now + LIFETIME_S * 1000 }, now);
    // Deux demandes simultanées peuvent créer chacune un identifiant : sans gravité, les deux sont valables.
    await store.setJSON(STATE_KEY, state);
  }
  return pickCredential(state, now)?.apiKey ?? null;
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'content-type': 'application/json' } });
}

export const config: Config = {
  path: '/api/turn',
  // Un joueur n'en a besoin qu'une fois par heure : au-delà, c'est quelqu'un qui pompe des identifiants.
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
