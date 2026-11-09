import type { AttributeName, Attributes, Player } from '../types';
import { clamp, type Rng } from '../core/rng';
import { overall } from '../player/rating';

const MIN_ATTRIBUTE = 1;
const MAX_ATTRIBUTE = 99;

/** Jusqu'à cet âge, le joueur comble une bonne part de l'écart avec son potentiel. */
const FAST_GROWTH_MAX_AGE = 23;
/** Jusqu'à cet âge, il progresse encore un peu. */
const SLOW_GROWTH_MAX_AGE = 27;
/** Au-delà de cet âge, le joueur décline (« plus de 31 ans »). */
const DECLINE_AFTER_AGE = 31;

/** Part de l'écart au potentiel comblée en une saison, en pourcentage. */
const FAST_GROWTH_RATE = { min: 25, max: 50 } as const;
const SLOW_GROWTH_RATE = { min: 10, max: 20 } as const;
const PERCENT = 100;

const MIN_DECLINE = 1;
const MAX_DECLINE = 3;
/** Le physique et la vitesse partent plus vite que la technique. */
const ATHLETIC_DECLINE_FACTOR = 2;
const ATHLETIC_ATTRIBUTES: ReadonlySet<AttributeName> = new Set(['speed', 'physical']);

/**
 * Progression de fin de saison, sans effet de bord : renvoie un nouveau joueur.
 * Les jeunes montent vers leur potentiel, les plus de 31 ans déclinent, et tout le monde prend un an.
 */
export function developPlayer(player: Player, rng: Rng): Player {
  const developed = player.age > DECLINE_AFTER_AGE ? decline(player, rng) : grow(player, rng);
  return { ...developed, age: player.age + 1 };
}

/** Applique `developPlayer` à toute une liste de joueurs. */
export function developPlayers(players: readonly Player[], rng: Rng): Player[] {
  return players.map((player) => developPlayer(player, rng));
}

function growthRate(age: number): { min: number; max: number } | null {
  if (age <= FAST_GROWTH_MAX_AGE) return FAST_GROWTH_RATE;
  if (age <= SLOW_GROWTH_MAX_AGE) return SLOW_GROWTH_RATE;
  return null;
}

function grow(player: Player, rng: Rng): Player {
  const rate = growthRate(player.age);
  const gap = player.potential - overall(player);
  if (rate === null || gap <= 0) return player;
  const gain = Math.max(1, Math.round((gap * rng.int(rate.min, rate.max)) / PERCENT));
  // Tous les attributs montent d'autant : la note globale (moyenne pondérée) monte donc de `gain`.
  return { ...player, attributes: shiftAttributes(player.attributes, () => gain) };
}

function decline(player: Player, rng: Rng): Player {
  const loss = rng.int(MIN_DECLINE, MAX_DECLINE) + (player.age - DECLINE_AFTER_AGE - 1);
  const attributes = shiftAttributes(player.attributes, (name) =>
    ATHLETIC_ATTRIBUTES.has(name) ? -loss * ATHLETIC_DECLINE_FACTOR : -loss,
  );
  const declined = { ...player, attributes };
  return { ...declined, potential: Math.min(player.potential, overall(declined)) };
}

function shiftAttributes(attributes: Attributes, delta: (name: AttributeName) => number): Attributes {
  const shifted = { ...attributes };
  for (const name of Object.keys(shifted) as AttributeName[]) {
    shifted[name] = clamp(shifted[name] + delta(name), MIN_ATTRIBUTE, MAX_ATTRIBUTE);
  }
  return shifted;
}
