/**
 * Trombines des joueurs : chaque visage est déduit de l'identifiant du joueur, sans rien
 * stocker ni charger. Le même joueur garde donc la même tête toute sa carrière ;
 * l'âge fait grisonner et dégarnir, le club habille le maillot.
 */
import type { Player } from '../../domain/types';

export type HairStyle = 'bald' | 'crew' | 'side' | 'mullet' | 'curly' | 'mohawk' | 'combover';
export type FacialHair = 'none' | 'moustache' | 'beard' | 'goatee' | 'stubble';
export type FaceShape = 'round' | 'long' | 'square';
export type Nose = 'small' | 'big' | 'red';
export type Eyes = 'dots' | 'tired' | 'wide';
export type Brows = 'plain' | 'angry' | 'unibrow';
export type Mouth = 'flat' | 'smile' | 'gap' | 'frown';
export type Extra = 'none' | 'headband' | 'earring' | 'plaster';
export type Jersey = 'plain' | 'stripes' | 'sash';

export interface AvatarTraits {
  face: FaceShape;
  skin: string;
  hair: HairStyle;
  hairColor: string;
  facialHair: FacialHair;
  nose: Nose;
  eyes: Eyes;
  brows: Brows;
  mouth: Mouth;
  extra: Extra;
  jersey: Jersey;
  jerseyColor: string;
  trimColor: string;
  backdrop: string;
}

export type AvatarPlayer = Pick<Player, 'id' | 'age' | 'clubId' | 'position'>;

const SKINS = ['#f6d3b3', '#eec19a', '#e0a97e', '#c68a5e', '#9a6340', '#6f4530'];
const HAIR_COLORS = ['#1f1a16', '#3c2a1c', '#6b4526', '#b9863d', '#a6452a'];
const GREY_HAIR = '#b9b6ad';
const WEIGHTED_HAIR: HairStyle[] = ['crew', 'crew', 'side', 'side', 'mullet', 'mullet', 'curly', 'mohawk', 'bald', 'combover'];
const FACIAL: FacialHair[] = ['none', 'none', 'none', 'moustache', 'moustache', 'beard', 'goatee', 'stubble'];
const NOSES: Nose[] = ['small', 'small', 'big', 'big', 'red'];
const EYES: Eyes[] = ['dots', 'dots', 'tired', 'wide'];
const BROWS: Brows[] = ['plain', 'plain', 'angry', 'unibrow'];
const MOUTHS: Mouth[] = ['flat', 'smile', 'smile', 'gap', 'frown'];
const EXTRAS: Extra[] = ['none', 'none', 'none', 'none', 'headband', 'earring', 'plaster'];
const FACES: FaceShape[] = ['round', 'long', 'square'];
const JERSEYS: Jersey[] = ['plain', 'stripes', 'sash'];

/** Couleurs de club : maillot, liseré, fond de vignette. */
const CLUB_COLORS: readonly (readonly [string, string, string])[] = [
  ['#c8201f', '#fbfaf2', '#f7d9d2'],
  ['#1d4fa8', '#fbfaf2', '#d3def3'],
  ['#1e7a3c', '#f6d743', '#d6ecd4'],
  ['#f28c1c', '#14130f', '#fbe6c7'],
  ['#6a2c91', '#f6d743', '#e6d7f0'],
  ['#14130f', '#f6d743', '#e4e0d2'],
  ['#0f8a8a', '#fbfaf2', '#cfeeee'],
  ['#a31d55', '#fbfaf2', '#f3d3e0'],
  ['#fbfaf2', '#c8201f', '#efede2'],
  ['#7a4a21', '#f2c879', '#efdfc9'],
];
const FREE_AGENT_COLORS = ['#8b8778', '#fbfaf2', '#e8e5da'] as const;
const KEEPER_JERSEY = '#e5d31f';

const GREYING_AGE = 31;
const BALDING_AGE = 33;

/** Hachage FNV-1a : stable d'une session à l'autre, sans dépendance. */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const cache = new Map<string, AvatarTraits>();

export function avatarTraits(player: AvatarPlayer): AvatarTraits {
  const key = `${player.id}|${player.age}|${player.clubId ?? ''}|${player.position}`;
  const known = cache.get(key);
  if (known) return known;
  const pick = <T>(salt: string, list: readonly T[]): T => list[hashSeed(player.id + salt) % list.length]!;
  const [jerseyColor, trimColor, backdrop] = player.clubId
    ? CLUB_COLORS[hashSeed(player.clubId) % CLUB_COLORS.length]!
    : FREE_AGENT_COLORS;
  const veteran = player.age >= GREYING_AGE && hashSeed(player.id + 'grey') % 2 === 0;
  const receding = player.age >= BALDING_AGE && hashSeed(player.id + 'bald') % 2 === 0;
  const traits: AvatarTraits = {
    face: pick('face', FACES),
    skin: pick('skin', SKINS),
    hair: receding ? pick('receding', ['bald', 'combover'] as const) : pick('hair', WEIGHTED_HAIR),
    hairColor: veteran ? GREY_HAIR : pick('hairColor', HAIR_COLORS),
    facialHair: pick('facial', FACIAL),
    nose: pick('nose', NOSES),
    eyes: pick('eyes', EYES),
    brows: pick('brows', BROWS),
    mouth: pick('mouth', MOUTHS),
    extra: pick('extra', EXTRAS),
    // Le maillot rayé est un motif de club, le gardien porte sa couleur.
    jersey: player.clubId ? JERSEYS[hashSeed(player.clubId + 'jersey') % JERSEYS.length]! : 'plain',
    jerseyColor: player.position === 'GK' ? KEEPER_JERSEY : jerseyColor,
    trimColor: player.position === 'GK' ? '#14130f' : trimColor,
    backdrop,
  };
  cache.set(key, traits);
  return traits;
}
