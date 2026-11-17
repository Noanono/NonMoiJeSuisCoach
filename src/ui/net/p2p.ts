/**
 * Pair-à-pair sans serveur (MULTI-11) : Trystero met les navigateurs en relation par des relais Nostr publics
 * (messages de mise en relation chiffrés), puis tout passe en WebRTC, chiffré de bout en bout (DTLS).
 * Chargé à la demande : le solo n'en a pas besoin.
 */
import type { MessageAction, RequestAction, Room } from 'trystero';

export const APP_ID = 'non-moi-je-suis-coach';
/** Salle commune où les serveurs publics s'annoncent (MULTI-13). */
export const DIRECTORY_ROOM = 'annuaire-v1';
/** Une partie complète pèse ~500 Ko : marge large côté coach. */
export const CLIENT_MAX_RECEIVE_BYTES = 32 * 1024 * 1024;
/** Ce qu'un coach envoie à l'hôte reste petit (commandes, résumé de match). */
export const HOST_MAX_RECEIVE_BYTES = 5 * 1024 * 1024;
/** Une requête sans réponse de l'hôte est abandonnée. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Requête d'un coach à l'hôte (envoyée sérialisée en JSON, réponse `ApiResult` sérialisée aussi). */
export interface PeerRequest {
  route: string;
  body: Record<string, unknown>;
}

export interface LeagueRoom {
  room: Room;
  /** Hôte → coach : messages de la ligue, déjà sérialisés. */
  message: MessageAction<string>;
  /** Coach → hôte : actions (`PeerRequest` en JSON), avec réponse (`ApiResult` en JSON). */
  request: RequestAction<string, string>;
}

export async function joinLeagueRoom(options: { roomId: string; password: string; host: boolean }): Promise<LeagueRoom> {
  const { joinRoom } = await import('trystero');
  const room = joinRoom(
    {
      appId: APP_ID,
      password: options.password,
      // L'hôte garde une identité stable (le code du serveur la contient) ; un coach n'en a pas besoin.
      identity: options.host ? 'local' : 'none',
      maxReceiveBytes: options.host ? HOST_MAX_RECEIVE_BYTES : CLIENT_MAX_RECEIVE_BYTES,
    },
    options.roomId,
  );
  return {
    room,
    message: room.makeAction<string>('ligue'),
    request: room.makeAction<string, string>('action', { kind: 'request' }),
  };
}

export async function joinDirectoryRoom(host: boolean): Promise<Room> {
  const { joinRoom } = await import('trystero');
  return joinRoom({ appId: APP_ID, identity: host ? 'local' : 'none', maxReceiveBytes: 64 * 1024 }, DIRECTORY_ROOM);
}
