/**
 * Connexion au serveur de la ligue entre amis (MULTI-01 à MULTI-05). Le serveur sert aussi le jeu :
 * on lui parle à la même adresse. Il pousse la partie en direct (Server-Sent Events) ; on lui envoie
 * les commandes en POST.
 */
import type { CoachPresence, ServerMessage } from '../server/hub';
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
function coachId(): string {
  try {
    const existing = localStorage.getItem(COACH_ID_KEY);
    if (existing) return existing;
    const created = `coach-${crypto.randomUUID()}`;
    localStorage.setItem(COACH_ID_KEY, created);
    return created;
  } catch {
    return `coach-${Math.random().toString(36).slice(2)}`;
  }
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
  readonly id = coachId();
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

  constructor(onGame: (game: GameState) => void, onDuel: (match: MatchState, view: DuelView) => void) {
    this.#onGame = onGame;
    this.#onDuel = onDuel;
  }

  get me(): CoachPresence | undefined {
    return this.coaches.find((coach) => coach.id === this.id);
  }

  /** Le serveur de la ligue répond-il à cette adresse ? */
  static async available(): Promise<boolean> {
    try {
      const response = await fetch('/api/info', { cache: 'no-store' });
      return response.ok && (response.headers.get('content-type') ?? '').includes('json');
    } catch {
      return false;
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
