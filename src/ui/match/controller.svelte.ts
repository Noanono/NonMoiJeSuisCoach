/**
 * Pilotage du match en direct côté UI : vitesse, pause, panneau d'activation et appels
 * au moteur. Aucune règle de jeu ici : chaque décision passe par `src/domain/match`.
 * Le moteur mute l'état en place, d'où `store.touchMatch()` après chaque appel.
 */
import {
  cancelActivation,
  confirmActivation,
  dismissEventWindow,
  isPaused,
  selectTarget,
  setInstructions,
  startActivation,
  tick,
  type MatchState,
  type Side,
} from '../../domain/match';
import type { Instructions } from '../../domain/types';
import { store } from '../store.svelte';
import type { Speed } from './live';

export class MatchController {
  readonly match: MatchState;
  readonly coachSide: Side;
  speed = $state<Speed>(1);
  /** Pause du coach, aussi posée automatiquement à la mi-temps (MATCH-05). */
  paused = $state(false);
  /** Joueur dont le panneau d'activation est ouvert : l'horloge s'arrête le temps de lire (CAP-07). */
  inspectedId = $state<string | null>(null);

  constructor(match: MatchState, coachSide: Side) {
    this.match = match;
    this.coachSide = coachSide;
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
  readonly running = $derived(!this.paused && this.inspectedId === null && !this.engineWaiting);

  /** Une minute de jeu (MATCH-02). Pause automatique à la mi-temps pour les consignes (MATCH-05). */
  step(): void {
    const before = this.match.status;
    tick(this.match);
    store.touchMatch();
    if (before !== 'halftime' && this.match.status === 'halftime') {
      this.paused = true;
      store.notify("Mi-temps. C'est le moment de changer les consignes.");
    }
  }

  togglePause(): void {
    this.paused = !this.paused;
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
    if (selectTarget(this.match, targetId)) store.touchMatch();
  }

  confirm(): void {
    const before = this.match.activations.length;
    confirmActivation(this.match);
    store.touchMatch();
    const record = this.match.activations[before];
    if (!record) return;
    const risks = record.risks.length > 0 ? ` Revers : ${record.risks.join(', ')}.` : '';
    store.notify(record.success ? `${record.abilityName} : ça passe.${risks}` : `${record.abilityName} : raté.${risks}`);
  }

  /** Annule avant validation : rien n'est consommé (CAP-20). */
  cancel(): void {
    cancelActivation(this.match);
    store.touchMatch();
  }

  /** Laisse passer la fenêtre d'événement (CAP-19). */
  dismissWindow(): void {
    dismissEventWindow(this.match);
    store.touchMatch();
  }

  /** Consignes tactiques pendant une pause (MATCH-05). */
  updateInstructions(changes: Partial<Instructions>): void {
    const team = this.coachSide === 'home' ? this.match.home : this.match.away;
    setInstructions(this.match, this.coachSide, { ...team.instructions, ...changes });
    store.touchMatch();
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
