/**
 * Coach relié à l'hôte en pair-à-pair, par le code du serveur (MULTI-11, MULTI-12). Seuls les messages signés
 * par l'identité de l'hôte inscrite dans le code sont écoutés : un autre invité ne peut pas se faire passer pour lui.
 *
 * Reconnexion active : si l'hôte reste introuvable, on quitte la salle et on la rejoint (nouvel identifiant de
 * pair, nouvelles annonces), avec des délais croissants. On relance tout de suite quand l'onglet redevient
 * visible ou que le réseau revient.
 */
import { GAME_VERSION } from '../../domain/game';
import { canGunzip, unpackMessage } from './gzip';
import { localCoachId, localCoachSecret } from './identity';
import { joinLeagueRoom, prewarm, prewarmed, REQUEST_TIMEOUT_MS, retryDelay, type LeagueRoom } from './p2p';
import { roomIdOf, type ServerCode } from './serverCode';
import { parseServerMessage, type ApiResult, type Transport, type TransportHandlers } from './transport';

/** Première connexion : sans hôte au bout de ce délai, on le dit et on rejoint la salle à nouveau. */
const FIRST_WAIT_MS = 20_000;
/** Hôte perdu depuis ce temps : on parle d'« hôte injoignable » plutôt que de reconnexion. */
const OFFLINE_AFTER_MS = 20_000;
/** Retour sur l'onglet : l'hôte doit répondre à un ping dans ce délai, sinon on se reconnecte. */
const PING_TIMEOUT_MS = 5_000;

class HostUnreachable extends Error {}

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
  #opening = false;
  /** Tentatives depuis la perte de l'hôte (0 : la première salle, ou Trystero qui le retrouve seul). */
  #attempt = 0;
  /** Depuis quand l'hôte manque (ou depuis la première tentative). */
  #lostAt = Date.now();
  /** Une connexion directe a échoué dans la salle en cours : réseaux stricts. */
  #failed = false;
  #retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** Les messages se décompressent dans l'ordre d'arrivée : une différence ne double jamais la partie entière. */
  #inbox: Promise<void> = Promise.resolve();
  #unsubscribe: (() => void)[] = [];
  readonly #onVisible = () => {
    if (document.visibilityState === 'visible') void this.#check();
  };
  readonly #onOnline = () => void this.#check();
  readonly #onOffline = () => {
    if (!this.#hostPeer) this.#handlers?.status('offline');
  };

  constructor(code: ServerCode) {
    this.#code = code;
  }

  connect(handlers: TransportHandlers): void {
    this.#handlers = handlers;
    if (this.#league || this.#opening || this.#closed) return;
    handlers.status('connecting');
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.#onVisible);
      window.addEventListener('online', this.#onOnline);
      window.addEventListener('offline', this.#onOffline);
    }
    this.#lostAt = Date.now();
    void this.#open(FIRST_WAIT_MS);
  }

  /** Rejoint la salle (à nouveau), puis laisse `wait` ms à l'hôte pour se montrer. */
  async #open(wait: number): Promise<void> {
    if (this.#opening || this.#closed) return;
    this.#opening = true;
    this.#failed = false;
    // Trystero refuse de rejoindre une salle qu'on n'a pas quittée : on quitte d'abord l'ancienne, en gardant
    // les connexions aux relais ouvertes par la salle de préchauffage le temps de rejoindre la nouvelle.
    const previous = this.#league;
    let cooldown: (() => void) | null = null;
    if (previous) {
      cooldown = prewarm();
      await prewarmed();
      this.#detach();
      this.#league = null;
      this.#hostPeer = null;
      await previous.room.leave().catch(() => {});
    }
    let league: LeagueRoom;
    try {
      league = await joinLeagueRoom({
        roomId: await roomIdOf(this.#code.secret),
        password: this.#code.secret,
        host: false,
        // Tant que l'hôte n'est pas relié, un échec de connexion directe est très probablement le sien : on le dit
        // tout de suite plutôt qu'au bout de l'attente. Trystero retente ; une connexion réussie repasse en ligne.
        onPeerFailure: () => {
          if (this.#league !== league || this.#hostPeer || this.#closed) return;
          this.#failed = true;
          this.#handlers?.status('blocked');
        },
      });
    } catch (error) {
      console.warn('[p2p] salle injoignable', error);
      cooldown?.();
      this.#opening = false;
      this.#handlers?.status('offline');
      this.#schedule(retryDelay(this.#attempt));
      return;
    }
    cooldown?.();
    this.#opening = false;
    if (this.#closed) {
      void league.room.leave();
      return;
    }
    this.#league = league;
    this.#hostPeer = null;

    const { room, message } = league;
    this.#unsubscribe.push(
      message.onMessage((data, context) => {
        if (context.userId !== this.#code.hostId || this.#league !== league) return;
        this.#inbox = this.#inbox.then(async () => {
          const parsed = parseServerMessage(await unpackMessage(data));
          if (parsed && this.#league === league) this.#handlers?.message(parsed);
        });
      }),
      room.onPeerJoin(({ peerId, userId }) => {
        if (userId !== this.#code.hostId || this.#league !== league) return;
        this.#hostPeer = peerId;
        void this.#hello();
      }, { replay: true }),
      room.onPeerLeave(({ peerId }) => {
        if (peerId !== this.#hostPeer || this.#league !== league) return;
        // L'hôte a fermé son onglet, ou la liaison a lâché : on lui laisse un peu de temps, puis on rejoint la salle.
        this.#lost();
      }),
    );
    this.#schedule(wait);
  }

  /** L'hôte vient de disparaître. */
  #lost(): void {
    if (this.#closed) return;
    this.#hostPeer = null;
    this.#attempt = 0;
    this.#lostAt = Date.now();
    this.#handlers?.status('connecting');
    this.#schedule(retryDelay(0));
  }

  #schedule(delay: number): void {
    if (this.#retryTimer) clearTimeout(this.#retryTimer);
    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = null;
      if (this.#hostPeer || this.#closed) return;
      this.#handlers?.status(this.#failed ? 'blocked' : Date.now() - this.#lostAt >= OFFLINE_AFTER_MS ? 'offline' : 'connecting');
      this.#attempt += 1;
      void this.#open(retryDelay(this.#attempt));
    }, delay);
  }

  /** Retour sur l'onglet ou retour du réseau : l'hôte répond-il encore ? Sinon, on se reconnecte tout de suite. */
  async #check(): Promise<void> {
    const league = this.#league;
    const host = this.#hostPeer;
    if (this.#closed || this.#opening) return;
    if (!league || !host) {
      this.reconnect();
      return;
    }
    const alive = await Promise.race([
      league.room.ping(host).then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), PING_TIMEOUT_MS)),
    ]);
    if (!alive && this.#league === league && this.#hostPeer === host) {
      this.#lost();
      this.reconnect();
    }
  }

  /**
   * Présentation à l'hôte : qui on est (avec la preuve), la version du jeu, et si on sait relire une partie
   * compressée. En réponse, l'hôte renvoie la partie entière.
   */
  async #hello(): Promise<void> {
    let reply: ApiResult;
    try {
      reply = await this.#call('hello', { coachId: this.#coachId, secret: this.#secret, version: GAME_VERSION, gzip: canGunzip });
    } catch {
      // Hôte trouvé mais muet : liaison à moitié établie. On repart sur une salle neuve.
      if (!this.#closed) this.#lost();
      return;
    }
    if (this.#closed) return;
    if (reply.ok) {
      if (this.#retryTimer) clearTimeout(this.#retryTimer);
      this.#retryTimer = null;
      this.#attempt = 0;
      this.#handlers?.status('online');
      return;
    }
    this.#handlers?.message({ type: 'closed', message: reply.message ?? 'L’hôte a refusé la connexion.' });
  }

  /** Requête à l'hôte ; lève `HostUnreachable` si elle n'a pas pu partir ou rester sans réponse. */
  async #call(route: string, body: Record<string, unknown>): Promise<ApiResult> {
    const league = this.#league;
    const target = this.#hostPeer;
    if (!league || !target) throw new HostUnreachable();
    let raw: string;
    try {
      raw = await league.request.request(JSON.stringify({ route, body }), { target, timeoutMs: REQUEST_TIMEOUT_MS });
    } catch {
      throw new HostUnreachable();
    }
    try {
      const reply = JSON.parse(raw) as ApiResult;
      if (typeof reply === 'object' && reply !== null && typeof reply.ok === 'boolean') return reply;
    } catch {
      // Réponse illisible, traitée plus bas.
    }
    return { ok: false, message: 'Réponse illisible de l’hôte.' };
  }

  async request(route: string, body: Record<string, unknown>): Promise<ApiResult> {
    if (!this.#league || !this.#hostPeer) return { ok: false, message: 'Pas connecté à l’hôte : on se reconnecte, réessaie dans un instant.' };
    try {
      return await this.#call(route, body);
    } catch {
      return { ok: false, message: 'Hôte injoignable : il a peut-être fermé l’onglet. On se reconnecte.' };
    }
  }

  resync(): void {
    // Se présenter à nouveau fait renvoyer la partie en entier.
    if (this.#hostPeer) void this.#hello();
  }

  reconnect(): void {
    if (this.#closed || this.#opening || this.#hostPeer) return;
    if (this.#retryTimer) clearTimeout(this.#retryTimer);
    this.#retryTimer = null;
    this.#handlers?.status('connecting');
    void this.#open(retryDelay(this.#attempt));
  }

  #detach(): void {
    for (const unsubscribe of this.#unsubscribe.splice(0)) unsubscribe();
  }

  close(): void {
    this.#closed = true;
    if (this.#retryTimer) clearTimeout(this.#retryTimer);
    this.#retryTimer = null;
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.#onVisible);
      window.removeEventListener('online', this.#onOnline);
      window.removeEventListener('offline', this.#onOffline);
    }
    this.#detach();
    void this.#league?.room.leave();
    this.#league = null;
    this.#hostPeer = null;
    this.#handlers?.status('idle');
  }
}
