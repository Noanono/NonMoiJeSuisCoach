/**
 * Présentation en français des données du domaine (capacités, postes, disponibilité).
 * Fonctions pures, sans règle de jeu : elles disent ce que le domaine a décidé (CAP-04, CAP-08).
 */
import type {
  AbilityPosition,
  AbilityTrigger,
  AttributeName,
  Effect,
  MatchStat,
  Mentality,
  Player,
  Position,
  Scope,
  Targeting,
} from '../../domain/types';
import type { Level5Bonus } from '../../domain/abilities/progression';

const PERCENT = 100;
/** Signe moins typographique (design system : « + » et « − »). */
const MINUS = '−';
const NBSP = ' ';

export const POSITION_SHORT: Record<Position, string> = { GK: 'GAR', DEF: 'DEF', MID: 'MIL', ATT: 'ATT' };
export const POSITION_LABEL: Record<Position, string> = { GK: 'Gardien', DEF: 'Défenseur', MID: 'Milieu', ATT: 'Attaquant' };
export const POSITION_ORDER: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

export const ABILITY_POSITION_LABEL: Record<AbilityPosition, string> = { ...POSITION_LABEL, ANY: 'Tous postes', BENCH: 'Banc' };

export const ATTRIBUTE_LABEL: Record<AttributeName, string> = {
  speed: 'Vitesse',
  technique: 'Technique',
  physical: 'Physique',
  shooting: 'Tir',
  defense: 'Défense',
  goalkeeping: 'Gardien',
};

export const MENTALITY_LABEL: Record<Mentality, string> = { defensive: 'Défensif', balanced: 'Équilibré', offensive: 'Offensif' };

const STAT_LABEL: Record<MatchStat, string> = {
  all: 'à toutes les stats',
  speed: 'de vitesse',
  technique: 'de technique',
  physical: 'de physique',
  shooting: 'au tir',
  defense: 'en défense',
  goalkeeping: "d'arrêts",
  concentration: 'de concentration',
};

const SCOPE_LABEL: Record<Scope, string> = {
  self: 'lui-même',
  targets: 'la cible',
  team: 'son équipe',
  opponents: "l'équipe adverse",
  zoneOpponents: 'adversaires de la zone',
};

const LINE_WORD: Record<Position, string> = { GK: 'gardien', DEF: 'défenseur', MID: 'milieu', ATT: 'attaquant' };

const TRIGGER_LABEL: Record<AbilityTrigger, string> = {
  anytime: 'À tout moment',
  afterOwnGoal: 'Après un but de son équipe',
  ownSetPiece: 'Sur coup de pied arrêté offensif',
  opponentSetPiece: 'Sur coup franc adverse',
  ownPenalty: 'Sur penalty pour son équipe',
  opponentPenalty: 'Sur penalty adverse',
  ownDeadBall: 'Sur penalty ou coup franc pour son équipe',
  halftime: 'À la mi-temps',
};

/** Pourcentage arrondi à l'unité, sans signe : 0.335 → « 34 % ». */
export function percent(fraction: number): string {
  return `${Math.round(Math.abs(fraction) * PERCENT)}${NBSP}%`;
}

/** Pourcentage signé avec le vrai signe moins : −0.2 → « −20 % ». */
export function signedPercent(fraction: number): string {
  return `${fraction < 0 ? MINUS : '+'}${percent(fraction)}`;
}

/** Nombre signé avec le vrai signe moins : −3 → « −3 ». */
export function signed(value: number): string {
  if (value === 0) return '0';
  return `${value < 0 ? MINUS : '+'}${Math.abs(value)}`;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/** Effet chiffré d'une capacité, en une ligne lisible (CAP-04, CAP-08). */
export function describeEffect(effect: Effect): string {
  switch (effect.type) {
    case 'modifier': {
      const extension = effect.extendOnGoal ? `, +${effect.extendOnGoal}${NBSP}min par but marqué` : '';
      return `${signedPercent(effect.value)} ${STAT_LABEL[effect.stat]} (${SCOPE_LABEL[effect.scope]}) pendant ${effect.duration}${NBSP}min${extension}`;
    }
    case 'scaledModifier': {
      if (effect.per === 'minute') {
        return `${signedPercent(effect.perUnit)} ${STAT_LABEL[effect.stat]} par minute jouée (${SCOPE_LABEL[effect.scope]}) pendant ${effect.duration}${NBSP}min`;
      }
      return `${signedPercent(effect.base)} ${STAT_LABEL[effect.stat]} (${SCOPE_LABEL[effect.scope]}) pendant ${effect.duration}${NBSP}min, ${signedPercent(effect.perUnit)} par but encaissé`;
    }
    case 'knockout': {
      const chase = effect.chaseDuration ? `, puis un autre adversaire ${effect.chaseDuration}${NBSP}min` : '';
      return `Hors jeu ${effect.duration}${NBSP}min : ${SCOPE_LABEL[effect.scope]}${chase}`;
    }
    case 'revive':
      return 'Relève la cible immédiatement';
    case 'cancelAction':
      return effect.count ? `Annule les ${effect.count} prochaines actions adverses` : 'Annule la prochaine action adverse';
    case 'chanceBoost': {
      const carrier = effect.carrier ? " : il la tente lui-même, et s'il marque, sa recharge repart à zéro" : '';
      return `${signedPercent(effect.value)} de chances de but sur la prochaine occasion${carrier}`;
    }
    case 'instantChance':
      return `Occasion immédiate à ${percent(effect.chance)} de but`;
    case 'opponentChanceMalus': {
      const shots = effect.shots > 1 ? `les ${effect.shots} prochains tirs adverses` : 'le prochain tir adverse';
      return `${signedPercent(-effect.value)} de réussite pour ${shots}`;
    }
    case 'energy':
      return `Efface ${percent(effect.value)} de la fatigue (${SCOPE_LABEL[effect.scope]})`;
    case 'cancelGoal':
      return `Annule un but adverse des ${effect.withinMinutes} dernières minutes`;
    case 'gauge':
      return `+${plural(effect.value, 'point')} de Gueulante`;
    case 'stealGauge':
      return `Vole ${plural(effect.value, 'point')} de Gueulante au coach adverse`;
    case 'cleanSheetGauge':
      return `+${plural(effect.value, 'point')} de Gueulante si aucun but encaissé pendant ${effect.duration}${NBSP}min`;
    case 'clearMaluses':
      return `Retire tous les malus de son équipe, +${plural(effect.bonusGauge, 'point')} de Gueulante si au moins ${effect.threshold} sont retirés`;
    case 'swapTeams':
      return `Inverse les niveaux des deux équipes pendant ${effect.duration}${NBSP}min`;
  }
}

export function describeCooldown(cooldown: number): string {
  return cooldown > 0 ? `Recharge ${cooldown}${NBSP}min` : 'Aucune recharge';
}

/** Ce que débloque le niveau 5 (CAP-11). */
export function describeLevel5(bonus: Level5Bonus): string {
  switch (bonus) {
    case 'extraTarget':
      return 'Une cible de plus.';
    case 'longerDuration':
      return 'Durée augmentée de 50 %.';
    case 'shorterCooldown':
      return 'Recharge réduite de 5 min.';
    case null:
      return "Rien de plus : l'effet est déjà au maximum.";
  }
}

export function describeTrigger(trigger: AbilityTrigger): string {
  return TRIGGER_LABEL[trigger];
}

/** Ciblage (CAP-16 à CAP-18). */
export function describeTargeting(targeting: Targeting): string {
  const count = targeting.count ?? 1;
  switch (targeting.kind) {
    case 'self':
      return 'Lui-même';
    case 'team':
      return 'Toute son équipe';
    case 'opponentTeam':
      return "Toute l'équipe adverse";
    case 'zone':
      return 'Sa zone : tu choisis le moment';
    case 'teammate':
      return `${plural(count, 'coéquipier')}${targeting.downed ? ' au sol' : ''} au choix`;
    case 'opponent':
      return `${plural(count, targeting.line ? LINE_WORD[targeting.line] : 'adversaire')} au choix`;
    case 'randomOpponent':
      return `${plural(count, 'adversaire')} au hasard`;
  }
}

/** Disponibilité d'un joueur (EFF-05), `null` s'il est apte. */
export function availabilityLabel(player: Pick<Player, 'injuryWeeks' | 'suspendedMatches'>): string | null {
  if (player.injuryWeeks > 0) return `Blessé ${player.injuryWeeks}${NBSP}sem.`;
  if (player.suspendedMatches > 0) return `Suspendu ${player.suspendedMatches}${NBSP}m.`;
  return null;
}

export function fullName(player: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}
