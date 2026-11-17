import type { AttributeName, Attributes, Player } from '../types';
import { clamp, type Rng } from '../core/rng';
import { overall } from '../player/rating';

const MIN_ATTRIBUTE = 1;
const MAX_ATTRIBUTE = 99;

/**
 * Âge où un jeune atteint son potentiel, en moyenne, à l'IA comme chez un coach : chaque saison,
 * il comble l'écart restant divisé par le nombre de saisons qui le séparent de cet âge.
 */
export const PEAK_AGE = 25;
/** Au-delà de cet âge, plus de progression naturelle. */
const GROWTH_MAX_AGE = 27;
/** Chaque saison varie de ±20 % autour du rythme prévu. */
const GROWTH_SPREAD = { min: 80, max: 120 } as const;

/** Saisons qui restent avant le pic (au moins une : un joueur en retard comble son écart d'un coup). */
export function seasonsToPeak(age: number): number {
  return Math.max(1, PEAK_AGE - age);
}
/** Au-delà de cet âge, le joueur décline (« plus de 31 ans »). */
const DECLINE_AFTER_AGE = 31;

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
/**
 * Joueur d'un coach : il progresse surtout à l'entraînement. À l'intersaison, il rattrape seulement une part
 * de son retard sur le calendrier (pic vers 25 ans), compté depuis sa note du début de la saison.
 */
export interface CoachedGrowth {
  /** Note au début de la saison qui se termine. */
  seasonStart: number;
}

/** Part du retard sur le calendrier rattrapée à l'intersaison par un joueur de coach. */
export const COACHED_CATCH_UP = 0.6;

export function developPlayer(player: Player, rng: Rng, coached?: CoachedGrowth): Player {
  const developed = player.age > DECLINE_AFTER_AGE ? decline(player, rng) : grow(player, rng, coached);
  return { ...developed, age: player.age + 1 };
}

/** Applique `developPlayer` à toute une liste de joueurs ; `coached` décrit ceux qui s'entraînent chez un coach. */
export function developPlayers(players: readonly Player[], rng: Rng, coached: (player: Player) => CoachedGrowth | undefined = () => undefined): Player[] {
  return players.map((player) => developPlayer(player, rng, coached(player)));
}

function grow(player: Player, rng: Rng, coached?: CoachedGrowth): Player {
  const rating = overall(player);
  const gap = player.potential - rating;
  if (player.age >= GROWTH_MAX_AGE || gap <= 0) return player;
  const spread = rng.int(GROWTH_SPREAD.min, GROWTH_SPREAD.max) / PERCENT;
  let gain: number;
  if (coached) {
    // Ce que le calendrier prévoyait pour cette saison, depuis la note du début de saison.
    const start = Math.min(coached.seasonStart, rating);
    const planned = start + ((player.potential - start) / seasonsToPeak(player.age)) * spread;
    gain = Math.min(gap, Math.round(Math.max(0, planned - rating) * COACHED_CATCH_UP));
  } else {
    // Au moins un point par saison.
    gain = Math.max(1, Math.round((gap / seasonsToPeak(player.age)) * spread));
  }
  if (gain <= 0) return player;
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
