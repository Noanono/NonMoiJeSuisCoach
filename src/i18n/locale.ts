import { createSubscriber } from 'svelte/reactivity';

/**
 * Langue de l'interface (I18N-01). Le français reste la langue par défaut ; le choix du joueur
 * est gardé dans le navigateur. Lire `lang()` dans un composant, un `$derived` ou un `$effect`
 * l'abonne au changement : tout l'affichage se met à jour sans recharger la page.
 * Module TypeScript simple (pas de rune) pour rester utilisable par les tests et le domaine.
 */
export type Lang = 'fr' | 'en';

export const LANGS: readonly Lang[] = ['fr', 'en'];
export const DEFAULT_LANG: Lang = 'fr';
const STORAGE_KEY = 'nmjsc:lang';

let current: Lang = readStoredLang();
const listeners = new Set<() => void>();
const subscribe = createSubscriber((update) => {
  listeners.add(update);
  return () => listeners.delete(update);
});

function readStoredLang(): Lang {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : DEFAULT_LANG;
  } catch {
    // Navigation privée, stockage bloqué ou environnement sans navigateur (tests, serveur).
    return DEFAULT_LANG;
  }
}

/** Langue courante ; réactive dans l'UI Svelte. */
export function lang(): Lang {
  subscribe();
  return current;
}

/** Change la langue, la mémorise dans le navigateur et rafraîchit l'affichage. */
export function setLang(next: Lang): void {
  if (next === current) return;
  current = next;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, next);
  } catch {
    // Le choix vaut au moins pour cette session.
  }
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  for (const update of listeners) update();
}

/** Locale `Intl` de la langue courante (nombres, montants, dates). */
export function intlLocale(): string {
  return lang() === 'en' ? 'en-GB' : 'fr-FR';
}
