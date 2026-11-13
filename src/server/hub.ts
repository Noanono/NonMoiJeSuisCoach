/**
 * Cœur du serveur multijoueur (MULTI-01 à MULTI-05), sans réseau : salle d'attente, partie partagée,
 * commandes des coachs et « Semaine suivante » collective. Le serveur HTTP ne fait que relayer.
 */
import {
  applyDuelSummary,
  asCoach,
  humanFixture,
  isHumanDuel,
  startDuelMatch,
  withRng,
  canAdvanceWeek,
  advanceWeek,
  focusCoach,
  isCommandName,
  joinMidGame,
  newMultiplayerGame,
  runCommand,
  signupError,
  syncFocus,
  type CoachSignup,
  type CommandName,
  type Difficulty,
  type GameState,
} from '../domain/game';
import { summarize, type MatchState } from '../domain/match';
import type { Fixture } from '../domain/types';
import { LiveDuel, type DuelView } from './duel';

/** Ce que le serveur sauvegarde sur le disque de l'hôte. */
export interface HubSnapshot {
  seed: number;
  difficulty: Difficulty;
  signups: CoachSignup[];
  game: GameState | null;
  ready: string[];
}

/** Un coach vu par les autres : en ligne, prêt, ce qui le retient. */
export interface CoachPresence {
  id: string;
  name: string;
  clubName: string;
  online: boolean;
  ready: boolean;
  /** Pourquoi il ne peut pas encore passer à la semaine suivante (`null` s'il peut). */
  waitingFor: string | null;
}

export type ServerMessage =
  | { type: 'lobby'; phase: 'lobby' | 'playing'; you: string | null; coaches: CoachPresence[] }
  | { type: 'game'; you: string; coaches: CoachPresence[]; game: GameState }
  | { type: 'duel'; view: DuelView; match: MatchState }
  | { type: 'notice'; message: string }
  /** L'hôte a fermé la ligue ou en a ouvert une autre : retour à l'accueil. */
  | { type: 'closed'; message: string };

/** Ce que l'accueil montre d'une ligue (MULTI-09). */
export interface LeagueSummary {
  phase: 'lobby' | 'playing';
  season: number | null;
  week: number | null;
  coaches: { id: string; name: string; clubName: string }[];
}

/** Un emplacement de ligue de l'hôte (MULTI-09). */
export interface SlotInfo {
  slot: number;
  status: 'empty' | 'ok' | 'error';
  active: boolean;
  savedAt: number | null;
  league: LeagueSummary | null;
}

/** Ligue ouverte sur le serveur, telle que l'accueil la montre. */
export interface ServerInfo {
  /** Ce navigateur est sur le PC du serveur : il choisit la ligue ouverte. */
  host: boolean;
  league: (LeagueSummary & { slot: number }) | null;
}

/** Résumé d'une ligue sauvegardée ou ouverte, sans la charger en entier côté client. */
export function summarizeLeague(snapshot: HubSnapshot): LeagueSummary {
  const game = snapshot.game;
  return {
    phase: game ? 'playing' : 'lobby',
    season: game?.season ?? null,
    week: game?.week ?? null,
    coaches: snapshot.signups.map((signup) => {
      const clubId = game?.coaches?.find((coach) => coach.id === signup.id)?.clubId;
      return { id: signup.id, name: signup.name, clubName: (clubId && game?.clubs[clubId]?.name) || signup.clubName };
    }),
  };
}

export type HubResult<T = unknown> = { ok: true; value: T; message?: string } | { ok: false; message: string };

const ok = <T>(value: T, message?: string): HubResult<T> => ({ ok: true, value, ...(message ? { message } : {}) });
const refused = (message: string): HubResult<never> => ({ ok: false, message });

export class MultiplayerHub {
  private snapshot: HubSnapshot;
  /** Nombre de connexions ouvertes par coach (plusieurs onglets possibles). */
  private readonly connections = new Map<string, number>();
  /** Matchs en direct entre coachs (MULTI-07), par match du calendrier. Pas sauvegardés : un match coupé se rejoue. */
  private readonly duels = new Map<string, { duel: LiveDuel; fixture: Fixture; applied: boolean }>();

  constructor(snapshot: HubSnapshot) {
    this.snapshot = snapshot;
  }

  static create(seed: number, difficulty: Difficulty = 'normal'): MultiplayerHub {
    return new MultiplayerHub({ seed, difficulty, signups: [], game: null, ready: [] });
  }

  get phase(): 'lobby' | 'playing' {
    return this.snapshot.game ? 'playing' : 'lobby';
  }

  /** État à écrire sur le disque. */
  save(): HubSnapshot {
    if (this.snapshot.game) syncFocus(this.snapshot.game);
    return this.snapshot;
  }

  connect(coachId: string): void {
    this.connections.set(coachId, (this.connections.get(coachId) ?? 0) + 1);
  }

  disconnect(coachId: string): void {
    const count = (this.connections.get(coachId) ?? 1) - 1;
    if (count <= 0) this.connections.delete(coachId);
    else this.connections.set(coachId, count);
  }

  isOnline(coachId: string): boolean {
    return this.connections.has(coachId);
  }

  /** Inscription : dans la salle d'attente, ou en cours de partie (club IA le plus faible). */
  join(signup: CoachSignup): HubResult<{ clubId: string | null }> {
    const known = this.snapshot.signups.find((entry) => entry.id === signup.id);
    const game = this.snapshot.game;
    if (game) {
      if (known) return ok({ clubId: game.coaches?.find((coach) => coach.id === signup.id)?.clubId ?? null });
      const error = signupError(game, this.snapshot.signups, signup);
      if (error) return refused(error);
      const clean = trimmed(signup);
      const clubId = joinMidGame(game, clean);
      this.snapshot.signups.push(clean);
      return ok({ clubId }, `${clean.name} rejoint la ligue avec ${clean.clubName}.`);
    }
    const error = signupError(null, this.snapshot.signups, signup);
    if (error) return refused(error);
    const clean = trimmed(signup);
    if (known) Object.assign(known, clean);
    else this.snapshot.signups.push(clean);
    return ok({ clubId: null });
  }

  /** Lance la ligue avec les coachs inscrits et connectés à cet instant (MULTI-02). */
  start(coachId: string): HubResult<null> {
    if (this.snapshot.game) return refused('La ligue a déjà commencé.');
    if (!this.snapshot.signups.some((signup) => signup.id === coachId)) return refused('Inscris-toi avant de lancer la ligue.');
    const present = this.snapshot.signups.filter((signup) => signup.id === coachId || this.isOnline(signup.id));
    this.snapshot.signups = present;
    this.snapshot.game = newMultiplayerGame({ seed: this.snapshot.seed, coaches: present, difficulty: this.snapshot.difficulty });
    this.snapshot.ready = [];
    return ok(null, `La ligue démarre avec ${present.length} coach(s) !`);
  }

  /** Commande d'un coach, exécutée de son point de vue (MULTI-05). */
  command(coachId: string, name: unknown, args: unknown): HubResult {
    const game = this.snapshot.game;
    if (!game) return refused('La ligue n’a pas encore commencé.');
    if (!this.isCoach(coachId)) return refused('Coach inconnu.');
    if (!isCommandName(name)) return refused(`Commande inconnue : ${String(name)}`);
    if (!Array.isArray(args)) return refused('Arguments invalides.');
    try {
      const value = asCoach(game, coachId, () => runCommand(game, name as CommandName, args as never));
      return ok(value);
    } catch (error) {
      return refused(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * « Semaine suivante » (MULTI-04) : le coach se déclare prêt ; quand tout le monde l'est, la semaine
   * avance pour tous. Un coach qui n'a pas joué son match ou répondu à son dialogue ne peut pas être prêt.
   */
  setReady(coachId: string, ready: boolean): HubResult<{ advanced: boolean }> {
    const game = this.snapshot.game;
    if (!game) return refused('La ligue n’a pas encore commencé.');
    if (!this.isCoach(coachId)) return refused('Coach inconnu.');
    if (!ready) {
      this.snapshot.ready = this.snapshot.ready.filter((id) => id !== coachId);
      return ok({ advanced: false });
    }
    const live = this.duelOf(coachId);
    if (live && !live.duel.finished && live.duel.match.minute > 0) return refused('Ton match en direct n’est pas fini.');
    const check = asCoach(game, coachId, () => canAdvanceWeek(game));
    if (!check.ok) return refused(check.reason);
    if (!this.snapshot.ready.includes(coachId)) this.snapshot.ready.push(coachId);
    const everyone = game.coaches!.every((coach) => this.snapshot.ready.includes(coach.id));
    if (!everyone) return ok({ advanced: false });
    try {
      advanceWeek(game);
    } catch (error) {
      // Quelqu'un n'est plus prêt (une offre acceptée, un licenciement…) : on garde les autres prêts.
      return refused(error instanceof Error ? error.message : String(error));
    }
    this.snapshot.ready = [];
    this.duels.clear();
    return ok({ advanced: true }, `Semaine ${game.week} : c'est reparti !`);
  }

  /** Message pour un coach, sérialisé tout de suite : la partie est mise à son point de vue pour l'occasion. */
  messageFor(coachId: string | null): string {
    const game = this.snapshot.game;
    const coaches = this.presence();
    if (!game || !coachId || !this.isCoach(coachId)) {
      return JSON.stringify({ type: 'lobby', phase: this.phase, you: coachId && this.snapshot.signups.some((signup) => signup.id === coachId) ? coachId : null, coaches } satisfies ServerMessage);
    }
    focusCoach(game, coachId);
    return JSON.stringify({ type: 'game', you: coachId, coaches, game } satisfies ServerMessage);
  }

  presence(): CoachPresence[] {
    const game = this.snapshot.game;
    if (game) syncFocus(game);
    return this.snapshot.signups.map((signup) => {
      const coach = game?.coaches?.find((entry) => entry.id === signup.id);
      const waitingFor = game && coach ? asCoach(game, coach.id, () => canAdvanceWeek(game)) : null;
      return {
        id: signup.id,
        name: signup.name,
        clubName: coach ? (game!.clubs[coach.clubId]?.name ?? signup.clubName) : signup.clubName,
        online: this.isOnline(signup.id),
        ready: this.snapshot.ready.includes(signup.id),
        waitingFor: waitingFor && !waitingFor.ok ? waitingFor.reason : null,
      };
    });
  }

  // --- Matchs en direct entre coachs (MULTI-07) ---------------------------------------

  /** Le coach entre dans son match contre un autre coach ; le match est créé au premier arrivé. */
  joinDuel(coachId: string, now: number): HubResult<{ key: string }> {
    const game = this.snapshot.game;
    if (!game || !this.isCoach(coachId)) return refused('La ligue n’a pas encore commencé.');
    const fixture = asCoach(game, coachId, () => humanFixture(game));
    if (!fixture || !isHumanDuel(game, fixture)) return refused('Pas de match contre un autre coach cette semaine.');
    if (fixture.result) return refused('Ce match a déjà été joué.');
    const key = `${game.season}-${game.week}-${fixture.homeId}-${fixture.awayId}`;
    let entry = this.duels.get(key);
    if (!entry) {
      const coachOf = (clubId: string) => game.coaches!.find((coach) => coach.clubId === clubId)!;
      const home = coachOf(fixture.homeId);
      const away = coachOf(fixture.awayId);
      const match = withRng(game, (rng) => startDuelMatch(game, fixture, rng));
      entry = { duel: new LiveDuel(key, match, { home: home.id, away: away.id }, { home: home.name, away: away.name }), fixture, applied: false };
      this.duels.set(key, entry);
    }
    const joined = entry.duel.join(coachId, now);
    return joined.ok ? ok({ key }) : refused(joined.message);
  }

  duelCommand(coachId: string, name: unknown, args: unknown, now: number): HubResult<{ key: string }> {
    const entry = this.duelOf(coachId);
    if (!entry) return refused('Tu n’as pas de match en cours.');
    const result = entry.duel.command(coachId, name, args, now);
    return result.ok ? ok({ key: entry.duel.key }) : refused(result.message);
  }

  /**
   * Fait avancer les matchs en direct. Rend les matchs à rediffuser, et vrai si la partie a changé
   * (un match fini est reporté sur la partie : résultat, blessures, suspensions des deux coachs).
   */
  advanceDuels(now: number): { changed: string[]; gameChanged: boolean } {
    const changed: string[] = [];
    let gameChanged = false;
    for (const [key, entry] of this.duels) {
      if (entry.duel.advance(now)) changed.push(key);
      if (entry.duel.finished && !entry.applied && this.snapshot.game) {
        entry.applied = true;
        applyDuelSummary(this.snapshot.game, entry.fixture, summarize(entry.duel.match));
        gameChanged = true;
        if (!changed.includes(key)) changed.push(key);
      }
    }
    return { changed, gameChanged };
  }

  /** Coachs d'un match en direct. */
  duelCoaches(key: string): string[] {
    const entry = this.duels.get(key);
    return entry ? [entry.duel.coaches.home, entry.duel.coaches.away] : [];
  }

  /** État du match en direct pour ce coach, sérialisé ; `null` s'il n'en joue pas. */
  duelMessageFor(coachId: string, now: number): string | null {
    const entry = this.duelOf(coachId);
    if (!entry) return null;
    const side = entry.duel.sideOf(coachId)!;
    return JSON.stringify({ type: 'duel', view: entry.duel.view(side, now), match: entry.duel.match } satisfies ServerMessage);
  }

  private duelOf(coachId: string): { duel: LiveDuel; fixture: Fixture; applied: boolean } | undefined {
    for (const entry of this.duels.values()) if (entry.duel.sideOf(coachId)) return entry;
    return undefined;
  }

  private isCoach(coachId: string): boolean {
    return this.snapshot.game?.coaches?.some((coach) => coach.id === coachId) ?? false;
  }
}

function trimmed(signup: CoachSignup): CoachSignup {
  return { id: signup.id, name: signup.name.trim(), clubName: signup.clubName.trim() };
}
