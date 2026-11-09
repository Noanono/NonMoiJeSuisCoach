/**
 * Fiche d'activation affichée avant de gueuler (CAP-13, CAP-16 à CAP-18) :
 * tout vient de `previewActivation`, l'UI ne fait que mettre en mots.
 */
import { RARITY_LABEL } from '../../domain/abilities/progression';
import { canEnter, canLeave, MAX_SUBSTITUTIONS, previewActivation, substitutionsLeft, type ActivationPreview, type MatchPlayer, type MatchState, type Side } from '../../domain/match';
import { effectiveRating } from '../../domain/player/rating';
import type { Position, Rarity } from '../../domain/types';
import type { AvatarPlayer } from '../kit/avatar';
import { describeEffect, POSITION_SHORT } from '../screens/describe';
import { effectChips } from './pitch';

const HIDDEN_DESCRIPTION = "Capacité cachée : tu sauras ce qu'elle fait en gueulant.";

const LINE_WORD: Record<Position, string> = { GK: 'gardien', DEF: 'défenseur', MID: 'milieu', ATT: 'attaquant' };

export interface AbilitySheet {
  playerName: string;
  avatar: AvatarPlayer | null;
  /** « ??? » tant que la capacité est cachée. */
  abilityName: string;
  rarity: { key: Rarity; label: string } | null;
  description: string;
  /** Ce que fait la capacité, au niveau du joueur. */
  abilityEffects: string[];
  targeting: string;
  cost: number;
  gauge: number;
  available: boolean;
  /** Raison d'indisponibilité ou recharge restante, `null` si rien ne bloque. */
  status: string | null;
  /** Effets actifs du joueur, en clair (CAP-09). */
  active: string[];
  /** Poste naturel et poste occupé, s'il est sur le terrain. */
  position: string;
  energy: number;
  substitution: SubstitutionPanel | null;
}

export interface SubstitutionOption {
  /** Joueur qui sort et joueur qui entre si le coach choisit cette ligne. */
  leavingId: string;
  enteringId: string;
  /** Le joueur proposé. */
  name: string;
  avatar: AvatarPlayer;
  position: string;
  /** Note de celui qui entrerait, au poste libéré. */
  rating: number;
  displaced: boolean;
  /** Énergie du joueur proposé. */
  energy: number;
}

export interface SubstitutionPanel {
  title: string;
  left: number;
  max: number;
  options: SubstitutionOption[];
}

function avatarOf(player: MatchPlayer): AvatarPlayer {
  return { id: player.id, age: player.profile.age, clubId: player.profile.clubId, position: player.profile.position };
}

function energyOf(player: MatchPlayer): number {
  return Math.round(100 - player.profile.fatigue);
}

/** Changements possibles depuis le panneau d'un joueur (MATCH-08), `null` s'il n'est pas concerné. */
export function substitutionPanel(state: MatchState, coachSide: Side, playerId: string): SubstitutionPanel | null {
  const team = coachSide === 'home' ? state.home : state.away;
  const player = team.players.find((candidate) => candidate.id === playerId);
  if (!player || state.status === 'finished') return null;
  const left = substitutionsLeft(team);
  const base = { left, max: MAX_SUBSTITUTIONS };
  if (canLeave(player)) {
    const line = player.line!;
    const options = team.players.filter(canEnter).map((entering) => ({
      leavingId: player.id,
      enteringId: entering.id,
      name: entering.name,
      avatar: avatarOf(entering),
      position: POSITION_SHORT[entering.profile.position],
      rating: Math.round(effectiveRating(entering.profile, line)),
      displaced: entering.profile.position !== line,
      energy: energyOf(entering),
    }));
    return { ...base, title: 'Remplacer par', options };
  }
  if (canEnter(player)) {
    const options = team.players.filter(canLeave).map((leaving) => ({
      leavingId: leaving.id,
      enteringId: player.id,
      name: leaving.name,
      avatar: avatarOf(leaving),
      position: POSITION_SHORT[leaving.line!],
      rating: Math.round(effectiveRating(player.profile, leaving.line!)),
      displaced: player.profile.position !== leaving.line,
      energy: energyOf(leaving),
    }));
    return { ...base, title: 'Entrer à la place de', options };
  }
  return null;
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

/** Ce que vise la capacité (CAP-17) et le « au hasard » (CAP-18). */
export function targetingText(preview: ActivationPreview): string {
  const count = Math.max(1, preview.targetCount);
  switch (preview.targeting) {
    case 'self':
      return 'Lui-même';
    case 'team':
      return 'Toute ton équipe';
    case 'opponentTeam':
      return "Toute l'équipe adverse";
    case 'zone':
      return 'Sa zone du terrain : tu choisis le moment, pas la cible';
    case 'teammate':
      return `${plural(count, 'coéquipier')}${preview.targetDowned ? ' au sol' : ''}, à choisir sur le terrain`;
    case 'opponent':
      return `${plural(count, preview.targetLine ? LINE_WORD[preview.targetLine] : 'adversaire')}, à choisir sur le terrain`;
    case 'randomOpponent':
      return `${plural(count, 'adversaire')} au hasard`;
    case null:
      return 'Aucune';
  }
}

function positionText(player: MatchPlayer): string {
  const natural = POSITION_SHORT[player.profile.position];
  if (player.line === null) return `${natural} · sur le banc`;
  return player.line === player.profile.position ? natural : `${natural}, joue ${POSITION_SHORT[player.line]} (hors poste)`;
}

export function abilitySheet(state: MatchState, coachSide: Side, playerId: string): AbilitySheet {
  const preview = previewActivation(state, coachSide, playerId);
  const team = coachSide === 'home' ? state.home : state.away;
  const player = team.players.find((candidate) => candidate.id === playerId);
  const ability = player?.ability ?? null;
  const cooldown = preview.cooldownRemaining > 0 ? `Recharge : encore ${preview.cooldownRemaining} min.` : null;
  const known = ability !== null && preview.revealed;
  return {
    playerName: player?.name ?? '?',
    avatar: player ? avatarOf(player) : null,
    abilityName: preview.abilityName,
    rarity: preview.rarity ? { key: preview.rarity, label: RARITY_LABEL[preview.rarity] } : null,
    description: !ability ? '' : known ? ability.description : HIDDEN_DESCRIPTION,
    abilityEffects: known ? ability.effects.map(describeEffect) : [],
    targeting: targetingText(preview),
    cost: preview.cost,
    gauge: preview.gauge,
    available: preview.available,
    status: preview.reason ?? cooldown,
    active: effectChips(state, playerId).map((chip) => chip.detail),
    position: player ? positionText(player) : '',
    energy: player ? energyOf(player) : 0,
    substitution: substitutionPanel(state, coachSide, playerId),
  };
}
