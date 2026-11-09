/**
 * Présentation du terrain en direct (CAP-03, CAP-09, CAP-16, CAP-17) : placement des
 * joueurs par ligne, état de chaque jeton et effets actifs. Fonctions pures, sans Svelte.
 */
import { activeEffects, type ActiveEffectView, type MatchPlayer, type MatchState, type Side } from '../../domain/match';
import type { Position } from '../../domain/types';

/** Ordre des lignes du coach, de son but vers l'attaque. L'adversaire est en miroir. */
const LINE_ORDER: readonly Position[] = ['GK', 'DEF', 'MID', 'ATT'];

export const LINE_LABEL: Record<Position, string> = {
  GK: 'Gardien',
  DEF: 'Défense',
  MID: 'Milieu',
  ATT: 'Attaque',
};

export interface PitchColumn {
  key: string;
  side: Side;
  line: Position;
  players: MatchPlayer[];
}

export function opposite(side: Side): Side {
  return side === 'home' ? 'away' : 'home';
}

/**
 * Huit colonnes face à face : le coach de son gardien à son attaque, puis l'adversaire
 * de son attaque à son gardien. Exclus et blessés gardent leur place (grisés).
 */
export function pitchColumns(state: MatchState, coachSide: Side): PitchColumn[] {
  const coach = LINE_ORDER.map((line) => column(state, coachSide, line));
  const opponent = [...LINE_ORDER].reverse().map((line) => column(state, opposite(coachSide), line));
  return [...coach, ...opponent];
}

function column(state: MatchState, side: Side, line: Position): PitchColumn {
  const team = side === 'home' ? state.home : state.away;
  return { key: `${side}-${line}`, side, line, players: team.players.filter((player) => player.line === line) };
}

/** Remplaçants d'un camp, pour les capacités « Banc » (CAP-03). */
export function benchPlayers(state: MatchState, side: Side): MatchPlayer[] {
  const team = side === 'home' ? state.home : state.away;
  return team.players.filter((player) => player.line === null);
}

export type Availability = 'active' | 'sentOff' | 'injured' | 'knockedOut';

export const AVAILABILITY_LABEL: Record<Exclude<Availability, 'active'>, string> = {
  sentOff: 'Exclu',
  injured: 'Blessé',
  knockedOut: 'Au sol',
};

/** Pourquoi un joueur est grisé sur le terrain, `active` s'il joue. */
export function availability(player: MatchPlayer, elapsed: number): Availability {
  if (player.sentOff) return 'sentOff';
  if (player.injured) return 'injured';
  if (player.knockedOutUntil >= elapsed) return 'knockedOut';
  return 'active';
}

/** Nom court du jeton : le nom de famille, le prénom en secours. */
export function shortName(player: MatchPlayer): string {
  return player.profile.lastName || player.profile.firstName || player.name;
}

const STAT_LABEL: Record<ActiveEffectView['stat'], string> = {
  all: 'toutes stats',
  speed: 'vitesse',
  technique: 'technique',
  physical: 'physique',
  shooting: 'tir',
  defense: 'défense',
  goalkeeping: 'arrêts',
  concentration: 'concentration',
  aggression: 'agressivité',
  morale: 'moral',
  knockout: 'hors jeu',
};

const PERCENT = 100;

export interface EffectChip {
  tone: 'bonus' | 'malus';
  /** Signe toujours affiché avec la couleur (design system). */
  sign: '+' | '−';
  /** Compte à rebours court : « 12' » ou « fin » (jusqu'au coup de sifflet). */
  countdown: string;
  /** Texte complet pour l'accessibilité et le panneau du joueur. */
  detail: string;
}

/** Effets actifs d'un joueur en pastilles bonus / malus avec compte à rebours (CAP-09). */
export function effectChips(state: MatchState, playerId: string): EffectChip[] {
  return activeEffects(state, playerId).map(toChip);
}

export function toChip(effect: ActiveEffectView): EffectChip {
  const bonus = effect.value > 0;
  const sign = bonus ? '+' : '−';
  const countdown = effect.remaining === null ? 'fin' : `${effect.remaining}'`;
  const amount = effect.stat === 'knockout' ? '' : ` ${Math.round(Math.abs(effect.value) * PERCENT)} %`;
  const duration = effect.remaining === null ? "jusqu'au coup de sifflet" : `encore ${effect.remaining} min`;
  return {
    tone: bonus ? 'bonus' : 'malus',
    sign,
    countdown,
    detail: `${effect.label} : ${sign}${amount} ${STAT_LABEL[effect.stat]}, ${duration}`,
  };
}
