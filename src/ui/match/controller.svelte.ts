/**
 * Pilotage du match en direct côté UI : vitesse, pause, panneau d'activation et appels
 * au moteur. Aucune règle de jeu ici : chaque décision passe par `src/domain/match`.
 * Le moteur mute l'état en place, d'où `store.touchMatch()` après chaque appel.
 */
import {
  cancelActivation,
  canMoveToLine,
  canSwapPositions,
  chooseFreeKickOption,
  chooseKeeperDive,
  choosePenaltyStyle,
  chooseWall,
  moveToLine,
  swapPositions,
  confirmActivation,
  dismissEventWindow,
  isPaused,
  selectTarget,
  setInstructions,
  startActivation,
  substitutePlayer,
  substitutionsLeft,
  tick,
  type ActivationRecord,
  type MatchState,
  type FreeKickOption,
  type KeeperDive,
  type PenaltyStyle,
  type WallSize,
  type Side,
} from '../../domain/match';
import type { Instructions, Position } from '../../domain/types';
import type { AvatarPlayer } from '../kit/avatar';
import { describeEffect } from '../screens/describe';
import { substitutionFromDrag } from './activation';
import { goalAlert, type GoalAlert } from './verdict';
import { store } from '../store.svelte';
import type { Speed } from './live';
import type { DuelView } from '../../server/duel';

/** Temps d'affichage d'une capacité : le match attend qu'on ait lu. */
export const FX_DURATION_MS = 5000;
/** Au-delà, les annonces les plus anciennes sont sautées pour rester au rythme du match. */
const FX_QUEUE_LIMIT = 3;
/** Match en direct : durée de l'annonce d'un but, le match continuant sur le serveur. */
const REMOTE_GOAL_MS = 3000;

/** Capacité en cours de mise en scène sur le terrain. */
export interface ActivationFx {
  record: ActivationRecord;
  playerName: string;
  avatar: AvatarPlayer;
  own: boolean;
  description: string;
  /** Ce que fait la capacité, au niveau du joueur. */
  effects: string[];
}

/** Match en direct contre un autre coach : les actions partent au serveur, qui fait tourner le match (MULTI-07). */
export type RemoteCommand = (name: string, args?: unknown[]) => void;

export class MatchController {
  readonly match: MatchState;
  readonly coachSide: Side;
  readonly remote: RemoteCommand | null;
  speed = $state<Speed>(1);
  /** Pause du coach, aussi posée automatiquement à la mi-temps (MATCH-05). */
  paused = $state(false);
  /** Joueur dont le panneau d'activation est ouvert : l'horloge s'arrête le temps de lire (CAP-07). */
  inspectedId = $state<string | null>(null);
  /** Capacité affichée en ce moment sur le terrain. */
  fx = $state.raw<ActivationFx | null>(null);
  /** Rappel des effets ouvert : l'horloge s'arrête le temps de lire. */
  helpOpen = $state(false);
  /** Un joueur est en train d'être glissé : l'horloge attend la fin du geste. */
  dragging = $state(false);
  /** But à annoncer : le match attend que le coach reprenne. */
  goal = $state.raw<GoalAlert | null>(null);
  #goalsSeen = 0;
  #fxQueue: ActivationRecord[] = [];
  #fxSeen = 0;
  #fxTimer: ReturnType<typeof setTimeout> | undefined;
  #goalTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(match: MatchState, coachSide: Side, remote: RemoteCommand | null = null) {
    this.match = match;
    this.coachSide = coachSide;
    this.remote = remote;
    this.#fxSeen = match.activations.length;
    this.#goalsSeen = match.goals.length;
  }

  /** Lecture abonnée au moteur : à appeler dans chaque `$derived` qui lit `match`. */
  get version(): number {
    return store.matchVersion;
  }

  /** Le moteur attend le coach (fenêtre d'événement, ciblage) ou le match est fini. */
  readonly engineWaiting = $derived.by(() => {
    void this.version;
    return isPaused(this.match);
  });

  readonly finished = $derived.by(() => {
    void this.version;
    return this.match.status === 'finished';
  });

  /** L'horloge tourne : une seule boucle active, coupée dès que quelque chose attend (green code). */
  readonly running = $derived(this.isLocal() && !this.paused && this.inspectedId === null && !this.engineWaiting && this.fx === null && !this.helpOpen && this.goal === null && !this.dragging);

  /** Une minute de jeu (MATCH-02). Pause automatique à la mi-temps pour les consignes (MATCH-05). */
  step(): void {
    const before = this.match.status;
    tick(this.match);
    this.#collectFx();
    store.touchMatch();
    if (before !== 'halftime' && this.match.status === 'halftime') {
      this.paused = true;
      store.notify("Mi-temps. C'est le moment de changer les consignes.");
    }
  }

  togglePause(): void {
    if (this.remote) {
      this.remote(store.multi?.duel?.pausedBy === this.coachSide ? 'resume' : 'pause');
      return;
    }
    this.paused = !this.paused;
  }

  /** Horloge locale d'un match en direct : décompte les délais envoyés par le serveur (MULTI-07). */
  now = $state(Date.now());

  /** État du match en direct (pauses, délais), `null` hors match entre coachs. */
  get duel(): DuelView | null {
    return this.isLocal() ? null : (store.multi?.duel ?? null);
  }

  /** Temps restant d'un délai envoyé par le serveur, décompté depuis sa réception. */
  remaining(ms: number): number {
    const since = this.now - (store.multi?.duelReceivedAt ?? this.now);
    return Math.max(0, ms - since);
  }

  /** L'adversaire est en train de choisir : le terrain est grisé chez soi. */
  readonly opponentDeciding = $derived.by(() => {
    void this.version;
    if (this.isLocal()) return false;
    const deciding = this.match.pending?.side ?? this.match.awaiting?.side;
    return deciding !== undefined && deciding !== this.coachSide;
  });

  /** Match joué dans ce navigateur (solo, ou contre l'IA) ; un match en direct tourne sur le serveur. */
  private isLocal(): boolean {
    return this.remote === null;
  }

  /** Match en direct : nouvel état reçu du serveur, on repère buts et capacités à annoncer. */
  sync(): void {
    this.#collectFx();
  }

  /** Mi-temps d'un match en direct : prêt pour la reprise. */
  halftimeReady(): void {
    this.remote?.('halftimeReady');
  }

  setSpeed(speed: Speed): void {
    this.speed = speed;
  }

  inspect(playerId: string): void {
    this.inspectedId = playerId;
  }

  closeInspection(): void {
    this.inspectedId = null;
  }

  /**
   * « Gueuler ! » : démarre l'activation (CAP-16). Sans cible à choisir (soi, équipe,
   * zone, au hasard : CAP-18), le panneau valait confirmation et l'activation part tout de suite.
   */
  shout(): void {
    const playerId = this.inspectedId;
    if (!playerId) return;
    this.inspectedId = null;
    if (this.remote) {
      this.remote('startActivation', [playerId]);
      return;
    }
    const preview = startActivation(this.match, this.coachSide, playerId);
    store.touchMatch();
    if (!preview.available) {
      store.notify(preview.reason ?? 'Pas maintenant.');
      return;
    }
    if (this.match.pending?.required === 0) this.confirm();
  }

  /** Choix d'une cible, une à une (CAP-17). */
  pickTarget(targetId: string): void {
    if (this.remote) return this.remote('selectTarget', [targetId]);
    if (selectTarget(this.match, targetId)) store.touchMatch();
  }

  confirm(): void {
    if (this.remote) return this.remote('confirmActivation');
    confirmActivation(this.match);
    this.#collectFx();
    store.touchMatch();
  }

  /** Annule avant validation : rien n'est consommé (CAP-20). */
  cancel(): void {
    if (this.remote) return this.remote('cancelActivation');
    cancelActivation(this.match);
    store.touchMatch();
  }

  /** Laisse passer la fenêtre d'événement (CAP-19). */
  dismissWindow(): void {
    if (this.remote) return this.remote('dismissWindow');
    dismissEventWindow(this.match);
    store.touchMatch();
  }

  /** Coup franc pour le coach : tir direct, centre ou combinaison. */
  chooseFreeKick(option: FreeKickOption): void {
    if (this.remote) return this.remote('chooseFreeKickOption', [option]);
    chooseFreeKickOption(this.match, this.coachSide, option);
    store.touchMatch();
  }

  /** Coup franc adverse : taille du mur. */
  chooseWall(wall: WallSize): void {
    if (this.remote) return this.remote('chooseWall', [wall]);
    chooseWall(this.match, this.coachSide, wall);
    store.touchMatch();
  }

  /** Penalty pour le coach : frappe placée, en force ou Panenka. */
  choosePenaltyStyle(style: PenaltyStyle): void {
    if (this.remote) return this.remote('choosePenaltyStyle', [style]);
    choosePenaltyStyle(this.match, this.coachSide, style);
    store.touchMatch();
  }

  /** Penalty adverse : plongeon du gardien. */
  chooseKeeperDive(dive: KeeperDive): void {
    if (this.remote) return this.remote('chooseKeeperDive', [dive]);
    chooseKeeperDive(this.match, this.coachSide, dive);
    store.touchMatch();
  }

  /**
   * Fin d'un glisser sur le terrain : `targetId` est le jeton visé, `line` la ligne du coach visée.
   * Titulaire sur titulaire = échange de postes ; titulaire sur une ligne = changement de formation ;
   * banc et terrain = remplacement.
   */
  dropPlayer(draggedId: string, targetId: string | null, line: Position | null = null): void {
    this.dragging = false;
    if (targetId && targetId !== draggedId) {
      if (canSwapPositions(this.match, this.coachSide, draggedId, targetId)) {
        if (this.remote) return this.remote('swapPositions', [draggedId, targetId]);
        swapPositions(this.match, this.coachSide, draggedId, targetId);
        store.touchMatch();
        return;
      }
      const change = substitutionFromDrag(this.match, this.coachSide, draggedId, targetId);
      if (change) this.substitute(change.leavingId, change.enteringId);
      else if (substitutionsLeft(this.coachSide === 'home' ? this.match.home : this.match.away) === 0) store.notify('Plus aucun changement disponible.');
      return;
    }
    if (line && canMoveToLine(this.match, this.coachSide, draggedId, line)) {
      if (this.remote) return this.remote('moveToLine', [draggedId, line]);
      moveToLine(this.match, this.coachSide, draggedId, line);
      store.touchMatch();
    }
  }

  /** Consignes tactiques pendant une pause (MATCH-05). */
  updateInstructions(changes: Partial<Instructions>): void {
    const team = this.coachSide === 'home' ? this.match.home : this.match.away;
    if (this.remote) return this.remote('setInstructions', [{ ...team.instructions, ...changes }]);
    setInstructions(this.match, this.coachSide, { ...team.instructions, ...changes });
    store.touchMatch();
  }

  /** Repère les capacités parties depuis le dernier appel et les met en file d'affichage. */
  #collectFx(): void {
    this.#collectGoal();
    const fresh = this.match.activations.slice(this.#fxSeen);
    if (fresh.length === 0) return;
    this.#fxSeen = this.match.activations.length;
    this.#fxQueue = [...this.#fxQueue, ...fresh].slice(-FX_QUEUE_LIMIT);
    if (!this.fx) this.#showNextFx();
  }

  /** Un but arrête le match tant que le coach n'a pas repris. */
  #collectGoal(): void {
    const latest = this.match.goals.at(-1);
    const scored = this.match.goals.length > this.#goalsSeen;
    this.#goalsSeen = this.match.goals.length;
    if (!scored || !latest || latest.cancelled) return;
    this.goal = goalAlert(this.match, latest, this.coachSide);
    // Match en direct : le serveur ne s'arrête pas sur un but, l'annonce se referme seule.
    if (this.remote) {
      clearTimeout(this.#goalTimer);
      this.#goalTimer = setTimeout(() => (this.goal = null), REMOTE_GOAL_MS);
    }
  }

  resumeAfterGoal(): void {
    this.goal = null;
  }

  #showNextFx(): void {
    const record = this.#fxQueue.shift();
    if (!record) {
      this.fx = null;
      return;
    }
    const team = record.side === 'home' ? this.match.home : this.match.away;
    const player = team.players.find((candidate) => candidate.id === record.playerId)!;
    const { age, clubId, position } = player.profile;
    this.fx = {
      record,
      playerName: player.name,
      avatar: { id: player.id, age, clubId, position },
      own: record.side === this.coachSide,
      description: player.ability?.description ?? '',
      effects: player.ability?.effects.map(describeEffect) ?? [],
    };
    this.#fxTimer = setTimeout(() => this.#showNextFx(), FX_DURATION_MS);
  }

  /** Clic sur l'annonce : on passe à la suite. */
  skipFx(): void {
    clearTimeout(this.#fxTimer);
    this.#showNextFx();
  }

  /** Remplacement (MATCH-08). Le panneau du joueur se referme. */
  substitute(leavingId: string, enteringId: string): void {
    this.inspectedId = null;
    if (this.remote) return this.remote('substitute', [leavingId, enteringId]);
    if (substitutePlayer(this.match, this.coachSide, leavingId, enteringId) === false) store.notify('Ce changement n’est pas possible.');
    store.touchMatch();
  }

  /** À appeler quand l'écran disparaît. */
  dispose(): void {
    clearTimeout(this.#fxTimer);
    clearTimeout(this.#goalTimer);
  }

  /** Coup de sifflet final : reporte le match sur la partie (MATCH-06). */
  whistle(): void {
    try {
      store.endMatch();
    } catch (error) {
      store.notify(error instanceof Error ? error.message : "Le sifflet est coincé. Réessaie.");
    }
  }
}
