/**
 * État réactif de l'application. La partie (plusieurs centaines de joueurs) est gardée
 * en `$state.raw` : les commandes du domaine la modifient en place et `version` signale
 * le changement. Les composants lisent la partie via `select`, qui s'abonne à `version`.
 */
import {
  advanceWeek,
  createGameSaves,
  newGame,
  revealOwnSquads,
  runCommand,
  saveMeta,
  startHumanMatch,
  withRng,
  type CommandArgs,
  type CommandName,
  type CommandResult,
  type Difficulty,
  type GameState,
} from '../domain/game';
import { summarize } from '../domain/match';
import type { MatchState, MatchSummary } from '../domain/match/types';
import type { DuelView } from '../server/duel';
import { MultiClient } from './multiClient.svelte';
import type { SaveSlot, SlotSummary } from '../domain/save/saveSlots';

export type Screen = 'title' | 'lobby' | 'dashboard' | 'squad' | 'tactics' | 'training' | 'market' | 'club' | 'competitions' | 'stats' | 'match';

/** Délai d'écriture après une action de gestion : on regroupe les clics (green code). */
const AUTOSAVE_DELAY_MS = 1500;

const saves = createGameSaves(globalThis.localStorage);

class AppStore {
  game = $state.raw<GameState | null>(null);
  version = $state(0);
  slot = $state<SaveSlot | null>(null);
  screen = $state<Screen>('title');
  /** Match en direct : muté en place par le moteur, `matchVersion` signale chaque minute. */
  match = $state.raw<MatchState | null>(null);
  matchVersion = $state(0);
  lastSummary = $state.raw<MatchSummary | null>(null);
  toast = $state<string | null>(null);
  /** Ligue entre amis : connexion au serveur de l'hôte ; `null` en solo. */
  multi = $state.raw<MultiClient | null>(null);
  #saveTimer: ReturnType<typeof setTimeout> | undefined;

  /** Lit une donnée dérivée de la partie et s'abonne à ses changements. */
  select<T>(read: (game: GameState) => T): T {
    void this.version;
    if (!this.game) throw new Error('Aucune partie chargée');
    return read(this.game);
  }

  /** Exécute une fonction du domaine sur la partie locale, puis planifie la sauvegarde (solo). */
  run<T>(command: (game: GameState) => T): T {
    if (!this.game) throw new Error('Aucune partie chargée');
    const result = command(this.game);
    this.version += 1;
    if (!this.multi) this.scheduleSave();
    return result;
  }

  /**
   * Commande du coach (MULTI-05). En solo, elle s'exécute sur la partie. En multi, elle s'exécute aussi
   * tout de suite sur la copie locale (réponse immédiate), puis part au serveur, qui renvoie la partie officielle.
   */
  command<Name extends CommandName>(name: Name, ...args: CommandArgs<Name>): CommandResult<Name> {
    const result = this.run((game) => runCommand(game, name, args));
    const multi = this.multi;
    if (multi) {
      void multi.command(name, args).then((reply) => {
        if (!reply.ok) this.notify(reply.message ?? 'Le serveur a refusé.');
      });
    }
    return result;
  }

  notify(message: string): void {
    this.toast = message;
  }

  go(screen: Screen): void {
    this.screen = screen;
    document.documentElement.dataset.theme = screen === 'match' ? 'dark' : 'light';
  }

  // --- Ligue entre amis (MULTI-01 à MULTI-05) ---------------------------------------

  /** Se connecte au serveur de l'hôte et ouvre la salle d'attente. */
  openMultiplayer(): void {
    this.multi?.disconnect();
    const client = new MultiClient(
      (game) => this.receiveGame(game),
      (match, view) => this.receiveDuel(match, view),
      (message) => {
        // L'hôte a fermé la ligue ou en a ouvert une autre (MULTI-09).
        this.quitToTitle();
        this.notify(message);
      },
    );
    this.multi = client;
    this.game = null;
    this.slot = null;
    client.connect();
    this.go('lobby');
  }

  /** Clé du match en direct affiché, et ceux que le coach a déjà quittés après le coup de sifflet. */
  duelKey = $state<string | null>(null);
  #leftDuels = new Set<string>();

  /**
   * Match en direct contre un autre coach (MULTI-07) : le serveur joue, on affiche. L'objet du match
   * reste le même d'une mise à jour à l'autre (le contrôleur et l'écran le gardent), seul son contenu change.
   */
  private receiveDuel(match: MatchState, view: DuelView): void {
    if (this.#leftDuels.has(view.key)) return;
    if (this.match && this.duelKey === view.key) {
      Object.assign(this.match, match);
      this.touchMatch();
      return;
    }
    if (!view.started) return;
    this.duelKey = view.key;
    this.match = match;
    this.lastSummary = null;
    this.matchVersion += 1;
    this.go('match');
  }

  /** Entre dans son match en direct ; on attend l'adversaire sur le Bureau. */
  joinDuel(): void {
    void this.multi?.joinDuel().then((reply) => {
      if (!reply.ok) this.notify(reply.message ?? 'Impossible de rejoindre le match.');
    });
  }

  /** Action du coach pendant un match en direct : c'est le serveur qui l'applique. */
  duelCommand(name: string, args: unknown[] = []): void {
    void this.multi?.duelCommand(name, args).then((reply) => {
      if (!reply.ok) this.notify(reply.message ?? 'Refusé.');
    });
  }

  /** Partie officielle envoyée par le serveur, du point de vue de ce coach. */
  private receiveGame(game: GameState): void {
    this.game = game;
    this.version += 1;
    if (this.screen === 'lobby' || this.screen === 'title') this.go('dashboard');
  }

  // --- Sauvegardes (TECH-03, TECH-04) -------------------------------------------------

  listSlots(): SlotSummary[] {
    return saves.list();
  }

  startNewGame(slot: SaveSlot, clubName: string, difficulty: Difficulty = 'normal'): void {
    this.game = newGame({ seed: Date.now() % 2_147_483_647, clubName, difficulty });
    this.slot = slot;
    this.version += 1;
    this.saveNow();
    this.go('dashboard');
  }

  load(slot: SaveSlot): void {
    const game = saves.load(slot);
    // Anciennes sauvegardes : les capacités de son effectif sont désormais toujours connues (CLUB-10).
    if (game) revealOwnSquads(game);
    this.game = game;
    this.slot = slot;
    this.version += 1;
    this.go('dashboard');
  }

  removeSlot(slot: SaveSlot): void {
    saves.remove(slot);
  }

  quitToTitle(): void {
    this.saveNow();
    this.multi?.disconnect();
    this.multi = null;
    this.game = null;
    this.match = null;
    this.go('title');
  }

  saveNow(): void {
    clearTimeout(this.#saveTimer);
    // En multi, c'est le serveur de l'hôte qui sauvegarde.
    if (!this.game || !this.slot || this.multi) return;
    try {
      saves.save(this.slot, this.game, saveMeta(this.game));
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Sauvegarde impossible.');
    }
  }

  private scheduleSave(): void {
    clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => this.saveNow(), AUTOSAVE_DELAY_MS);
  }

  // --- Semaine et match ---------------------------------------------------------------

  /** Solo : la semaine avance. Multi : le coach se déclare prêt (ou ne l'est plus) ; la semaine avance quand tous le sont. */
  nextWeek(): void {
    const multi = this.multi;
    if (!multi) {
      this.run(advanceWeek);
      this.saveNow();
      return;
    }
    const ready = !multi.me?.ready;
    void multi.setReady(ready).then((reply) => {
      if (!reply.ok) this.notify(reply.message ?? 'Pas encore.');
      else if (ready) this.notify((reply.value as { advanced?: boolean } | undefined)?.advanced ? reply.message ?? 'Semaine suivante !' : 'Prêt ! On attend les autres coachs.');
    });
  }

  kickOff(): void {
    this.match = this.run((game) => withRng(game, (rng) => startHumanMatch(game, rng)));
    this.lastSummary = null;
    this.matchVersion += 1;
    this.go('match');
  }

  /** À appeler après chaque appel au moteur qui modifie le match. */
  touchMatch(): void {
    this.matchVersion += 1;
  }

  endMatch(): MatchSummary {
    const match = this.match;
    if (!match) throw new Error('Pas de match en cours');
    const summary = summarize(match);
    // Match en direct entre coachs : le serveur l'a déjà reporté sur la partie.
    if (!this.duelKey) this.command('submitMatch', summary);
    this.lastSummary = summary;
    this.saveNow();
    return summary;
  }

  leaveMatch(): void {
    if (this.duelKey) this.#leftDuels.add(this.duelKey);
    this.duelKey = null;
    this.match = null;
    this.go('dashboard');
  }
}

export const store = new AppStore();
