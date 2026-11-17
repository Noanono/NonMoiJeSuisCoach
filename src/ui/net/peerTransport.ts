/**
 * Coach relié à l'hôte en pair-à-pair, par le code du serveur (MULTI-11, MULTI-12). Seuls les messages signés
 * par l'identité de l'hôte inscrite dans le code sont écoutés : un autre invité ne peut pas se faire passer pour lui.
 */
import { GAME_VERSION } from '../../domain/game';
import { localCoachId, localCoachSecret } from './identity';
import { joinLeagueRoom, REQUEST_TIMEOUT_MS, type LeagueRoom } from './p2p';
import { roomIdOf, type ServerCode } from './serverCode';
import { parseServerMessage, type ApiResult, type Transport, type TransportHandlers } from './transport';

/** Sans hôte au bout de ce délai, on le dit (on continue d'attendre : il peut arriver). */
const HOST_WAIT_MS = 20_000;

export class PeerTransport implements Transport {
  readonly host = false;
  readonly #code: ServerCode;
  /** Identité figée pour cette connexion (un code de reprise en crée une nouvelle). */
  readonly #coachId = localCoachId();
  readonly #secret = localCoachSecret();
  #handlers: TransportHandlers | null = null;
  #league: LeagueRoom | null = null;
  #hostPeer: string | null = null;
  #closed = false;
  #waitTimer: ReturnType<typeof setTimeout> | null = null;
  readonly #unsubscribe: (() => void)[] = [];

  constructor(code: ServerCode) {
    this.#code = code;
  }

  connect(handlers: TransportHandlers): void {
    this.#handlers = handlers;
    if (this.#league || this.#closed) return;
    handlers.status('connecting');
    void this.#open();
  }

  async #open(): Promise<void> {
    let league: LeagueRoom;
    try {
      league = await joinLeagueRoom({ roomId: await roomIdOf(this.#code.secret), password: this.#code.secret, host: false });
    } catch {
      this.#handlers?.status('offline');
      return;
    }
    if (this.#closed) {
      void league.room.leave();
      return;
    }
    this.#league = league;
    const { room, message } = league;
    this.#unsubscribe.push(
      message.onMessage((data, context) => {
        if (context.userId !== this.#code.hostId) return;
        const parsed = parseServerMessage(data);
        if (parsed) this.#handlers?.message(parsed);
      }),
      room.onPeerJoin(({ peerId, userId }) => {
        if (userId !== this.#code.hostId) return;
        this.#hostPeer = peerId;
        void this.#hello();
      }, { replay: true }),
      room.onPeerLeave(({ peerId }) => {
        if (peerId !== this.#hostPeer) return;
        // L'hôte a fermé son onglet, ou sa connexion a lâché : Trystero le retrouvera s'il revient.
        this.#hostPeer = null;
        this.#handlers?.status('connecting');
        this.#armWait();
      }),
    );
    this.#armWait();
  }

  #armWait(): void {
    if (this.#waitTimer) clearTimeout(this.#waitTimer);
    this.#waitTimer = setTimeout(() => {
      if (!this.#hostPeer && !this.#closed) this.#handlers?.status('offline');
    }, HOST_WAIT_MS);
  }

  /** Présentation à l'hôte : qui on est (avec la preuve), et la version du jeu. */
  async #hello(): Promise<void> {
    const reply = await this.request('hello', { coachId: this.#coachId, secret: this.#secret, version: GAME_VERSION });
    if (this.#closed) return;
    if (reply.ok) {
      if (this.#waitTimer) clearTimeout(this.#waitTimer);
      this.#handlers?.status('online');
      return;
    }
    this.#handlers?.message({ type: 'closed', message: reply.message ?? 'L’hôte a refusé la connexion.' });
  }

  async request(route: string, body: Record<string, unknown>): Promise<ApiResult> {
    const league = this.#league;
    const target = this.#hostPeer;
    if (!league || !target) return { ok: false, message: 'Pas encore connecté à l’hôte. Patience…' };
    try {
      const raw = await league.request.request(JSON.stringify({ route, body }), { target, timeoutMs: REQUEST_TIMEOUT_MS });
      const reply = JSON.parse(raw) as ApiResult;
      return typeof reply === 'object' && reply !== null && typeof reply.ok === 'boolean' ? reply : { ok: false, message: 'Réponse illisible de l’hôte.' };
    } catch {
      return { ok: false, message: 'Hôte injoignable : il a peut-être fermé l’onglet.' };
    }
  }

  resync(): void {
    // Se présenter à nouveau fait renvoyer la partie en entier.
    if (this.#hostPeer) void this.#hello();
  }

  close(): void {
    this.#closed = true;
    if (this.#waitTimer) clearTimeout(this.#waitTimer);
    for (const unsubscribe of this.#unsubscribe.splice(0)) unsubscribe();
    void this.#league?.room.leave();
    this.#league = null;
    this.#hostPeer = null;
    this.#handlers?.status('idle');
  }
}
