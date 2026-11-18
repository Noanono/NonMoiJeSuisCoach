/**
 * Le navigateur de l'hôte devient le serveur de la ligue (MULTI-11) : il fait tourner `HostEngine`, garde
 * ses 3 ligues dans IndexedDB et reçoit les coachs en pair-à-pair, par le code qu'il leur a donné (MULTI-12).
 * Il peut ouvrir son serveur au public : il s'annonce alors dans l'annuaire (MULTI-13).
 *
 * Sécurité (MULTI-14) : chaque coach se présente avec son identifiant et son secret ; l'hôte n'accepte
 * d'actions que pour le coach ainsi prouvé, limite leur débit, et garde pour lui seul les actions d'hôte.
 */
import { GAME_VERSION } from '../../domain/game';
import { MAX_COACHES } from '../../domain/game/multiplayer';
import type { SlotInfo } from '../../server/hub';
import { HostEngine, isClientRoute, type Listener, type OpenLeague } from '../../server/hostEngine';
import { DirectoryAnnouncer } from './directory.svelte';
import { adoptIdentity, defaultCoachName, localCoachId, localCoachSecret } from './identity';
import { idbSlotStore, readSlotSecret, writeSlotSecret } from './idbSlotStore';
import { joinLeagueRoom, type LeagueRoom } from './p2p';
import { SERVER_NAME_MAX, type Announcement } from './publicDirectory';
import { formatCode, newSecret, roomIdOf, type ServerCode } from './serverCode';
import { parseServerMessage, type ApiResult, type Transport, type TransportHandlers } from './transport';

/** Navigateurs branchés en même temps au plus : les coachs, et quelques onglets en trop. */
const MAX_PEERS = MAX_COACHES + 5;
/** Débit par navigateur : rafale de 40 actions, puis 10 par seconde. */
const BURST = 40;
const REFILL_PER_SECOND = 10;
/** Essais de code de reprise par navigateur (le code a 6 chiffres) : pas de force brute. */
const MAX_CLAIM_TRIES = 5;
/** L'écran de l'hôte et l'annuaire se mettent à jour au plus à ce rythme. */
const REFRESH_MS = 1_000;
const COACH_ID = /^[\w-]{1,64}$/;
const HOST_ONLY_START = 'Seul l’hôte lance la ligue.';

interface Session {
  coachId: string | null;
  detach: (() => void) | null;
  tokens: number;
  refilledAt: number;
  claimTries: number;
}

export type HostStatus = 'off' | 'starting' | 'online' | 'error';

export class PeerHost {
  readonly engine = new HostEngine(idbSlotStore, { log: (message) => console.info(`[hôte] ${message}`) });
  slots = $state.raw<SlotInfo[]>([]);
  league = $state.raw<OpenLeague | null>(null);
  code = $state.raw<ServerCode | null>(null);
  status = $state<HostStatus>('off');
  error = $state<string | null>(null);
  /** Navigateurs d'amis connectés. */
  peers = $state(0);
  isPublic = $state(false);
  serverName = $state('');
  /** Nom de l'hôte dans l'annuaire, figé quand il ouvre au public. */
  #hostName = '';
  #room: LeagueRoom | null = null;
  readonly #sessions = new Map<string, Session>();
  readonly #announcer = new DirectoryAnnouncer();
  #refreshTimer: ReturnType<typeof setTimeout> | null = null;
  #unload: (() => void) | null = null;

  constructor() {
    this.engine.onChange = () => this.#scheduleRefresh();
  }

  get codeText(): string | null {
    return this.code ? formatCode(this.code) : null;
  }

  async refreshSlots(): Promise<void> {
    try {
      this.slots = await this.engine.slots();
    } catch {
      this.error = 'Stockage du navigateur indisponible : impossible d’héberger ici.';
    }
  }

  /** Ouvre (ou crée) une ligue et met le serveur en ligne avec le code de cet emplacement. */
  async open(slot: number): Promise<ApiResult> {
    this.error = null;
    if (slot === this.engine.activeSlot && this.#room) return { ok: true };
    this.status = 'starting';
    const result = await this.engine.open(slot);
    if (!result.ok) {
      this.status = this.#room ? 'online' : 'off';
      this.error = result.message;
      return result;
    }
    let secret = await readSlotSecret(slot);
    if (!secret) {
      secret = newSecret();
      await writeSlotSecret(slot, secret);
    }
    try {
      await this.#openRoom(secret);
    } catch {
      this.status = 'error';
      this.error = 'Impossible de joindre les relais de mise en relation. Vérifie ta connexion.';
      return { ok: false, message: this.error };
    }
    this.engine.startClock();
    this.#guardUnload();
    this.#refresh();
    await this.refreshSlots();
    return result;
  }

  /** Nouveau code : les anciens ne mènent plus nulle part, les amis connectés sont déconnectés. */
  async renewCode(): Promise<void> {
    const slot = this.engine.activeSlot;
    if (slot === null) return;
    const secret = newSecret();
    await writeSlotSecret(slot, secret);
    await this.#withdraw();
    await this.#openRoom(secret);
    this.#refresh();
  }

  /** Arrête le serveur : ligue sauvegardée, amis renvoyés à l'accueil. */
  async stop(): Promise<void> {
    await this.#withdraw();
    await this.engine.close('L’hôte a arrêté le serveur.');
    this.engine.stopClock();
    await this.#leaveRoom();
    this.code = null;
    this.status = 'off';
    this.#unload?.();
    this.#unload = null;
    this.#refresh();
    await this.refreshSlots();
  }

  async remove(slot: number): Promise<ApiResult> {
    const result = await this.engine.remove(slot);
    await this.refreshSlots();
    return result;
  }

  createClaimCode(coachId: string): ApiResult {
    return this.engine.createClaimCode(coachId);
  }

  /** Ouvre le serveur au public (annuaire) ou le referme aux seuls détenteurs du code. */
  async setPublic(open: boolean, name: string): Promise<void> {
    this.serverName = name.trim().slice(0, SERVER_NAME_MAX);
    this.#hostName = defaultCoachName();
    this.isPublic = open;
    if (open) await this.#announce();
    else await this.#announcer.withdraw();
  }

  // --- Salle pair-à-pair --------------------------------------------------------------

  async #openRoom(secret: string): Promise<void> {
    await this.#leaveRoom();
    const league = await joinLeagueRoom({ roomId: await roomIdOf(secret), password: secret, host: true });
    this.#room = league;
    const self = await league.room.getSelf();
    this.code = { secret, hostId: self.userId };
    league.room.onPeerJoin(() => this.#countPeers());
    league.room.onPeerLeave(({ peerId }) => {
      this.#sessions.get(peerId)?.detach?.();
      this.#sessions.delete(peerId);
      this.#countPeers();
    });
    league.request.onRequest(async (raw, context) => JSON.stringify(await this.#onRequest(context.peerId, raw)));
    this.status = 'online';
  }

  async #leaveRoom(): Promise<void> {
    for (const session of this.#sessions.values()) session.detach?.();
    this.#sessions.clear();
    const room = this.#room;
    this.#room = null;
    this.peers = 0;
    await room?.room.leave().catch(() => {});
  }

  #countPeers(): void {
    this.peers = this.#room ? Object.keys(this.#room.room.getPeers()).length : 0;
  }

  async #onRequest(peerId: string, raw: unknown): Promise<ApiResult> {
    let session = this.#sessions.get(peerId);
    if (!session) {
      if (this.#sessions.size >= MAX_PEERS) return { ok: false, message: 'Serveur complet.' };
      session = { coachId: null, detach: null, tokens: BURST, refilledAt: Date.now(), claimTries: 0 };
      this.#sessions.set(peerId, session);
    }
    if (!this.#spend(session)) return { ok: false, message: 'Doucement : trop d’actions d’un coup.' };
    let request: { route?: unknown; body?: unknown };
    try {
      request = JSON.parse(typeof raw === 'string' ? raw : '') as typeof request;
    } catch {
      return { ok: false, message: 'Requête illisible.' };
    }
    const body = typeof request?.body === 'object' && request.body !== null && !Array.isArray(request.body) ? (request.body as Record<string, unknown>) : null;
    if (!body) return { ok: false, message: 'Requête invalide.' };
    const route = request.route;
    if (route === 'hello') return this.#hello(peerId, session, body);
    if (route === 'claim') {
      session.claimTries += 1;
      if (session.claimTries > MAX_CLAIM_TRIES) return { ok: false, message: 'Trop d’essais : demande un nouveau code à l’hôte, puis reconnecte-toi.' };
      const result = await this.engine.claim(typeof body.code === 'string' ? body.code : '');
      if (result.ok) this.engine.kick(result.value.coachId, 'Ton club a été repris dans un autre navigateur.');
      return result;
    }
    if (!isClientRoute(route)) return { ok: false, message: 'Action inconnue.' };
    if (!session.coachId) return { ok: false, message: 'Présente-toi d’abord à l’hôte.' };
    if (route === 'start') return { ok: false, message: HOST_ONLY_START };
    return this.engine.handle(route, session.coachId, body);
  }

  /** Un coach se présente : version du jeu, puis preuve de son identité. Ensuite seulement il reçoit la ligue. */
  async #hello(peerId: string, session: Session, body: Record<string, unknown>): Promise<ApiResult> {
    if (body.version !== GAME_VERSION) return { ok: false, message: 'Ta version du jeu n’est pas celle de l’hôte : recharge la page (Ctrl+Maj+R), et demande-lui d’en faire autant.' };
    const coachId = typeof body.coachId === 'string' && COACH_ID.test(body.coachId) ? body.coachId : null;
    const secret = typeof body.secret === 'string' ? body.secret : '';
    if (!coachId) return { ok: false, message: 'Identité invalide.' };
    const auth = await this.engine.authenticate(coachId, secret);
    if (!auth.ok) return auth;
    const room = this.#room;
    if (!room) return { ok: false, message: 'Serveur arrêté.' };
    session.detach?.();
    const listener: Listener = {
      coachId,
      send: (payload) => void room.message.send(payload, { target: peerId }).catch(() => {}),
      close: () => {
        session.detach?.();
        session.detach = null;
        session.coachId = null;
      },
    };
    session.coachId = coachId;
    session.detach = this.engine.attach(listener);
    return { ok: true };
  }

  #spend(session: Session): boolean {
    const now = Date.now();
    session.tokens = Math.min(BURST, session.tokens + ((now - session.refilledAt) / 1000) * REFILL_PER_SECOND);
    session.refilledAt = now;
    if (session.tokens < 1) return false;
    session.tokens -= 1;
    return true;
  }

  // --- Écran de l'hôte et annuaire ------------------------------------------------------

  #scheduleRefresh(): void {
    this.#refreshTimer ??= setTimeout(() => {
      this.#refreshTimer = null;
      this.#refresh();
    }, REFRESH_MS);
  }

  #refresh(): void {
    this.league = this.engine.league();
    if (this.isPublic) void this.#announce();
  }

  async #announce(): Promise<void> {
    const league = this.engine.league();
    if (!league || !this.code) return;
    const announcement: Announcement = {
      code: formatCode(this.code),
      name: this.serverName || `Ligue de ${this.#hostName || 'l’hôte'}`,
      hostName: this.#hostName,
      coaches: league.coaches.length,
      max: MAX_COACHES,
      phase: league.phase,
      season: league.season,
      week: league.week,
      version: GAME_VERSION,
    };
    await this.#announcer.announce(announcement).catch(() => {
      this.error = 'Annuaire public injoignable pour l’instant : ton code marche toujours.';
    });
  }

  async #withdraw(): Promise<void> {
    if (this.isPublic) await this.#announcer.withdraw();
  }

  /** Fermer l'onglet arrête le serveur : on prévient, et on sauvegarde au départ. */
  #guardUnload(): void {
    if (this.#unload || typeof window === 'undefined') return;
    const warn = (event: BeforeUnloadEvent) => {
      if (this.status === 'online') event.preventDefault();
    };
    const save = () => void this.engine.flush();
    window.addEventListener('beforeunload', warn);
    window.addEventListener('pagehide', save);
    this.#unload = () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('pagehide', save);
    };
  }

  // --- L'hôte joue aussi ------------------------------------------------------------------

  /** Transport de l'hôte vers son propre moteur, sans réseau. */
  loopback(): Transport {
    return new LoopbackTransport(this.engine);
  }
}

class LoopbackTransport implements Transport {
  readonly host = true;
  readonly #engine: HostEngine;
  readonly #coachId = localCoachId();
  readonly #secret = localCoachSecret();
  #handlers: TransportHandlers | null = null;
  #detach: (() => void) | null = null;

  constructor(engine: HostEngine) {
    this.#engine = engine;
  }

  connect(handlers: TransportHandlers): void {
    this.#handlers = handlers;
    handlers.status('connecting');
    void this.#attach();
  }

  async #attach(): Promise<void> {
    const handlers = this.#handlers;
    if (!handlers) return;
    // L'hôte enregistre aussi son secret : personne ne pourra prendre son club depuis un autre navigateur.
    const auth = await this.#engine.authenticate(this.#coachId, this.#secret);
    if (!auth.ok) {
      handlers.message({ type: 'closed', message: auth.message });
      return;
    }
    this.#detach?.();
    this.#detach = this.#engine.attach({
      coachId: this.#coachId,
      send: (payload) => {
        const message = parseServerMessage(payload);
        if (message) queueMicrotask(() => this.#handlers?.message(message));
      },
      close: () => {
        this.#detach = null;
      },
    });
    handlers.status('online');
  }

  async request(route: string, body: Record<string, unknown>): Promise<ApiResult> {
    if (route === 'claim') {
      const result = await this.#engine.claim(typeof body.code === 'string' ? body.code : '');
      if (result.ok) {
        this.#engine.kick(result.value.coachId, 'Ton club a été repris dans un autre navigateur.');
        adoptIdentity(result.value);
      }
      return result;
    }
    if (!isClientRoute(route)) return { ok: false, message: 'Action inconnue.' };
    return this.#engine.handle(route, this.#coachId, body);
  }

  resync(): void {
    this.#detach?.();
    this.#detach = null;
    void this.#attach();
  }

  close(): void {
    this.#detach?.();
    this.#detach = null;
    this.#handlers?.status('idle');
    this.#handlers = null;
  }
}

/** Un seul serveur par onglet : il survit aux allers-retours entre l'accueil et la partie de l'hôte. */
export const peerHost = new PeerHost();
