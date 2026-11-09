/**
 * Présentation du terrain en direct (CAP-03, CAP-09, CAP-16, CAP-17) : placement des
 * joueurs par ligne, état de chaque jeton et effets actifs. Fonctions pures, sans Svelte.
 */
import { activeEffects, previewActivation, type ActiveEffectView, type MatchPlayer, type MatchState, type Side } from '../../domain/match';
import type { Position, Rarity } from '../../domain/types';
import type { AvatarPlayer } from '../kit/avatar';
import { POSITION_SHORT } from '../screens/describe';

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

export interface TokenFocus {
  /** Le jeton est un bouton actif (ouvrir le panneau, choisir une cible). */
  interactive: boolean;
  /** Cible valide ou joueur éligible : contour scotch épais. */
  highlighted: boolean;
  /** Cible déjà choisie. */
  chosen: boolean;
  /** Grisé pendant le ciblage : pas une cible valide (CAP-16). */
  dimmed: boolean;
}

const IDLE: TokenFocus = { interactive: false, highlighted: false, chosen: false, dimmed: false };

/**
 * Rôle d'un jeton selon ce que le match attend : ciblage (CAP-16, CAP-17), fenêtre
 * d'événement (CAP-19) ou jeu courant, où seuls les joueurs du coach se touchent (CAP-03).
 */
export function tokenFocus(state: MatchState, player: MatchPlayer, coachSide: Side): TokenFocus {
  if (state.status === 'finished') return IDLE;
  const pending = state.pending;
  if (pending) {
    const chosen = pending.targetIds.includes(player.id);
    const valid = !chosen && pending.targetIds.length < pending.required && pending.validTargetIds.includes(player.id);
    return { interactive: valid, highlighted: valid || chosen, chosen, dimmed: !valid && !chosen && player.id !== pending.playerId };
  }
  const own = player.side === coachSide;
  const window = state.awaiting;
  const eligible = window !== null && window.side === coachSide && window.eligiblePlayerIds.includes(player.id);
  return { interactive: own, highlighted: eligible, chosen: false, dimmed: false };
}

export interface TokenView {
  id: string;
  name: string;
  avatar: AvatarPlayer;
  /** Poste naturel du joueur. */
  position: string;
  /** Il joue hors de son poste (EFF-02). */
  displaced: boolean;
  rating: number;
  /** Énergie restante, de 0 à 100. */
  energy: number;
  own: boolean;
  status: Availability;
  /** Raison affichée sur le jeton grisé (« Exclu », « Banc »…). */
  reason: string | null;
  chips: EffectChip[];
  focus: TokenFocus;
  /** Coût de la capacité si elle peut partir maintenant, `null` sinon. */
  readyCost: number | null;
  readyRarity: Rarity | null;
  /** Le joueur est sous l'effet d'une capacité : le malus l'emporte, c'est ce qu'il faut voir. */
  halo: 'bonus' | 'malus' | null;
  /** Libellé complet pour les lecteurs d'écran. */
  label: string;
}

const BENCH_REASON = 'Banc';
const SUBBED_REASON = 'Sorti';

/** Tout ce qu'un jeton affiche, calculé une fois par minute de jeu. */
export function tokenView(state: MatchState, player: MatchPlayer, coachSide: Side): TokenView {
  const own = player.side === coachSide;
  const status = availability(player, state.elapsed);
  const benchOnly = player.line === null && player.ability?.position !== 'BENCH';
  const reason = player.subbedOff ? SUBBED_REASON : status !== 'active' ? AVAILABILITY_LABEL[status] : benchOnly ? BENCH_REASON : null;
  const chips = effectChips(state, player.id);
  const focus = tokenFocus(state, player, coachSide);
  const ready = own && state.pending === null && state.status !== 'finished' && previewActivation(state, coachSide, player.id);
  const readyCost = ready && ready.available ? ready.cost : null;
  const readyRarity = readyCost !== null ? (player.ability?.rarity ?? null) : null;
  const halo = chips.some((chip) => chip.tone === 'malus') ? 'malus' : chips.length > 0 ? 'bonus' : null;
  const avatar = { id: player.id, age: player.profile.age, clubId: player.profile.clubId, position: player.profile.position };
  const rating = Math.round(player.rating);
  const energy = Math.round(100 - player.profile.fatigue);
  const position = POSITION_SHORT[player.profile.position];
  const displaced = player.line !== null && player.line !== player.profile.position;
  const parts = [player.name, position, player.line ? LINE_LABEL[player.line] : 'remplaçant', `note ${rating}`, `énergie ${energy} %`];
  if (displaced) parts.push('hors poste');
  if (reason) parts.push(reason);
  parts.push(...chips.map((chip) => chip.detail));
  if (readyCost !== null) parts.push(`capacité prête, coût ${readyCost}`);
  if (focus.chosen) parts.push('cible choisie');
  else if (focus.highlighted) parts.push(state.pending ? 'cible valide' : 'peut agir maintenant');
  return { id: player.id, name: shortName(player), avatar, position, displaced, rating, energy, own, status, reason, chips, focus, readyCost, readyRarity, halo, label: parts.join(', ') };
}

export interface PitchView {
  columns: { key: string; label: string; tokens: TokenView[] }[];
  bench: TokenView[];
}

/** Terrain complet et banc du coach, pour un rendu par minute. */
export function pitchView(state: MatchState, coachSide: Side): PitchView {
  const toView = (player: MatchPlayer) => tokenView(state, player, coachSide);
  return {
    columns: pitchColumns(state, coachSide).map((column) => ({
      key: column.key,
      label: `${column.side === coachSide ? 'Ta' : 'Leur'} ligne : ${LINE_LABEL[column.line]}`,
      tokens: column.players.map(toView),
    })),
    bench: benchPlayers(state, coachSide).map(toView),
  };
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
  knockout: 'hors jeu',
  swap: 'niveaux inversés',
};

const PERCENT = 100;

export interface EffectChip {
  stat: ActiveEffectView['stat'];
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
  const amount = effect.stat === 'knockout' || effect.stat === 'swap' ? '' : ` ${Math.round(Math.abs(effect.value) * PERCENT)} %`;
  const duration = effect.remaining === null ? "jusqu'au coup de sifflet" : `encore ${effect.remaining} min`;
  return {
    stat: effect.stat,
    tone: bonus ? 'bonus' : 'malus',
    sign,
    countdown,
    detail: `${effect.label} : ${sign}${amount} ${STAT_LABEL[effect.stat]}, ${duration}`,
  };
}
