/**
 * Comment un coach parle à l'hôte de la ligue. Trois chemins, même protocole (`ServerMessage` dans un sens,
 * actions avec réponse dans l'autre) :
 * - `PeerTransport` : pair-à-pair avec le navigateur de l'hôte, par son code (MULTI-11) ;
 * - `LoopbackTransport` : l'hôte joue aussi, directement sur son moteur ;
 * - `SseTransport` : serveur Node du réseau local, obsolète.
 */
import type { ServerMessage } from '../../server/hub';

/**
 * `offline` : l'hôte reste introuvable. `blocked` : on l'a trouvé, mais vos réseaux refusent la connexion
 * directe (NAT strict des deux côtés, sans relais TURN).
 */
export type ConnectionStatus = 'idle' | 'connecting' | 'online' | 'offline' | 'blocked';

export interface ApiResult {
  ok: boolean;
  message?: string;
  value?: unknown;
}

export interface TransportHandlers {
  message: (message: ServerMessage) => void;
  status: (status: ConnectionStatus) => void;
}

export interface Transport {
  /** Ce coach est l'hôte : lui seul lance la ligue (MULTI-15). */
  readonly host: boolean;
  connect(handlers: TransportHandlers): void;
  /** Action du coach ; le transport y ajoute l'identité du coach si besoin. */
  request(route: string, body: Record<string, unknown>): Promise<ApiResult>;
  /** Redemande la partie en entier (une différence est arrivée sans partie de départ). */
  resync(): void;
  /** Liaison perdue : retente tout de suite, sans attendre le prochain essai prévu. */
  reconnect(): void;
  close(): void;
}

/** Parse un message de l'hôte ; `null` s'il n'en a pas la forme. */
export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (typeof raw !== 'string') return null;
  try {
    const message = JSON.parse(raw) as unknown;
    if (typeof message !== 'object' || message === null || typeof (message as { type?: unknown }).type !== 'string') return null;
    return message as ServerMessage;
  } catch {
    return null;
  }
}

/**
 * @deprecated Serveur Node du réseau local (`npm run serveur`) : la partie arrive en Server-Sent Events,
 * les actions partent en POST. Remplacé par le pair-à-pair.
 */
export class SseTransport implements Transport {
  #source: EventSource | null = null;
  #handlers: TransportHandlers | null = null;
  readonly #coachId: () => string;
  readonly host: boolean;

  constructor(coachId: () => string, host: boolean) {
    this.#coachId = coachId;
    this.host = host;
  }

  connect(handlers: TransportHandlers): void {
    this.#handlers = handlers;
    if (this.#source) return;
    handlers.status('connecting');
    const source = new EventSource(`/api/events?coach=${encodeURIComponent(this.#coachId())}`);
    source.onopen = () => handlers.status('online');
    source.onerror = () => handlers.status(source.readyState === EventSource.CLOSED ? 'offline' : 'connecting');
    source.onmessage = (event) => {
      const message = parseServerMessage(event.data);
      if (message) handlers.message(message);
    };
    this.#source = source;
  }

  async request(route: string, body: Record<string, unknown>): Promise<ApiResult> {
    try {
      const response = await fetch(`/api/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach: this.#coachId(), ...body }),
      });
      return (await response.json()) as ApiResult;
    } catch {
      return { ok: false, message: 'Serveur injoignable. L’hôte a peut-être éteint son PC.' };
    }
  }

  resync(): void {
    const handlers = this.#handlers;
    this.close();
    if (handlers) this.connect(handlers);
  }

  reconnect(): void {
    this.resync();
  }

  close(): void {
    this.#source?.close();
    this.#source = null;
    this.#handlers?.status('idle');
  }
}
