/**
 * État réactif de l'application. La partie (plusieurs centaines de joueurs) est gardée
 * en `$state.raw` : les commandes du domaine la modifient en place et `version` signale
 * le changement. Les composants lisent la partie via `select`, qui s'abonne à `version`.
 */
import { advanceWeek, createGameSaves, finishHumanMatch, newGame, saveMeta, startHumanMatch, withRng, type GameState } from '../domain/game';
import type { MatchState, MatchSummary } from '../domain/match/types';
import type { SaveSlot, SlotSummary } from '../domain/save/saveSlots';

export type Screen = 'title' | 'dashboard' | 'squad' | 'tactics' | 'training' | 'market' | 'club' | 'competitions' | 'match';

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
  #saveTimer: ReturnType<typeof setTimeout> | undefined;

  /** Lit une donnée dérivée de la partie et s'abonne à ses changements. */
  select<T>(read: (game: GameState) => T): T {
    void this.version;
    if (!this.game) throw new Error('Aucune partie chargée');
    return read(this.game);
  }

  /** Exécute une commande du domaine sur la partie, puis planifie la sauvegarde. */
  run<T>(command: (game: GameState) => T): T {
    if (!this.game) throw new Error('Aucune partie chargée');
    const result = command(this.game);
    this.version += 1;
    this.scheduleSave();
    return result;
  }

  notify(message: string): void {
    this.toast = message;
  }

  go(screen: Screen): void {
    this.screen = screen;
    document.documentElement.dataset.theme = screen === 'match' ? 'dark' : 'light';
  }

  // --- Sauvegardes (TECH-03, TECH-04) -------------------------------------------------

  listSlots(): SlotSummary[] {
    return saves.list();
  }

  startNewGame(slot: SaveSlot, clubName: string): void {
    this.game = newGame({ seed: Date.now() % 2_147_483_647, clubName });
    this.slot = slot;
    this.version += 1;
    this.saveNow();
    this.go('dashboard');
  }

  load(slot: SaveSlot): void {
    this.game = saves.load(slot);
    this.slot = slot;
    this.version += 1;
    this.go('dashboard');
  }

  removeSlot(slot: SaveSlot): void {
    saves.remove(slot);
  }

  quitToTitle(): void {
    this.saveNow();
    this.game = null;
    this.match = null;
    this.go('title');
  }

  saveNow(): void {
    clearTimeout(this.#saveTimer);
    if (!this.game || !this.slot) return;
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

  nextWeek(): void {
    this.run(advanceWeek);
    this.saveNow();
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
    const summary = this.run((game) => finishHumanMatch(game, match));
    this.lastSummary = summary;
    this.saveNow();
    return summary;
  }

  leaveMatch(): void {
    this.match = null;
    this.go('dashboard');
  }
}

export const store = new AppStore();
