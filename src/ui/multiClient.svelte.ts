/**
 * Connexion au serveur de la ligue entre amis (MULTI-01 à MULTI-05). Le serveur sert aussi le jeu :
 * on lui parle à la même adresse. Il pousse la partie en direct (Server-Sent Events) ; on lui envoie
 * les commandes en POST.
 */
import type { CoachPresence, ServerInfo, ServerMessage, SlotInfo } from '../server/hub';
import type { DuelView } from '../server/duel';
import type { GameState } from '../domain/game';
import type { MatchState } from '../domain/match';

const COACH_ID_KEY = 'nmjsc-coach-id';
const PROFILE_KEY = 'nmjsc-coach-profile';

export type ConnectionStatus = 'idle' | 'connecting' | 'online' | 'offline';

export interface CoachProfile {
  name: string;
  clubName: string;
}

interface ApiResult {
  ok: boolean;
  message?: string;
  value?: unknown;
}

/** Identifiant du coach dans ce navigateur : il retrouve son club en revenant. */
export function localCoachId(): string {
  try {
    const existing = localStorage.getItem(COACH_ID_KEY);
    if (existing) return existing;
    const created = `coach-${randomToken()}`;
    localStorage.setItem(COACH_ID_KEY, created);
    return created;
  } catch {
    // Pas de stockage (navigation privée) : identité le temps de la session.
    sessionId ??= `coach-${randomToken()}`;
    return sessionId;
  }
}

let sessionId: string | null = null;

/**
 * Jeton aléatoire. Pas de `crypto.randomUUID` : il n'existe qu'en contexte sécurisé (localhost, https),
 * or les amis de l'hôte ouvrent le jeu par l'adresse réseau du PC, en http.
 */
function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function savedProfile(): CoachProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw) as CoachProfile;
  } catch {
    // Profil illisible : on repart de zéro.
  }
  return { name: '', clubName: '' };
}

export class MultiClient {
  readonly id = localCoachId();
  status = $state<ConnectionStatus>('idle');
  phase = $state<'lobby' | 'playing'>('lobby');
  /** Inscrit dans la ligue (salle d'attente ou partie). */
  joined = $state(false);
  coaches = $state<CoachPresence[]>([]);
  /** Match en direct contre un autre coach (MULTI-07), et l'instant où on l'a reçu (comptes à rebours). */
  duel = $state.raw<DuelView | null>(null);
  duelReceivedAt = $state(0);
  #source: EventSource | null = null;
  readonly #onGame: (game: GameState) => void;
  readonly #onDuel: (match: MatchState, view: DuelView) => void;
  readonly #onClosed: (message: string) => void;

  constructor(onGame: (game: GameState) => void, onDuel: (match: MatchState, view: DuelView) => void, onClosed: (message: string) => void) {
    this.#onGame = onGame;
    this.#onDuel = onDuel;
    this.#onClosed = onClosed;
  }

  get me(): CoachPresence | undefined {
    return this.coaches.find((coach) => coach.id === this.id);
  }

  /** Serveur de ligue à cette adresse, et la ligue qu'il a ouverte ; `null` sans serveur (MULTI-09). */
  static async serverInfo(): Promise<ServerInfo | null> {
    try {
      const response = await fetch('/api/info', { cache: 'no-store' });
      if (!response.ok || !(response.headers.get('content-type') ?? '').includes('json')) return null;
      return (await response.json()) as ServerInfo;
    } catch {
      return null;
    }
  }

  /** Les 3 emplacements de ligue de l'hôte. */
  static async hostSlots(): Promise<SlotInfo[]> {
    try {
      const response = await fetch('/api/host/slots', { cache: 'no-store' });
      return response.ok ? ((await response.json()) as { slots: SlotInfo[] }).slots : [];
    } catch {
      return [];
    }
  }

  /** L'hôte ouvre (reprend ou crée) une ligue, ou en range une à la corbeille. */
  static async hostAction(action: 'open' | 'delete', slot: number): Promise<ApiResult> {
    try {
      const response = await fetch(`/api/host/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot }) });
      return (await response.json()) as ApiResult;
    } catch {
      return { ok: false, message: 'Serveur injoignable.' };
    }
  }

  connect(): void {
    if (this.#source) return;
    this.status = 'connecting';
    const source = new EventSource(`/api/events?coach=${encodeURIComponent(this.id)}`);
    source.onopen = () => (this.status = 'online');
    source.onerror = () => (this.status = source.readyState === EventSource.CLOSED ? 'offline' : 'connecting');
    source.onmessage = (event) => this.#receive(JSON.parse(event.data as string) as ServerMessage);
    this.#source = source;
  }

  disconnect(): void {
    this.#source?.close();
    this.#source = null;
    this.status = 'idle';
  }

  async join(profile: CoachProfile): Promise<ApiResult> {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Pas de stockage : on redemandera le nom la prochaine fois.
    }
    return this.#post('join', { name: profile.name, clubName: profile.clubName });
  }

  start(): Promise<ApiResult> {
    return this.#post('start', {});
  }

  command(name: string, args: unknown[]): Promise<ApiResult> {
    return this.#post('command', { name, args });
  }

  setReady(ready: boolean): Promise<ApiResult> {
    return this.#post('ready', { ready });
  }

  /** Entre dans son match contre un autre coach : le coup d'envoi attend les deux. */
  joinDuel(): Promise<ApiResult> {
    return this.#post('duel/join', {});
  }

  duelCommand(name: string, args: unknown[] = []): Promise<ApiResult> {
    return this.#post('duel/command', { name, args });
  }

  #receive(message: ServerMessage): void {
    if (message.type === 'notice') return;
    if (message.type === 'closed') {
      this.disconnect();
      this.#onClosed(message.message);
      return;
    }
    if (message.type === 'duel') {
      this.duel = message.view;
      this.duelReceivedAt = Date.now();
      this.#onDuel(message.match, message.view);
      return;
    }
    this.coaches = message.coaches;
    if (message.type === 'lobby') {
      this.phase = message.phase;
      this.joined = message.you !== null;
      return;
    }
    this.phase = 'playing';
    this.joined = true;
    this.#onGame(message.game);
  }

  async #post(route: string, body: Record<string, unknown>): Promise<ApiResult> {
    try {
      const response = await fetch(`/api/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach: this.id, ...body }),
      });
      return (await response.json()) as ApiResult;
    } catch {
      return { ok: false, message: 'Serveur injoignable. L’hôte a peut-être éteint son PC.' };
    }
  }
}
