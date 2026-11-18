/**
 * Pair-à-pair sans serveur (MULTI-11) : Trystero met les navigateurs en relation par des relais Nostr publics
 * (messages de mise en relation chiffrés), puis tout passe en WebRTC, chiffré de bout en bout (DTLS).
 * Chargé à la demande : le solo n'en a pas besoin.
 */
import type { MessageAction, RelayConfig, RequestAction, Room, TurnServerConfig } from 'trystero';

export const APP_ID = 'non-moi-je-suis-coach';
/** Salle commune où les serveurs publics s'annoncent (MULTI-13). */
export const DIRECTORY_ROOM = 'annuaire-v1';
/** Une partie complète pèse ~500 Ko : marge large côté coach. */
export const CLIENT_MAX_RECEIVE_BYTES = 32 * 1024 * 1024;
/** Ce qu'un coach envoie à l'hôte reste petit (commandes, résumé de match). */
export const HOST_MAX_RECEIVE_BYTES = 5 * 1024 * 1024;
/** Une requête sans réponse de l'hôte est abandonnée. */
export const REQUEST_TIMEOUT_MS = 15_000;
/**
 * Reconnexion d'un coach (`PeerTransport`) après la perte de l'hôte : Trystero a 5 s pour le retrouver seul,
 * puis chaque nouvelle salle a 15 s, puis 30 s ; on continue toutes les 30 s ensuite.
 */
export const RETRY_DELAYS_MS = [5_000, 15_000, 30_000] as const;

/** Délai avant la prochaine tentative, selon le nombre de tentatives déjà faites depuis la perte de l'hôte. */
export function retryDelay(attempt: number): number {
  return RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
}

/** Requête d'un coach à l'hôte (envoyée sérialisée en JSON, réponse `ApiResult` sérialisée aussi). */
export interface PeerRequest {
  route: string;
  body: Record<string, unknown>;
}

export interface LeagueRoom {
  room: Room;
  /** Hôte → coach : messages de la ligue, déjà sérialisés ; les gros partent compressés en gzip (octets). */
  message: MessageAction<string | Uint8Array>;
  /** Coach → hôte : actions (`PeerRequest` en JSON), avec réponse (`ApiResult` en JSON). */
  request: RequestAction<string, string>;
}

/**
 * Relais Nostr interrogés en parallèle pour se trouver. Trystero en prend 5 par défaut, toujours les mêmes (tirés
 * de l'appId) : qu'un ou deux soient lents ou filtrent nos annonces, et l'hôte devient introuvable. Avec 10, il
 * suffit qu'un seul relais commun aux deux joueurs fonctionne.
 */
const RELAY_REDUNDANCY = 10;

/**
 * Relais TURN (MULTI-16) : sans lui, deux joueurs derrière des box ou réseaux stricts (4G, CGNAT, école,
 * entreprise) ne peuvent pas se relier directement ; le TURN fait passer le trafic, toujours chiffré, par un
 * serveur intermédiaire. Les identifiants sont temporaires et viennent de la fonction Netlify `/api/turn`
 * (`VITE_TURN_ENDPOINT` pour une autre adresse, vide pour s'en passer). Injoignable : on reste en STUN seul.
 */
const TURN_ENDPOINT = import.meta.env.VITE_TURN_ENDPOINT ?? '/api/turn';
const TURN_TIMEOUT_MS = 4_000;
/** Durée de vie par défaut de la liste reçue, si la fonction n'en donne pas. */
const TURN_DEFAULT_TTL_S = 3600;

let iceCache: { servers: Promise<TurnServerConfig[]>; until: number } | null = null;

/** Serveurs ICE à jour, demandés au plus une fois par heure (et une seule fois pour des salles ouvertes ensemble). */
export function turnServers(now = Date.now()): Promise<TurnServerConfig[]> {
  if (!TURN_ENDPOINT) return Promise.resolve([]);
  if (iceCache && iceCache.until > now) return iceCache.servers;
  const entry = { servers: fetchTurnServers(TURN_ENDPOINT), until: now + TURN_DEFAULT_TTL_S * 1000 };
  iceCache = entry;
  void entry.servers.then((servers) => {
    // Échec : on retentera à la prochaine salle plutôt que dans une heure.
    if (servers.length === 0 && iceCache === entry) iceCache = null;
  });
  return entry.servers;
}

export async function fetchTurnServers(endpoint: string, fetcher: typeof fetch = fetch): Promise<TurnServerConfig[]> {
  try {
    const response = await fetcher(endpoint, { signal: AbortSignal.timeout(TURN_TIMEOUT_MS) });
    if (!response.ok) return [];
    const body = (await response.json()) as { iceServers?: unknown };
    if (!Array.isArray(body.iceServers)) return [];
    return body.iceServers.filter(
      (server): server is TurnServerConfig =>
        typeof server === 'object' && server !== null && (typeof server.urls === 'string' || Array.isArray(server.urls)),
    );
  } catch {
    return [];
  }
}

const relayConfig: RelayConfig = { redundancy: RELAY_REDUNDANCY };

/**
 * Rythme des annonces de l'hôte dans la salle de sa ligue. Un coach ne s'annonce pas (salle en étoile) : il attend
 * la prochaine annonce de l'hôte pour le rejoindre, soit 2 s en moyenne. Trystero n'annonce que toutes les 60 s en
 * régime établi ; `announceIntervalMs` vient de notre patch (`patches/@trystero-p2p%2Fcore@0.27.0.patch`).
 * Une annonce par relais toutes les 4 s reste loin des limites de débit des relais Nostr.
 */
const HOST_ANNOUNCE_MS = 4_000;

/**
 * Préchauffage (écran « Rejoindre ») : on charge Trystero, on demande les identifiants TURN et on ouvre les
 * connexions aux relais Nostr avant le clic. Les sockets des relais sont partagées entre salles et fermées dès
 * que plus aucune ne s'en sert : une salle muette (`passive`, elle ne s'annonce pas et ne relie personne) les
 * garde ouvertes jusqu'à ce que la salle de la ligue prenne le relais, ou qu'on ait renoncé.
 */
const WARM_ROOM = 'prechauffe-v1';
/** Écran « Rejoindre » quitté sans rejoindre de ligue : on garde les relais ouverts encore ce temps. */
const WARM_LINGER_MS = 30_000;
let warm: { room: Promise<Room | null>; holders: number; timer: ReturnType<typeof setTimeout> | null } | null = null;

/** Prépare la liaison ; renvoie de quoi la relâcher (elle part `WARM_LINGER_MS` plus tard, ou dès qu'une ligue est rejointe). */
export function prewarm(): () => void {
  if (!warm) {
    const room = Promise.all([import('trystero'), turnServers()])
      .then(([{ joinRoom }]) => joinRoom({ appId: APP_ID, identity: 'none', passive: true, relayConfig }, WARM_ROOM))
      .catch(() => null);
    warm = { room, holders: 0, timer: null };
  }
  const entry = warm;
  entry.holders += 1;
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = null;
  let released = false;
  return () => {
    if (released || warm !== entry) return;
    released = true;
    entry.holders -= 1;
    if (entry.holders === 0) entry.timer = setTimeout(releaseWarmRoom, WARM_LINGER_MS);
  };
}

/** La salle de préchauffage est ouverte (ou a échoué) : les relais sont tenus. */
export async function prewarmed(): Promise<void> {
  await warm?.room;
}

function releaseWarmRoom(): void {
  if (!warm) return;
  if (warm.timer) clearTimeout(warm.timer);
  const { room } = warm;
  warm = null;
  void room.then((joined) => joined?.leave()).catch(() => {});
}

/** Deux pairs se sont trouvés mais la connexion directe a échoué (NAT strict des deux côtés, pas de TURN). */
export type PeerFailure = { peerId: string; turnConfigured: boolean };

export async function joinLeagueRoom(options: {
  roomId: string;
  password: string;
  host: boolean;
  onPeerFailure?: (failure: PeerFailure) => void;
}): Promise<LeagueRoom> {
  const [{ joinRoom }, turnConfig] = await Promise.all([import('trystero'), turnServers()]);
  const room = joinRoom(
    {
      appId: APP_ID,
      password: options.password,
      // L'hôte garde une identité stable (le code du serveur la contient) ; un coach n'en a pas besoin.
      identity: options.host ? 'local' : 'none',
      maxReceiveBytes: options.host ? HOST_MAX_RECEIVE_BYTES : CLIENT_MAX_RECEIVE_BYTES,
      relayConfig,
      turnConfig,
      // Étoile autour de l'hôte : les coachs ne se parlent jamais, ils ne s'annoncent donc pas (aucune liaison
      // entre eux) et rejoignent l'hôte quand il s'annonce, ce qu'il fait souvent (patch de Trystero).
      passive: !options.host,
      ...(options.host ? { announceIntervalMs: HOST_ANNOUNCE_MS } : {}),
    },
    options.roomId,
  );
  // La salle de la ligue tient maintenant les relais ouverts : la salle de préchauffage peut partir.
  releaseWarmRoom();
  room.onError((error) => {
    console.warn(`[p2p] ${error.code} : ${error.message}`);
    if (error.code === 'peer-connect-failed') options.onPeerFailure?.({ peerId: error.peerId, turnConfigured: error.turnConfigured });
  });
  return {
    room,
    message: room.makeAction<string | Uint8Array>('ligue'),
    request: room.makeAction<string, string>('action', { kind: 'request' }),
  };
}

export async function joinDirectoryRoom(host: boolean): Promise<Room> {
  const [{ joinRoom }, turnConfig] = await Promise.all([import('trystero'), turnServers()]);
  return joinRoom(
    { appId: APP_ID, identity: host ? 'local' : 'none', maxReceiveBytes: 64 * 1024, relayConfig, turnConfig },
    DIRECTORY_ROOM,
  );
}
