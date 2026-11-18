/**
 * Présentation du terrain en direct (CAP-03, CAP-09, CAP-16, CAP-17) : placement des
 * joueurs par ligne, état de chaque jeton et effets actifs. Fonctions pures, sans Svelte.
 */
import { activeEffects, canEnter, canLeave, previewActivation, type ActiveEffectView, type MatchPlayer, type MatchState, type Side } from '../../domain/match';
import { ratingAtPosition } from '../../domain/player/rating';
import type { Position, Rarity } from '../../domain/types';
import type { AvatarPlayer } from '../kit/avatar';
import { POSITION_SHORT } from '../screens/describe';
import { localized } from '../../i18n/localized';
import { t, td } from '../../i18n/t';

/** Ordre des lignes du coach, de son but vers l'attaque. L'adversaire est en miroir. */
const LINE_ORDER: readonly Position[] = ['GK', 'DEF', 'MID', 'ATT'];

export const LINE_LABEL = localized<Position>({
  fr: { GK: 'Gardien', DEF: 'Défense', MID: 'Milieu', ATT: 'Attaque' },
  en: { GK: 'Goal', DEF: 'Defence', MID: 'Midfield', ATT: 'Attack' },
});

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

export const AVAILABILITY_LABEL = localized<Exclude<Availability, 'active'>>({
  fr: { sentOff: 'Exclu', injured: 'Blessé', knockedOut: 'Au sol' },
  en: { sentOff: 'Sent off', injured: 'Injured', knockedOut: 'Down' },
});

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
  if (pending && pending.side === coachSide) {
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
  /** Note au poste occupé, sans la fatigue. */
  rating: number;
  /** Énergie restante, de 0 à 100. */
  energy: number;
  own: boolean;
  status: Availability;
  /** Raison affichée sur le jeton grisé (« Exclu », « Banc »…). */
  reason: string | null;
  chips: EffectChip[];
  focus: TokenFocus;
  /** Le jeton peut être glissé pour faire un changement. */
  draggable: boolean;
  /** Coût de la capacité si elle peut partir maintenant, `null` sinon. */
  readyCost: number | null;
  readyRarity: Rarity | null;
  /** Adversaire : rareté de sa capacité, en liseré, si elle est connue (une capacité cachée ne se trahit pas). */
  opponentRarity: Rarity | null;
  /** Le joueur est sous l'effet d'une capacité : le malus l'emporte, c'est ce qu'il faut voir. */
  halo: 'bonus' | 'malus' | null;
  /** Libellé complet pour les lecteurs d'écran. */
  label: string;
}

const RARITY_WORD = localized<Rarity>({
  fr: { common: 'commune', rare: 'rare', legendary: 'légendaire', mythic: 'mythique', foreign: 'étrangère' },
  en: { common: 'common', rare: 'rare', legendary: 'legendary', mythic: 'mythic', foreign: 'foreign' },
});

/** Tout ce qu'un jeton affiche, calculé une fois par minute de jeu. */
export function tokenView(state: MatchState, player: MatchPlayer, coachSide: Side): TokenView {
  const own = player.side === coachSide;
  const status = availability(player, state.elapsed);
  const benchOnly = player.line === null && player.ability?.position !== 'BENCH';
  const reason = player.subbedOff ? t('pitch.subbed') : status !== 'active' ? AVAILABILITY_LABEL[status] : benchOnly ? t('pitch.bench') : null;
  const chips = effectChips(state, player.id);
  const focus = tokenFocus(state, player, coachSide);
  const ready = own && state.pending === null && state.status !== 'finished' && previewActivation(state, coachSide, player.id);
  const readyCost = ready && ready.available ? ready.cost : null;
  const readyRarity = readyCost !== null ? (player.ability?.rarity ?? null) : null;
  const halo = chips.some((chip) => chip.tone === 'malus') ? 'malus' : chips.length > 0 ? 'bonus' : null;
  const known = player.ability !== null && (player.abilityRevealed || !player.ability.hidden);
  const opponentRarity = !own && known ? player.ability!.rarity : null;
  const avatar = { id: player.id, age: player.profile.age, clubId: player.profile.clubId, position: player.profile.position, nationality: player.profile.nationality };
  const rating = Math.round(ratingAtPosition(player.profile, player.line ?? player.profile.position));
  const energy = Math.round(100 - player.profile.fatigue);
  const position = POSITION_SHORT[player.profile.position];
  const displaced = player.line !== null && player.line !== player.profile.position;
  const parts = [player.name, position, player.line ? LINE_LABEL[player.line] : t('pitch.substitute'), t('pitch.rating', { rating }), t('pitch.energy', { energy })];
  if (displaced) parts.push(t('lineup.outOfPosition'));
  if (reason) parts.push(reason);
  parts.push(...chips.map((chip) => chip.detail));
  if (readyCost !== null) parts.push(t('pitch.ready', { cost: readyCost }));
  if (opponentRarity) parts.push(t('pitch.opponentAbility', { rarity: RARITY_WORD[opponentRarity] }));
  if (focus.chosen) parts.push(t('pitch.chosen'));
  else if (focus.highlighted) parts.push(state.pending ? t('pitch.validTarget') : t('pitch.canAct'));
  return { id: player.id, name: shortName(player), avatar, position, displaced, rating, energy, own, status, reason, chips, focus, readyCost, readyRarity, opponentRarity, halo, draggable: own && focus.interactive && state.pending === null && (canLeave(player) || canEnter(player)), label: parts.join(', ') };
}

export interface PitchView {
  columns: { key: string; label: string; tokens: TokenView[]; /** Ligne du coach (on peut y glisser un joueur), `null` chez l'adversaire. */ line: Position | null }[];
  bench: TokenView[];
}

/** Terrain complet et banc du coach, pour un rendu par minute. */
export function pitchView(state: MatchState, coachSide: Side): PitchView {
  const toView = (player: MatchPlayer) => tokenView(state, player, coachSide);
  return {
    columns: pitchColumns(state, coachSide).map((column) => ({
      key: column.key,
      label: column.side === coachSide ? t('pitch.ownLine', { line: LINE_LABEL[column.line] }) : t('pitch.theirLine', { line: LINE_LABEL[column.line] }),
      tokens: column.players.map(toView),
      line: column.side === coachSide ? column.line : null,
    })),
    bench: benchPlayers(state, coachSide).map(toView),
  };
}

/** Nom court du jeton : le nom de famille, le prénom en secours. */
export function shortName(player: MatchPlayer): string {
  return player.profile.lastName || player.profile.firstName || player.name;
}

const STAT_LABEL = localized<ActiveEffectView['stat']>({
  fr: {
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
    shield: 'bouclier',
    steady: 'impossible à mettre au sol',
  },
  en: {
    all: 'all stats',
    speed: 'speed',
    technique: 'technique',
    physical: 'physical',
    shooting: 'shooting',
    defense: 'defending',
    goalkeeping: 'saves',
    concentration: 'focus',
    knockout: 'out of action',
    swap: 'levels swapped',
    shield: 'shield',
    steady: 'cannot be knocked down',
  },
});

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
  const countdown = effect.remaining === null ? t('pitch.end') : `${effect.remaining}'`;
  const duration = effect.remaining === null ? t('pitch.untilWhistle') : t('pitch.remaining', { minutes: effect.remaining });
  const label = td(effect.label);
  if (effect.stat === 'shield' || effect.stat === 'steady') {
    const what = effect.stat === 'shield' ? (effect.value > 1 ? t('pitch.shieldMany', { count: effect.value }) : t('pitch.shieldOne')) : STAT_LABEL.steady;
    return { stat: effect.stat, tone: 'bonus', sign: '+', countdown, detail: `${label}${t('common.colon')}${what}, ${duration}` };
  }
  const amount = effect.stat === 'knockout' || effect.stat === 'swap' ? '' : ` ${t('pitch.percent', { value: Math.round(Math.abs(effect.value) * PERCENT) })}`;
  const marked = effect.markedBy ? t('pitch.markedBy', { player: effect.markedBy }) : '';
  return {
    stat: effect.stat,
    tone: bonus ? 'bonus' : 'malus',
    sign,
    countdown,
    detail: `${label}${t('common.colon')}${sign}${amount} ${STAT_LABEL[effect.stat]}${marked}, ${duration}`,
  };
}
