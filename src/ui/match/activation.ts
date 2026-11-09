/**
 * Fiche d'activation affichée avant de gueuler (CAP-07, CAP-13, CAP-16 à CAP-18) :
 * tout vient de `previewActivation`, l'UI ne fait que mettre en mots.
 */
import { previewActivation, type ActivationPreview, type MatchState, type Side } from '../../domain/match';
import type { Range } from '../../domain/types';
import { formatPercent } from '../format';
import { effectChips } from './pitch';

const HIDDEN_DESCRIPTION = "Capacité cachée : tu sauras ce qu'elle fait en gueulant.";

const RANGE_TEXT: Record<Range, string> = {
  facing: ' en vis-à-vis',
  near: ' à 5 m',
  any: '',
};

export interface AbilitySheet {
  playerName: string;
  /** « ??? » tant que la capacité est cachée. */
  abilityName: string;
  description: string;
  downside: string | null;
  targeting: string;
  cost: number;
  gauge: number;
  success: string;
  risks: { label: string; chance: string }[];
  available: boolean;
  /** Raison d'indisponibilité ou recharge restante, `null` si rien ne bloque. */
  status: string | null;
  /** Effets actifs du joueur, en clair (CAP-09). */
  effects: string[];
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

/** Ce que vise la capacité, avec sa portée (CAP-17) et le « au hasard » (CAP-18). */
export function targetingText(preview: ActivationPreview): string {
  const range = RANGE_TEXT[preview.range];
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
      return `${plural(Math.max(1, preview.targetCount), 'coéquipier')}${range}, à choisir sur le terrain`;
    case 'opponent':
      return `${plural(Math.max(1, preview.targetCount), 'adversaire')}${range}, à choisir sur le terrain`;
    case 'randomOpponent':
      return `Adversaire${range} tiré au hasard`;
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
  return {
    playerName: player?.name ?? '?',
    abilityName: preview.abilityName,
    description: !ability ? '' : preview.revealed ? ability.description : HIDDEN_DESCRIPTION,
    downside: ability && preview.revealed && ability.downside ? ability.downside : null,
    targeting: targetingText(preview),
    cost: preview.cost,
    gauge: preview.gauge,
    success: formatPercent(preview.successChance),
    risks: preview.risks.map((risk) => ({ label: risk.label, chance: formatPercent(risk.chance) })),
    available: preview.available,
    status: preview.reason ?? cooldown,
    effects: effectChips(state, playerId).map((chip) => chip.detail),
  };
}
