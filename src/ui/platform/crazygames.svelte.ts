/**
 * Intégration de CrazyGames (PLAT-01 à PLAT-07) : compte du joueur, sauvegarde dans son compte, événements de
 * jeu, salles et invitations pour la ligue entre amis. Hors CrazyGames (Netlify, dev), le SDK n'est pas chargé
 * et tout se rabat sur le navigateur : chaque méthode est alors sans effet.
 *
 * Le SDK s'active par la version CrazyGames du build (`bun run build:crazygames`) ou, en local, avec
 * `?useLocalSdk=true` dans l'adresse (le SDK simule alors un joueur connecté).
 */
import type { SaveStorage } from '../../domain/save/saveSlots';
import { createCloudStorage, type CloudStorage } from './cloudStorage';

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
/** Un SDK bloqué (bloqueur, réseau) ne doit pas empêcher de jouer. */
const SDK_TIMEOUT_MS = 8_000;

export interface CrazyUser {
  username: string;
  profilePictureUrl: string;
}

/** Paramètres passés à un ami qui accepte une invitation : le code du serveur de la ligue. */
export interface LeagueInviteParams {
  code?: string;
}

interface CrazySdk {
  init(): Promise<void>;
  environment: 'local' | 'crazygames' | 'disabled';
  game: {
    gameplayStart(): void;
    gameplayStop(): void;
    loadingStart(): void;
    loadingStop(): void;
    happytime(): void;
    isInstantMultiplayer?: boolean;
    inviteParams: Record<string, string> | null;
    inviteLink(params: Record<string, string>): string;
    updateRoom(room: { roomId?: string; isJoinable?: boolean; inviteParams?: Record<string, string> }): void;
    leftRoom(): void;
    addJoinRoomListener(listener: (params: Record<string, string>) => void): void;
  };
  user: {
    isUserAccountAvailable: boolean;
    getUser(): Promise<CrazyUser | null>;
    showAuthPrompt(): Promise<CrazyUser | null>;
    addAuthListener(listener: (user: CrazyUser | null) => void): void;
  };
  data: SaveStorage;
}

declare global {
  interface Window {
    CrazyGames?: { SDK: CrazySdk };
  }
}

function wanted(): boolean {
  if (import.meta.env.VITE_CRAZYGAMES === '1') return true;
  return typeof location !== 'undefined' && new URLSearchParams(location.search).get('useLocalSdk') === 'true';
}

function loadScript(): Promise<CrazySdk | null> {
  return new Promise((resolve) => {
    if (window.CrazyGames?.SDK) return resolve(window.CrazyGames.SDK);
    const timer = setTimeout(() => resolve(null), SDK_TIMEOUT_MS);
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.onload = () => {
      clearTimeout(timer);
      resolve(window.CrazyGames?.SDK ?? null);
    };
    script.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    document.head.append(script);
  });
}

/** Petites clés du navigateur (identité du coach) que le compte CrazyGames doit aussi suivre. */
export type SyncedKeys = readonly string[];

class CrazyGamesPlatform {
  /** SDK prêt, sur CrazyGames ou en local. */
  enabled = $state(false);
  /** Le site propose des comptes (pas sur les sites qui intègrent le jeu ailleurs). */
  accountAvailable = $state(false);
  user = $state<CrazyUser | null>(null);
  /** Lancé depuis l'accueil multijoueur de CrazyGames : on entre directement dans une ligue (PLAT-06). */
  instantMultiplayer = false;
  #sdk: CrazySdk | null = null;
  #storage: CloudStorage | null = null;
  #playing = false;
  #room: string | null = null;
  #joinListener: ((code: string) => void) | null = null;
  #pendingInvite: string | null = null;
  #onStorageError: (message: string) => void = () => {};

  /**
   * Charge et initialise le SDK, puis prépare la sauvegarde dans le compte. À attendre avant de monter le jeu :
   * les sauvegardes et l'identité du coach sont lues au démarrage.
   */
  async init(keys: SyncedKeys): Promise<void> {
    if (!wanted()) return;
    const sdk = await loadScript();
    if (!sdk) return;
    try {
      await sdk.init();
    } catch {
      return;
    }
    if (sdk.environment === 'disabled') return;
    this.#sdk = sdk;
    this.enabled = true;
    document.documentElement.classList.add('crazygames');
    sdk.game.loadingStart();

    this.instantMultiplayer = sdk.game.isInstantMultiplayer === true;
    this.#pendingInvite = sdk.game.inviteParams?.code ?? null;
    sdk.game.addJoinRoomListener((params) => {
      if (params.code) this.#deliverInvite(params.code);
    });

    this.accountAvailable = sdk.user.isUserAccountAvailable;
    if (this.accountAvailable) {
      this.user = await sdk.user.getUser().catch(() => null);
      // Connexion en cours de partie : le SDK recharge la page avec les données du compte ; on suit le pseudo d'ici là.
      sdk.user.addAuthListener((user) => (this.user = user));
    }

    try {
      this.#storage = await createCloudStorage(sdk.data, {
        keys,
        legacy: safeLocalStorage(),
        onError: (message) => this.#onStorageError(message),
      });
    } catch {
      // Module « data » désactivé (option non cochée à la soumission) : on reste sur le navigateur.
      this.#storage = null;
    }
  }

  /** Jeu monté et prêt : fin du chargement mesuré par CrazyGames. */
  loaded(): void {
    this.#sdk?.game.loadingStop();
  }

  /** Stockage du jeu : le compte CrazyGames s'il est là, sinon le navigateur. */
  storage(): SaveStorage {
    return this.#storage ?? safeLocalStorage() ?? memoryStorage;
  }

  onStorageError(listener: (message: string) => void): void {
    this.#onStorageError = listener;
  }

  /** Écrit tout de suite ce qui attend (avant de quitter, par exemple). */
  async flush(): Promise<void> {
    await this.#storage?.flush();
  }

  /** Pseudo du compte, affiché comme nom de coach (PLAT-02). */
  get username(): string | null {
    return this.user?.username ?? null;
  }

  /** Bouton « Se connecter » : jamais déclenché tout seul (exigence CrazyGames). */
  async login(): Promise<void> {
    const sdk = this.#sdk;
    if (!sdk) return;
    try {
      this.user = await sdk.user.showAuthPrompt();
    } catch {
      // Fenêtre fermée ou déjà connecté : rien à faire.
    }
  }

  /** Le joueur est en train de jouer (gestion, match) ou dans un menu (accueil, salle d'attente) (PLAT-04). */
  setGameplay(playing: boolean): void {
    if (!this.#sdk || playing === this.#playing) return;
    this.#playing = playing;
    if (playing) this.#sdk.game.gameplayStart();
    else this.#sdk.game.gameplayStop();
  }

  /** Moment rare à fêter (montée, titre) : confettis sur le site. */
  celebrate(): void {
    this.#sdk?.game.happytime();
  }

  // --- Ligue entre amis (PLAT-05 à PLAT-07) ----------------------------------------------

  /**
   * Salle courante du joueur : CrazyGames affiche alors « Inviter » et « Rejoindre » à ses amis.
   * `null` : il n'est dans aucune ligue. Seuls les changements partent au SDK.
   */
  setRoom(room: { code: string; joinable: boolean } | null): void {
    const sdk = this.#sdk;
    if (!sdk) return;
    if (!room) {
      if (this.#room !== null) sdk.game.leftRoom();
      this.#room = null;
      return;
    }
    const key = `${room.code}|${room.joinable}`;
    if (this.#room === key) return;
    this.#room = key;
    sdk.game.updateRoom({ roomId: room.code, isJoinable: room.joinable, inviteParams: { code: room.code } });
  }

  /** Lien d'invitation vers la page CrazyGames du jeu ; `null` hors CrazyGames (on garde le lien `#rejoindre=`). */
  inviteLink(code: string): string | null {
    try {
      return this.#sdk?.game.inviteLink({ code }) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Invitations acceptées : au lancement (lien d'un ami) et en cours de partie (bouton « Rejoindre » du site).
   * Une invitation arrivée avant l'abonnement est livrée tout de suite.
   */
  onInvite(listener: (code: string) => void): void {
    this.#joinListener = listener;
    const pending = this.#pendingInvite;
    this.#pendingInvite = null;
    if (pending) listener(pending);
  }

  #deliverInvite(code: string): void {
    if (this.#joinListener) this.#joinListener(code);
    else this.#pendingInvite = code;
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Sans aucun stockage (navigation privée stricte) : la partie dure le temps de l'onglet. */
const memoryItems = new Map<string, string>();
const memoryStorage: SaveStorage = {
  getItem: (key) => memoryItems.get(key) ?? null,
  setItem: (key, value) => void memoryItems.set(key, value),
  removeItem: (key) => void memoryItems.delete(key),
};

export const crazyGames = new CrazyGamesPlatform();
