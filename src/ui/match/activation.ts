/**
 * Fiche d'activation affichée avant de gueuler (CAP-13, CAP-16 à CAP-18) :
 * tout vient de `previewActivation`, l'UI ne fait que mettre en mots.
 */
import { RARITY_LABEL } from '../../domain/abilities/progression';
import { previewActivation, type ActivationPreview, type MatchState, type Side } from '../../domain/match';
import type { Position, Rarity } from '../../domain/types';
import type { AvatarPlayer } from '../kit/avatar';
import { describeEffect } from '../screens/describe';
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

export function abilitySheet(state: MatchState, coachSide: Side, playerId: string): AbilitySheet {
  const preview = previewActivation(state, coachSide, playerId);
  const team = coachSide === 'home' ? state.home : state.away;
  const player = team.players.find((candidate) => candidate.id === playerId);
  const ability = player?.ability ?? null;
  const cooldown = preview.cooldownRemaining > 0 ? `Recharge : encore ${preview.cooldownRemaining} min.` : null;
  const known = ability !== null && preview.revealed;
  return {
    playerName: player?.name ?? '?',
    avatar: player ? { id: player.id, age: player.profile.age, clubId: player.profile.clubId, position: player.profile.position } : null,
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
  };
}
