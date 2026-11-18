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
  startFriendlyMatch,
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
import type { Transport } from './net/transport';
import { peerHost } from './net/peerHost.svelte';
import { PeerTransport } from './net/peerTransport';
import { formatCode, parseCode } from './net/serverCode';
import { crazyGames } from './platform/crazygames.svelte';
import type { SaveSlot, SlotSummary } from '../domain/save/saveSlots';

export type Screen = 'title' | 'lobby' | 'dashboard' | 'squad' | 'tactics' | 'training' | 'market' | 'club' | 'competitions' | 'stats' | 'match';

/** Délai d'écriture après une action de gestion : on regroupe les clics (green code). */
const AUTOSAVE_DELAY_MS = 1500;

/** Écrans de menu : tout le reste est du jeu, signalé à CrazyGames (PLAT-04). */
const MENU_SCREENS: ReadonlySet<Screen> = new Set(['title', 'lobby']);

/** Créées au premier usage : sur CrazyGames, le stockage du compte n'est prêt qu'après l'initialisation du SDK. */
let gameSaves: ReturnType<typeof createGameSaves> | null = null;
function saves(): ReturnType<typeof createGameSaves> {
  gameSaves ??= createGameSaves(crazyGames.storage());
  return gameSaves;
}

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
    crazyGames.setGameplay(!MENU_SCREENS.has(screen));
  }

  // --- Ligue entre amis (MULTI-01 à MULTI-05) ---------------------------------------

  /** Chemin vers l'hôte de la ligue ouverte : on le recrée pour se reconnecter (après un code de reprise). */
  #transportFactory: (() => Transport) | null = null;
  /** Code du serveur pair-à-pair rejoint, affiché dans la salle d'attente ; `null` pour l'hôte ou le réseau local. */
  serverCode = $state<string | null>(null);

  /** Se connecte à l'hôte (pair-à-pair, soi-même, ou réseau local) et ouvre la salle d'attente. */
  openMultiplayer(transport: () => Transport, serverCode: string | null = null): void {
    this.multi?.disconnect();
    this.#transportFactory = transport;
    this.serverCode = serverCode;
    const client = new MultiClient(
      transport(),
      (game) => this.receiveGame(game),
      (match, view) => this.receiveDuel(match, view),
      (message) => {
        // L'hôte a fermé la ligue, en a ouvert une autre, ou a refusé ce navigateur (MULTI-09, MULTI-14).
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

  /**
   * Rejoint la ligue d'un ami par le code de son serveur (MULTI-12), tapé, choisi dans la liste ou reçu par une
   * invitation CrazyGames (PLAT-05). Une partie solo en cours est sauvegardée avant. Renvoie `false` si le code est faux.
   */
  joinServer(raw: string): boolean {
    const parsed = parseCode(raw);
    if (!parsed) return false;
    const code = formatCode(parsed);
    if (this.multi && this.serverCode === code) return true;
    this.saveNow();
    this.openMultiplayer(() => new PeerTransport(parsed), code);
    return true;
  }

  /**
   * Multijoueur instantané (PLAT-06) : lancé depuis l'accueil multijoueur de CrazyGames, le joueur héberge
   * tout de suite une ligue privée (son serveur déjà en ligne, sinon le premier emplacement libre) et entre
   * dans sa salle d'attente, où ses amis peuvent le rejoindre. Renvoie `false` si les 3 ligues sont prises.
   */
  async startInstantLeague(): Promise<boolean> {
    if (peerHost.status !== 'online') {
      await peerHost.refreshSlots();
      const free = peerHost.slots.find((entry) => entry.status === 'empty');
      if (!free) return false;
      const reply = await peerHost.open(free.slot);
      if (!reply.ok) return false;
    }
    this.openMultiplayer(() => peerHost.loopback());
    return true;
  }

  /** Code de reprise accepté : ce navigateur a changé d'identité, on se reconnecte avec elle (C10). */
  async claimClub(code: string): Promise<string> {
    const multi = this.multi;
    const factory = this.#transportFactory;
    if (!multi || !factory) return 'Pas connecté à une ligue.';
    const reply = await multi.claim(code);
    if (!reply.ok) return reply.message ?? 'Code refusé.';
    this.openMultiplayer(factory, this.serverCode);
    this.notify(reply.message ?? 'Club retrouvé !');
    return reply.message ?? 'Club retrouvé !';
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
    const tierBefore = this.game ? humanTier(this.game) : null;
    this.game = game;
    this.#celebratePromotion(tierBefore);
    this.version += 1;
    if (this.screen === 'lobby' || this.screen === 'title') this.go('dashboard');
  }

  // --- Sauvegardes (TECH-03, TECH-04) -------------------------------------------------

  listSlots(): SlotSummary[] {
    return saves().list();
  }

  startNewGame(slot: SaveSlot, clubName: string, difficulty: Difficulty = 'normal'): void {
    this.game = newGame({ seed: Date.now() % 2_147_483_647, clubName, difficulty });
    this.slot = slot;
    this.version += 1;
    this.saveNow();
    this.go('dashboard');
  }

  load(slot: SaveSlot): void {
    const game = saves().load(slot);
    // Anciennes sauvegardes : les capacités de son effectif sont désormais toujours connues (CLUB-10).
    if (game) revealOwnSquads(game);
    this.game = game;
    this.slot = slot;
    this.version += 1;
    this.go('dashboard');
  }

  removeSlot(slot: SaveSlot): void {
    saves().remove(slot);
  }

  quitToTitle(): void {
    this.saveNow();
    this.multi?.disconnect();
    this.multi = null;
    this.#transportFactory = null;
    this.serverCode = null;
    this.game = null;
    this.match = null;
    this.go('title');
  }

  saveNow(): void {
    clearTimeout(this.#saveTimer);
    // En multi, c'est le serveur de l'hôte qui sauvegarde.
    if (!this.game || !this.slot || this.multi) return;
    try {
      saves().save(this.slot, this.game, saveMeta(this.game));
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
      const tierBefore = this.game ? humanTier(this.game) : null;
      this.run(advanceWeek);
      this.#celebratePromotion(tierBefore);
      this.saveNow();
      return;
    }
    const ready = !multi.me?.ready;
    void multi.setReady(ready).then((reply) => {
      if (!reply.ok) this.notify(reply.message ?? 'Pas encore.');
      else if (ready) this.notify((reply.value as { advanced?: boolean } | undefined)?.advanced ? reply.message ?? 'Semaine suivante !' : 'Prêt ! On attend les autres coachs.');
    });
  }

  /** Montée en division supérieure : confettis sur CrazyGames, moment rare (PLAT-04). */
  #celebratePromotion(tierBefore: number | null): void {
    if (this.game && tierBefore !== null && humanTier(this.game) < tierBefore) crazyGames.celebrate();
  }

  /** Le match en cours est l'amical de la saison contre une équipe étrangère (UNIV-10). */
  friendlyMatch = false;

  kickOff(): void {
    this.match = this.run((game) => withRng(game, (rng) => startHumanMatch(game, rng)));
    this.friendlyMatch = false;
    this.lastSummary = null;
    this.matchVersion += 1;
    this.go('match');
  }

  /** Coup d'envoi de l'amical contre l'équipe étrangère de la semaine. */
  kickOffFriendly(): void {
    this.match = this.run((game) => withRng(game, (rng) => startFriendlyMatch(game, rng)));
    this.friendlyMatch = true;
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
    if (this.friendlyMatch) this.command('submitFriendly', summary);
    else if (!this.duelKey) this.command('submitMatch', summary);
    this.friendlyMatch = false;
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

/** Niveau de la division du club du coach (1 = élite). */
function humanTier(game: GameState): number {
  const divisionId = game.clubs[game.humanClubId]?.divisionId;
  return game.divisions.find((division) => division.id === divisionId)?.tier ?? Number.POSITIVE_INFINITY;
}

export const store = new AppStore();

crazyGames.onStorageError((message) => store.notify(`Sauvegarde dans ton compte CrazyGames impossible : ${message}`));

