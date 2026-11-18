/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `1` dans la version CrazyGames du build (`.env.crazygames`). */
  readonly VITE_CRAZYGAMES?: string;
  /** Adresse qui donne les identifiants TURN temporaires (`/api/turn` par défaut, vide pour s'en passer). */
  readonly VITE_TURN_ENDPOINT?: string;
}
