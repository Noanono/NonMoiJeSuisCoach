/**
 * Moteur de l'hôte de la ligue entre amis (MULTI-01 à MULTI-14), sans réseau ni disque : il garde la ligue
 * ouverte, ses 3 emplacements, diffuse la partie à chaque coach (en entier puis par différences, C8), fait
 * tourner l'horloge des matchs en direct (MULTI-07) et distribue les codes de reprise (C10).
 *
 * Deux adaptateurs le branchent au monde :
 * - le navigateur de l'hôte, en pair-à-pair (`src/ui/net/peerHost.svelte.ts`, MULTI-11) ;
 * - le serveur Node du réseau local (`src/server/main.ts`), obsolète.
 */
import { MultiplayerHub, summarizeLeague, type CoachPresence, type HubResult, type HubSnapshot, type LeagueSummary, type SlotInfo } from './hub';
import { diffParts, partsToJson, type Parts } from './patch';
import { randomHex, randomInt, sameDigest, sha256Hex } from './secure';

/** Emplacements de ligue de l'hôte, comme les vestiaires du solo (MULTI-09). */
export const SLOTS = [1, 2, 3] as const;

/** Où l'hôte range ses ligues : fichiers du PC (Node) ou IndexedDB (navigateur). */
export interface SlotStore {
  read(slot: number): Promise<HubSnapshot | null>;
  write(slot: number, snapshot: HubSnapshot): Promise<void>;
  /** Range la ligue de côté (corbeille) : rien n'est effacé pour de bon. */
  trash(slot: number): Promise<void>;
  savedAt(slot: number): Promise<number | null>;
}

/** Un navigateur branché sur la ligue : il reçoit des messages déjà sérialisés. */
export interface Listener {
  readonly coachId: string | null;
  send(payload: string): void;
  close(): void;
}

interface Tracked {
  /** Ce que ce navigateur a déjà reçu de la partie : la suite ne lui envoie que la différence (C8). */
  parts?: Parts;
  coaches?: string;
}

/** Actions qu'un coach peut demander à l'hôte. */
export const CLIENT_ROUTES = ['join', 'start', 'command', 'ready', 'duel/join', 'duel/command'] as const;
export type ClientRoute = (typeof CLIENT_ROUTES)[number];

export function isClientRoute(route: unknown): route is ClientRoute {
  return typeof route === 'string' && (CLIENT_ROUTES as readonly string[]).includes(route);
}

/** Ligue ouverte telle que l'accueil la montre, coachs en ligne compris. */
export type OpenLeague = Omit<LeagueSummary, 'coaches'> & { slot: number; coaches: CoachPresence[] };

export interface HostEngineOptions {
  log?: (message: string) => void;
  /** Délai de sauvegarde après un changement (regroupe les écritures). */
  saveDelayMs?: number;
}

const DEFAULT_SAVE_DELAY_MS = 500;
/** Horloge des matchs en direct (×1 imposé) : l'hôte fait avancer chaque match. */
export const DUEL_CLOCK_MS = 200;
/** Un match en direct qui avance est enregistré avec la ligue, toutes les dix secondes au plus (C9). */
const DUEL_SAVE_EVERY_MS = 10_000;
/** Un code de reprise vaut dix minutes, une seule fois (C10). */
const CLAIM_CODE_MS = 10 * 60 * 1000;
/** Longueur du secret d'un coach : 32 octets. */
const SECRET_BYTES = 32;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

export class HostEngine {
  #hub: MultiplayerHub | null = null;
  #slot: number | null = null;
  readonly #listeners = new Map<Listener, Tracked>();
  readonly #claimCodes = new Map<string, { coachId: string; until: number }>();
  readonly #store: SlotStore;
  readonly #log: (message: string) => void;
  readonly #saveDelayMs: number;
  #saveTimer: ReturnType<typeof setTimeout> | null = null;
  #saving: Promise<void> = Promise.resolve();
  #clock: ReturnType<typeof setInterval> | null = null;
  #lastDuelSave = 0;
  /** Appelé après chaque changement visible de l'extérieur (coachs, phase) : annuaire public, écran de l'hôte. */
  onChange: (() => void) | null = null;

  constructor(store: SlotStore, options: HostEngineOptions = {}) {
    this.#store = store;
    this.#log = options.log ?? (() => {});
    this.#saveDelayMs = options.saveDelayMs ?? DEFAULT_SAVE_DELAY_MS;
  }

  get hub(): MultiplayerHub | null {
    return this.#hub;
  }

  get activeSlot(): number | null {
    return this.#slot;
  }

  /** Ligue ouverte, résumée ; `null` si l'hôte n'en a pas ouvert. */
  league(): OpenLeague | null {
    const hub = this.#hub;
    if (!hub || this.#slot === null) return null;
    return { slot: this.#slot, ...summarizeLeague(hub.save()), coaches: hub.presence() };
  }

  // --- Emplacements -----------------------------------------------------------------

  async slots(): Promise<SlotInfo[]> {
    return Promise.all(SLOTS.map((slot) => this.#slotInfo(slot)));
  }

  async #slotInfo(slot: number): Promise<SlotInfo> {
    const active = slot === this.#slot;
    try {
      const snapshot = active && this.#hub ? this.#hub.save() : await this.#store.read(slot);
      if (!snapshot) return { slot, status: 'empty', active, savedAt: null, league: null };
      return { slot, status: 'ok', active, savedAt: await this.#store.savedAt(slot), league: summarizeLeague(snapshot) };
    } catch {
      return { slot, status: 'error', active, savedAt: null, league: null };
    }
  }

  /** L'hôte ouvre une ligue (la reprend, ou en crée une neuve) ; les joueurs de l'ancienne reviennent à l'accueil. */
  async open(slot: number): Promise<HubResult<{ slot: number; created: boolean }>> {
    if (!SLOTS.includes(slot as (typeof SLOTS)[number])) return { ok: false, message: 'Emplacement inconnu.' };
    if (slot === this.#slot) return { ok: true, value: { slot, created: false } };
    let snapshot: HubSnapshot | null;
    let hub: MultiplayerHub;
    try {
      snapshot = await this.#store.read(slot);
      hub = snapshot ? new MultiplayerHub(snapshot) : MultiplayerHub.create(randomInt(0, 2 ** 31 - 1));
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Sauvegarde illisible : supprime-la pour libérer la place.' };
    }
    await this.close('L’hôte a ouvert une autre ligue.');
    this.#hub = hub;
    this.#slot = slot;
    if (!snapshot) await this.#write();
    const message = snapshot ? `Ligue ${slot} reprise.` : `Ligue ${slot} créée : salle d’attente ouverte.`;
    this.#log(message);
    this.onChange?.();
    return { ok: true, value: { slot, created: !snapshot }, message };
  }

  async remove(slot: number): Promise<HubResult<null>> {
    if (slot === this.#slot) return { ok: false, message: 'Cette ligue est ouverte : ferme-la avant de la supprimer.' };
    if ((await this.#store.read(slot).catch(() => 'illisible')) === null) return { ok: false, message: 'Emplacement déjà vide.' };
    await this.#store.trash(slot);
    return { ok: true, value: null, message: `Ligue ${slot} rangée à la corbeille.` };
  }

  /** Ferme la ligue ouverte (sauvegardée) : chacun revient à l'accueil. */
  async close(message: string): Promise<void> {
    await this.flush();
    const listeners = [...this.#listeners.keys()];
    this.#listeners.clear();
    for (const listener of listeners) {
      listener.send(JSON.stringify({ type: 'closed', message }));
      listener.close();
    }
    this.#claimCodes.clear();
    this.#hub = null;
    this.#slot = null;
    this.onChange?.();
  }

  // --- Sauvegarde -------------------------------------------------------------------

  #write(): Promise<void> {
    const hub = this.#hub;
    const slot = this.#slot;
    if (!hub || slot === null) return this.#saving;
    // Les écritures s'enchaînent : jamais deux en même temps sur le même emplacement.
    this.#saving = this.#saving.then(() => this.#store.write(slot, hub.save())).catch((error: unknown) => {
      this.#log(`Sauvegarde impossible : ${error instanceof Error ? error.message : String(error)}`);
    });
    return this.#saving;
  }

  #scheduleSave(): void {
    if (this.#saveTimer) return;
    this.#saveTimer = setTimeout(() => {
      this.#saveTimer = null;
      void this.#write();
    }, this.#saveDelayMs);
  }

  /** Écrit tout de suite la ligue ouverte (avant d'en changer ou d'arrêter). */
  async flush(): Promise<void> {
    if (this.#saveTimer) clearTimeout(this.#saveTimer);
    this.#saveTimer = null;
    await this.#write();
  }

  // --- Diffusion --------------------------------------------------------------------

  /**
   * Branche un navigateur. Rend la fonction qui le débranche. Sans ligue ouverte, il est refusé
   * tout de suite (message `closed`).
   */
  attach(listener: Listener): () => void {
    const hub = this.#hub;
    if (!hub) {
      listener.send(JSON.stringify({ type: 'closed', message: 'L’hôte n’a pas encore ouvert de ligue.' }));
      listener.close();
      return () => {};
    }
    this.#listeners.set(listener, {});
    const coachId = listener.coachId;
    if (coachId) hub.connect(coachId);
    // Retour dans un match en cours (onglet rechargé) : il reçoit l'état du match tout de suite.
    const duel = coachId ? hub.duelMessageFor(coachId, Date.now()) : null;
    if (duel) setTimeout(() => listener.send(duel), 0);
    // Les autres voient le coach passer en ligne ; lui reçoit son état complet.
    this.broadcast();
    let attached = true;
    return () => {
      if (!attached) return;
      attached = false;
      if (!this.#listeners.delete(listener)) return;
      if (coachId && this.#hub === hub) hub.disconnect(coachId);
      this.broadcast();
    };
  }

  /** Chaque coach reçoit la partie de son point de vue : en entier la première fois, puis seulement ce qui change (C8). */
  broadcast(): void {
    const hub = this.#hub;
    if (!hub) return;
    const views = new Map<string | null, ReturnType<MultiplayerHub['gamePartsFor']>>();
    const lobby = new Map<string | null, string>();
    for (const [listener, tracked] of this.#listeners) {
      const id = listener.coachId;
      if (!views.has(id)) views.set(id, hub.gamePartsFor(id));
      const view = views.get(id)!;
      if (!view) {
        if (!lobby.has(id)) lobby.set(id, hub.messageFor(id));
        tracked.parts = undefined;
        listener.send(lobby.get(id)!);
        continue;
      }
      const coaches = JSON.stringify(view.coaches);
      const you = JSON.stringify(id);
      if (!tracked.parts) {
        listener.send(`{"type":"game","you":${you},"coaches":${coaches},"game":${partsToJson(view.parts)}}`);
      } else {
        const patch = diffParts(tracked.parts, view.parts);
        if (patch !== null || coaches !== tracked.coaches) listener.send(`{"type":"gamePatch","you":${you},"coaches":${coaches},"patch":${patch ?? '{"set":{},"remove":[]}'}}`);
      }
      tracked.parts = view.parts;
      tracked.coaches = coaches;
    }
    this.#scheduleSave();
    this.onChange?.();
  }

  /** Match en direct : seuls ses deux coachs reçoivent l'état, plusieurs fois par seconde si besoin. */
  #broadcastDuel(coachIds: readonly string[]): void {
    const hub = this.#hub;
    if (!hub) return;
    const now = Date.now();
    for (const listener of this.#listeners.keys()) {
      if (!listener.coachId || !coachIds.includes(listener.coachId)) continue;
      const message = hub.duelMessageFor(listener.coachId, now);
      if (message) listener.send(message);
    }
  }

  /** Un pas de l'horloge des matchs en direct. */
  tick(now: number): void {
    const hub = this.#hub;
    if (!hub) return;
    const { changed, gameChanged } = hub.advanceDuels(now);
    for (const key of changed) this.#broadcastDuel(hub.duelCoaches(key));
    if (gameChanged) this.broadcast();
    else if (changed.length > 0 && now - this.#lastDuelSave >= DUEL_SAVE_EVERY_MS) {
      this.#lastDuelSave = now;
      this.#scheduleSave();
    }
  }

  startClock(): void {
    this.#clock ??= setInterval(() => this.tick(Date.now()), DUEL_CLOCK_MS);
  }

  stopClock(): void {
    if (this.#clock) clearInterval(this.#clock);
    this.#clock = null;
  }

  // --- Actions des coachs -------------------------------------------------------------

  /** Action d'un coach déjà identifié par l'adaptateur. La partie est rediffusée si elle a changé. */
  handle(route: ClientRoute, coachId: string, body: Record<string, unknown>): HubResult {
    const hub = this.#hub;
    if (!hub) return { ok: false, message: 'L’hôte n’a pas encore ouvert de ligue.' };
    if (route === 'duel/join' || route === 'duel/command') {
      const now = Date.now();
      const duel = route === 'duel/join' ? hub.joinDuel(coachId, now) : hub.duelCommand(coachId, body.name, body.args, now);
      if (duel.ok) this.#broadcastDuel(hub.duelCoaches(duel.value.key));
      return duel;
    }
    let result: HubResult;
    switch (route) {
      case 'join':
        result = hub.join({ id: coachId, name: text(body.name), clubName: text(body.clubName) });
        break;
      case 'start':
        result = hub.start(coachId);
        break;
      case 'command':
        result = hub.command(coachId, body.name, body.args);
        break;
      case 'ready':
        result = hub.setReady(coachId, body.ready === true);
        break;
    }
    if (result.ok) this.broadcast();
    if (result.ok && result.message) this.#log(result.message);
    return result;
  }

  // --- Identité des coachs en pair-à-pair (MULTI-14) ------------------------------------

  /**
   * Vérifie qu'un navigateur est bien le coach qu'il prétend être. Un nouveau coach enregistre son secret
   * au premier contact ; un coach déjà inscrit doit présenter le même (sinon : code de reprise).
   */
  async authenticate(coachId: string, secret: string): Promise<HubResult<null>> {
    const hub = this.#hub;
    if (!hub) return { ok: false, message: 'L’hôte n’a pas encore ouvert de ligue.' };
    if (secret.length < 32) return { ok: false, message: 'Identité invalide.' };
    const digest = await sha256Hex(secret);
    const known = hub.secretHash(coachId);
    if (known) return sameDigest(known, digest) ? { ok: true, value: null } : { ok: false, message: 'Ce club appartient à un autre coach. Demande un code de reprise à l’hôte.' };
    if (hub.isSignedUp(coachId)) return { ok: false, message: 'Ce club est déjà dans la ligue : demande un code de reprise à l’hôte.' };
    hub.setSecretHash(coachId, digest);
    return { ok: true, value: null };
  }

  // --- Reprise d'un coach dans un autre navigateur (C10) --------------------------------

  /** L'hôte donne un code à un ami : il le tape dans son navigateur et retrouve son club. */
  createClaimCode(coachId: string): HubResult<{ code: string }> {
    const coach = this.#hub?.presence().find((entry) => entry.id === coachId);
    if (!coach) return { ok: false, message: 'Coach introuvable dans la ligue ouverte.' };
    const now = Date.now();
    for (const [code, entry] of this.#claimCodes) if (entry.until < now || entry.coachId === coachId) this.#claimCodes.delete(code);
    let code = '';
    do code = String(randomInt(100000, 999999));
    while (this.#claimCodes.has(code));
    this.#claimCodes.set(code, { coachId, until: now + CLAIM_CODE_MS });
    return { ok: true, value: { code }, message: `Code de reprise pour ${coach.name} : ${code} (valable dix minutes).` };
  }

  /** Le code ouvre le club : le navigateur reçoit l'identité du coach et un nouveau secret (l'ancien ne vaut plus rien). */
  async claim(code: string): Promise<HubResult<{ coachId: string; name: string; clubName: string; secret: string }>> {
    const entry = this.#claimCodes.get(code.trim());
    if (!entry || entry.until < Date.now()) return { ok: false, message: 'Code inconnu ou expiré : demande-en un nouveau à l’hôte.' };
    this.#claimCodes.delete(code.trim());
    const hub = this.#hub;
    const coach = hub?.presence().find((candidate) => candidate.id === entry.coachId);
    if (!hub || !coach) return { ok: false, message: 'Ce coach n’est plus dans la ligue ouverte.' };
    const secret = randomHex(SECRET_BYTES);
    hub.setSecretHash(coach.id, await sha256Hex(secret));
    this.#scheduleSave();
    const message = `Bon retour, ${coach.name} !`;
    this.#log(message);
    return { ok: true, value: { coachId: coach.id, name: coach.name, clubName: coach.clubName, secret }, message };
  }

  /** Débranche les navigateurs d'un coach (son club vient d'être repris ailleurs). */
  kick(coachId: string, message: string): void {
    for (const listener of [...this.#listeners.keys()]) {
      if (listener.coachId !== coachId) continue;
      listener.send(JSON.stringify({ type: 'closed', message }));
      listener.close();
    }
  }
}
