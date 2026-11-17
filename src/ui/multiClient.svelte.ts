/**
 * Connexion du coach à la ligue entre amis (MULTI-01 à MULTI-05). Le chemin vers l'hôte (pair-à-pair,
 * lui-même, ou serveur du réseau local obsolète) est un `Transport` : l'hôte pousse la partie en direct,
 * le coach lui envoie ses actions.
 */
import type { CoachPresence, ServerInfo, ServerMessage, SlotInfo } from '../server/hub';
import type { DuelView } from '../server/duel';
import { applyPatch } from '../server/patch';
import type { GameState } from '../domain/game';
import type { MatchState } from '../domain/match';
import { adoptIdentity, localCoachId, saveProfile, type CoachProfile } from './net/identity';
import type { ApiResult, ConnectionStatus, Transport } from './net/transport';

export { localCoachId, savedProfile, type CoachProfile } from './net/identity';
export type { ConnectionStatus } from './net/transport';

/** @deprecated Serveur Node du réseau local : appels réservés à l'accueil (MULTI-09). */
export const lanServer = {
  /** Serveur de ligue à cette adresse, et la ligue qu'il a ouverte ; `null` sans serveur (le cas sur Netlify). */
  async info(): Promise<ServerInfo | null> {
    try {
      const response = await fetch('/api/info', { cache: 'no-store' });
      if (!response.ok || !(response.headers.get('content-type') ?? '').includes('json')) return null;
      return (await response.json()) as ServerInfo;
    } catch {
      return null;
    }
  },

  /** Les 3 emplacements de ligue de l'hôte. */
  async slots(): Promise<SlotInfo[]> {
    try {
      const response = await fetch('/api/host/slots', { cache: 'no-store' });
      return response.ok ? ((await response.json()) as { slots: SlotInfo[] }).slots : [];
    } catch {
      return [];
    }
  },

  /** L'hôte ouvre (reprend ou crée) une ligue, ou en range une à la corbeille. */
  async hostAction(action: 'open' | 'delete', slot: number): Promise<ApiResult> {
    return post(`/api/host/${action}`, { slot });
  },

  /** L'hôte demande un code de reprise pour un coach (C10). */
  async claimCode(coachId: string): Promise<ApiResult> {
    return post('/api/host/claim-code', { coachId });
  },

  /** Avec le code de l'hôte, ce navigateur devient celui du coach : il retrouve son club (C10). */
  async claim(code: string): Promise<ApiResult> {
    const reply = await post('/api/claim', { code });
    const value = reply.value as { coachId: string; name: string; clubName: string; secret?: string } | undefined;
    if (reply.ok && value) adoptIdentity(value);
    return reply;
  },
};

async function post(url: string, body: Record<string, unknown>): Promise<ApiResult> {
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return (await response.json()) as ApiResult;
  } catch {
    return { ok: false, message: 'Serveur injoignable.' };
  }
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
  /** Dernière partie reçue : les envois suivants n'en contiennent que la différence (C8). */
  #game: GameState | null = null;
  readonly #transport: Transport;
  readonly #onGame: (game: GameState) => void;
  readonly #onDuel: (match: MatchState, view: DuelView) => void;
  readonly #onClosed: (message: string) => void;

  constructor(
    transport: Transport,
    onGame: (game: GameState) => void,
    onDuel: (match: MatchState, view: DuelView) => void,
    onClosed: (message: string) => void,
  ) {
    this.#transport = transport;
    this.#onGame = onGame;
    this.#onDuel = onDuel;
    this.#onClosed = onClosed;
  }

  /** Ce navigateur est celui de l'hôte : lui seul lance la ligue (MULTI-15). */
  get host(): boolean {
    return this.#transport.host;
  }

  get me(): CoachPresence | undefined {
    return this.coaches.find((coach) => coach.id === this.id);
  }

  connect(): void {
    this.#transport.connect({ message: (message) => this.#receive(message), status: (status) => (this.status = status) });
  }

  disconnect(): void {
    this.#transport.close();
  }

  join(profile: CoachProfile): Promise<ApiResult> {
    saveProfile(profile);
    return this.#transport.request('join', { name: profile.name, clubName: profile.clubName });
  }

  start(): Promise<ApiResult> {
    return this.#transport.request('start', {});
  }

  command(name: string, args: unknown[]): Promise<ApiResult> {
    return this.#transport.request('command', { name, args });
  }

  setReady(ready: boolean): Promise<ApiResult> {
    return this.#transport.request('ready', { ready });
  }

  /** Entre dans son match contre un autre coach : le coup d'envoi attend les deux. */
  joinDuel(): Promise<ApiResult> {
    return this.#transport.request('duel/join', {});
  }

  duelCommand(name: string, args: unknown[] = []): Promise<ApiResult> {
    return this.#transport.request('duel/command', { name, args });
  }

  /** Code de reprise de l'hôte (C10) : ce navigateur devient celui du coach (il faut ensuite se reconnecter). */
  async claim(code: string): Promise<ApiResult> {
    const reply = await this.#transport.request('claim', { code });
    const value = reply.value as { coachId: string; name: string; clubName: string; secret?: string } | undefined;
    if (reply.ok && value) adoptIdentity(value);
    return reply;
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
    if (message.type === 'gamePatch') {
      // Une différence sans partie de départ ne peut rien donner : on redemande tout.
      if (!this.#game) {
        this.#transport.resync();
        return;
      }
      this.#game = applyPatch(this.#game, message.patch);
    } else this.#game = message.game;
    this.#onGame(this.#game);
  }
}
