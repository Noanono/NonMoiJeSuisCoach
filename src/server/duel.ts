/**
 * Match en direct entre deux coachs de la ligue (MULTI-07), joué sur le serveur de l'hôte.
 * Horloge imposée à ×1 ; chaque coach a 3 pauses de 10 s ; une fenêtre de choix (penalty, coup franc,
 * capacité d'occasion) ou un ciblage dure 10 s au plus, puis le jeu choisit seul. La mi-temps dure 20 s,
 * moins si les deux coachs sont prêts. Une capacité s'annonce 5 s, match arrêté, comme en solo.
 */
import {
  cancelActivation,
  chooseFreeKickOption,
  chooseKeeperDive,
  choosePenaltyStyle,
  chooseWall,
  confirmActivation,
  dismissEventWindow,
  moveToLine,
  selectTarget,
  setInstructions,
  startActivation,
  substitutePlayer,
  swapPositions,
  tick,
  type MatchState,
  type Side,
} from '../domain/match';
import type { Instructions, Position } from '../domain/types';

export const DUEL_MINUTE_MS = 1000;
export const DUEL_PAUSES = 3;
export const DUEL_PAUSE_MS = 10_000;
export const DUEL_DECISION_MS = 10_000;
export const DUEL_HALFTIME_MS = 20_000;
export const DUEL_ANNOUNCE_MS = 5_000;

/** Ce que chaque coach voit du match en plus de l'état du moteur. */
export interface DuelView {
  key: string;
  you: Side;
  started: boolean;
  /** Coachs présents dans le match (le coup d'envoi attend les deux). */
  present: Side[];
  names: Record<Side, string>;
  pausesLeft: Record<Side, number>;
  pausedBy: Side | null;
  /** Millisecondes restantes de la pause, de la fenêtre de choix, du ciblage ou de la mi-temps. */
  pauseRemaining: number;
  decisionRemaining: number;
  halftimeRemaining: number;
  halftimeReady: Side[];
}

export type DuelResult = { ok: true } | { ok: false; message: string };

const refused = (message: string): DuelResult => ({ ok: false, message });

export class LiveDuel {
  readonly key: string;
  readonly match: MatchState;
  readonly coaches: Record<Side, string>;
  readonly names: Record<Side, string>;
  private readonly present = new Set<Side>();
  private started = false;
  private nextMinuteAt = 0;
  private readonly pausesLeft: Record<Side, number> = { home: DUEL_PAUSES, away: DUEL_PAUSES };
  private pausedBy: Side | null = null;
  private pausedUntil = 0;
  private frozenUntil = 0;
  private decisionKey: string | null = null;
  private decisionUntil = 0;
  private halftimeUntil = 0;
  private readonly halftimeReady = new Set<Side>();
  private activationsSeen: number;

  constructor(key: string, match: MatchState, coaches: Record<Side, string>, names: Record<Side, string>) {
    this.key = key;
    this.match = match;
    this.coaches = coaches;
    this.names = names;
    this.activationsSeen = match.activations.length;
  }

  get finished(): boolean {
    return this.match.status === 'finished';
  }

  sideOf(coachId: string): Side | null {
    if (this.coaches.home === coachId) return 'home';
    if (this.coaches.away === coachId) return 'away';
    return null;
  }

  /** Un coach entre dans le match ; le coup d'envoi est donné quand les deux sont là. */
  join(coachId: string, now: number): DuelResult {
    const side = this.sideOf(coachId);
    if (!side) return refused('Ce n’est pas ton match.');
    this.present.add(side);
    if (!this.started && this.present.size === 2) {
      this.started = true;
      this.nextMinuteAt = now + DUEL_MINUTE_MS;
    }
    return { ok: true };
  }

  /**
   * Fait avancer le match jusqu'à `now`. Rend vrai si l'état a changé (à diffuser).
   * Appelée plusieurs fois par seconde par le serveur.
   */
  advance(now: number): boolean {
    if (!this.started || this.finished) return false;
    if (this.pausedBy) {
      if (now < this.pausedUntil) return false;
      this.pausedBy = null;
      this.nextMinuteAt = now + DUEL_MINUTE_MS;
      return true;
    }
    if (now < this.frozenUntil) return false;
    if (this.match.status === 'halftime') return this.advanceHalftime(now);
    if (this.match.awaiting || this.match.pending) return this.advanceDecision(now);
    this.decisionKey = null;
    if (now < this.nextMinuteAt) return false;
    tick(this.match);
    this.nextMinuteAt = now + DUEL_MINUTE_MS;
    this.announceActivations(now);
    if ((this.match.status as MatchState['status']) === 'halftime') this.halftimeUntil = now + DUEL_HALFTIME_MS;
    return true;
  }

  private advanceHalftime(now: number): boolean {
    if (this.halftimeUntil === 0) this.halftimeUntil = now + DUEL_HALFTIME_MS;
    if (now < this.halftimeUntil && this.halftimeReady.size < 2) return false;
    this.halftimeUntil = 0;
    this.halftimeReady.clear();
    tick(this.match);
    this.nextMinuteAt = now + DUEL_MINUTE_MS;
    return true;
  }

  /** Fenêtre de choix ou ciblage : 10 s, puis le jeu décide (la fenêtre se ferme, le ciblage est annulé). */
  private advanceDecision(now: number): boolean {
    const key = this.currentDecisionKey();
    if (key !== this.decisionKey) {
      this.decisionKey = key;
      this.decisionUntil = now + DUEL_DECISION_MS;
      return true;
    }
    if (now < this.decisionUntil) return false;
    if (this.match.pending) cancelActivation(this.match);
    else dismissEventWindow(this.match);
    this.decisionKey = null;
    this.nextMinuteAt = now + DUEL_MINUTE_MS;
    return true;
  }

  private currentDecisionKey(): string {
    const { awaiting, pending } = this.match;
    if (pending) return `cible:${pending.side}:${pending.playerId}`;
    return `fenetre:${awaiting!.side}:${awaiting!.trigger}:${this.match.events.length}`;
  }

  /** Une capacité vient de partir : le match s'arrête le temps de l'annonce. */
  private announceActivations(now: number): void {
    if (this.match.activations.length > this.activationsSeen) this.frozenUntil = now + DUEL_ANNOUNCE_MS;
    this.activationsSeen = this.match.activations.length;
  }

  /** Commande d'un coach sur le match, toujours pour son propre camp. */
  command(coachId: string, name: unknown, args: unknown, now: number): DuelResult {
    const side = this.sideOf(coachId);
    if (!side) return refused('Ce n’est pas ton match.');
    if (!this.started) return refused('Le match n’a pas commencé : on attend ton adversaire.');
    if (this.finished) return refused('Le match est terminé.');
    const list = Array.isArray(args) ? (args as unknown[]) : [];
    const text = (index: number) => (typeof list[index] === 'string' ? (list[index] as string) : '');
    const match = this.match;
    switch (name) {
      case 'pause':
        if (this.pausedBy) return refused('Le match est déjà en pause.');
        if (this.pausesLeft[side] <= 0) return refused('Plus de pause : tu as utilisé tes trois.');
        this.pausesLeft[side] -= 1;
        this.pausedBy = side;
        this.pausedUntil = now + DUEL_PAUSE_MS;
        return { ok: true };
      case 'resume':
        if (this.pausedBy !== side) return refused('Seul celui qui a demandé la pause peut reprendre.');
        this.pausedUntil = now;
        this.advance(now);
        return { ok: true };
      case 'halftimeReady':
        if (match.status !== 'halftime') return refused('Ce n’est pas la mi-temps.');
        this.halftimeReady.add(side);
        this.advance(now);
        return { ok: true };
      case 'startActivation': {
        if (match.pending && match.pending.side !== side) return refused('Ton adversaire choisit sa cible : attends une seconde.');
        if (match.awaiting && match.awaiting.side !== side) return refused('C’est au tour de ton adversaire de décider.');
        const preview = startActivation(match, side, text(0));
        if (!preview.available) return refused(preview.reason ?? 'Pas maintenant.');
        if (match.pending?.required === 0) this.confirm(now);
        return { ok: true };
      }
      case 'selectTarget':
        if (match.pending?.side !== side) return refused('Aucun ciblage en cours.');
        selectTarget(match, text(0));
        return { ok: true };
      case 'confirmActivation':
        if (match.pending?.side !== side) return refused('Aucun ciblage en cours.');
        this.confirm(now);
        return { ok: true };
      case 'cancelActivation':
        if (match.pending?.side !== side) return refused('Aucun ciblage en cours.');
        cancelActivation(match);
        return { ok: true };
      case 'dismissWindow':
        if (match.awaiting?.side !== side) return refused('Ce n’est pas à toi de décider.');
        dismissEventWindow(match);
        return { ok: true };
      case 'chooseFreeKickOption':
        return chooseFreeKickOption(match, side, text(0) as never) ? { ok: true } : refused('Pas de coup franc pour toi.');
      case 'chooseWall':
        return chooseWall(match, side, text(0) as never) ? { ok: true } : refused('Pas de coup franc contre toi.');
      case 'choosePenaltyStyle':
        return choosePenaltyStyle(match, side, text(0) as never) ? { ok: true } : refused('Pas de penalty pour toi.');
      case 'chooseKeeperDive':
        return chooseKeeperDive(match, side, text(0) as never) ? { ok: true } : refused('Pas de penalty contre toi.');
      case 'substitute':
        return substitutePlayer(match, side, text(0), text(1)) === false ? refused('Ce changement n’est pas possible.') : { ok: true };
      case 'swapPositions':
        swapPositions(match, side, text(0), text(1));
        return { ok: true };
      case 'moveToLine':
        moveToLine(match, side, text(0), text(1) as Position);
        return { ok: true };
      case 'setInstructions': {
        const instructions = list[0];
        if (typeof instructions !== 'object' || instructions === null) return refused('Consignes invalides.');
        setInstructions(match, side, instructions as Instructions);
        return { ok: true };
      }
      default:
        return refused(`Commande de match inconnue : ${String(name)}`);
    }
  }

  private confirm(now: number): void {
    confirmActivation(this.match);
    this.announceActivations(now);
  }

  view(side: Side, now: number): DuelView {
    const decision = this.match.awaiting || this.match.pending ? Math.max(0, this.decisionUntil - now) : 0;
    return {
      key: this.key,
      you: side,
      started: this.started,
      present: [...this.present],
      names: this.names,
      pausesLeft: { ...this.pausesLeft },
      pausedBy: this.pausedBy,
      pauseRemaining: this.pausedBy ? Math.max(0, this.pausedUntil - now) : 0,
      decisionRemaining: this.decisionKey ? decision : DUEL_DECISION_MS,
      halftimeRemaining: this.match.status === 'halftime' && this.halftimeUntil > 0 ? Math.max(0, this.halftimeUntil - now) : 0,
      halftimeReady: [...this.halftimeReady],
    };
  }
}
