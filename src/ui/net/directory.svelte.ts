/**
 * Salle commune des serveurs publics (MULTI-13) : `DirectoryWatcher` écoute (page « Rejoindre »),
 * `DirectoryAnnouncer` annonce le serveur de l'hôte quand il l'ouvre au public.
 */
import type { MessageAction, Room } from 'trystero';
import { joinDirectoryRoom } from './p2p';
import { ANNOUNCE_EVERY_MS, applyAnnouncement, freshServers, readAnnouncement, type Announcement, type PublicServer } from './publicDirectory';

const ACTION = 'annonce';
/** La liste se nettoie des serveurs muets à ce rythme. */
const PRUNE_EVERY_MS = 5_000;

export class DirectoryWatcher {
  servers = $state.raw<PublicServer[]>([]);
  /** `searching` tant qu'aucun relais n'a répondu. */
  status = $state<'idle' | 'searching' | 'ready' | 'error'>('idle');
  #room: Room | null = null;
  #timer: ReturnType<typeof setInterval> | null = null;
  #stopped = false;

  async start(): Promise<void> {
    if (this.#room) return;
    this.#stopped = false;
    this.status = 'searching';
    let room: Room;
    try {
      room = await joinDirectoryRoom(false);
    } catch {
      this.status = 'error';
      return;
    }
    if (this.#stopped) {
      void room.leave();
      return;
    }
    this.#room = room;
    const action: MessageAction<string> = room.makeAction<string>(ACTION);
    action.onMessage((data, context) => {
      const entry = readAnnouncement(data, context.userId);
      if (entry) this.servers = freshServers(applyAnnouncement(this.servers, entry, Date.now()), Date.now());
    });
    void room.ready.then(() => {
      if (this.status === 'searching') this.status = 'ready';
    });
    this.#timer = setInterval(() => (this.servers = freshServers(this.servers, Date.now())), PRUNE_EVERY_MS);
  }

  stop(): void {
    this.#stopped = true;
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
    void this.#room?.leave();
    this.#room = null;
    this.servers = [];
    this.status = 'idle';
  }
}

export class DirectoryAnnouncer {
  #room: Room | null = null;
  #action: MessageAction<string> | null = null;
  #timer: ReturnType<typeof setInterval> | null = null;
  #current: Announcement | null = null;
  #starting: Promise<void> | null = null;

  /** Annonce (ou met à jour) le serveur ; la salle est rejointe au premier appel. */
  async announce(announcement: Announcement): Promise<void> {
    this.#current = announcement;
    this.#starting ??= this.#start();
    await this.#starting;
    void this.#action?.send(JSON.stringify(announcement));
  }

  async #start(): Promise<void> {
    const room = await joinDirectoryRoom(true);
    this.#room = room;
    const action = room.makeAction<string>(ACTION);
    this.#action = action;
    // Un nouveau venu reçoit l'annonce tout de suite, sans attendre le prochain rappel.
    room.onPeerJoin(({ peerId }) => {
      if (this.#current) void action.send(JSON.stringify(this.#current), { target: peerId });
    });
    this.#timer = setInterval(() => {
      if (this.#current) void action.send(JSON.stringify(this.#current));
    }, ANNOUNCE_EVERY_MS);
  }

  /** Retire le serveur de la liste et quitte la salle. */
  async withdraw(): Promise<void> {
    const current = this.#current;
    this.#current = null;
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
    if (this.#starting) await this.#starting.catch(() => {});
    if (current && this.#action) await this.#action.send(JSON.stringify({ withdraw: current.code })).catch(() => {});
    void this.#room?.leave();
    this.#room = null;
    this.#action = null;
    this.#starting = null;
  }
}
