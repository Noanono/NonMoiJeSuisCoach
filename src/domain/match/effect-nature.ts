import type { Effect, Scope, TargetKind } from '../types';

const FRIENDLY_TARGET_KINDS: readonly TargetKind[] = ['self', 'teammate', 'team'];

/** Le périmètre vise-t-il le camp du porteur ? (`targets` dépend du type de ciblage.) */
export function isFriendlyScope(scope: Scope, targetKind: TargetKind): boolean {
  switch (scope) {
    case 'self':
    case 'team':
    case 'ownKeeper':
      return true;
    case 'targets':
      return FRIENDLY_TARGET_KINDS.includes(targetKind);
    default:
      return false;
  }
}

/**
 * Un effet est favorable au camp du porteur s'il l'aide ou s'il gêne l'adversaire.
 * Seuls les effets favorables profitent du bonus de contexte (CAP-14).
 */
export function isBeneficial(effect: Effect, targetKind: TargetKind): boolean {
  switch (effect.type) {
    case 'modifier':
    case 'energy':
    case 'morale':
      return effect.value > 0 === isFriendlyScope(effect.scope, targetKind);
    case 'knockout':
    case 'card':
      return !isFriendlyScope(effect.scope, targetKind);
    case 'chanceBoost':
    case 'opponentChanceMalus':
    case 'penaltyAwarded':
    case 'ownGoal':
    case 'cancelAction':
    case 'cancelGoal':
    case 'freeze':
    case 'noCards':
    case 'foulsIgnored':
    case 'extraAttacker':
    case 'clearMoraleMaluses':
    case 'cancelHomeAdvantage':
      return true;
    default:
      return false;
  }
}
