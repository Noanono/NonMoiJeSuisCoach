/**
 * Présentation en français des données du domaine (capacités, postes, disponibilité).
 * Fonctions pures, sans règle de jeu : elles disent ce que le domaine a décidé (CAP-04, CAP-08).
 */
import type {
  AbilityPosition,
  AbilityTrigger,
  AttributeName,
  Cooldown,
  Effect,
  MatchStat,
  Mentality,
  Player,
  Position,
  Range,
  Risk,
  Scope,
  Targeting,
} from '../../domain/types';

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
  aggression: "d'agressivité",
};

const SCOPE_LABEL: Record<Scope, string> = {
  self: 'lui-même',
  targets: 'la cible',
  team: 'son équipe',
  opponents: "l'équipe adverse",
  zoneAll: 'tous dans la zone',
  zoneOpponents: 'adversaires de la zone',
  opponentKeeper: 'gardien adverse',
  ownKeeper: 'son gardien',
  opponentCaptain: 'capitaine adverse',
};

const RANGE_LABEL: Record<Range, string> = { facing: 'vis-à-vis', near: 'à 5 m', any: 'partout' };

const TRIGGER_LABEL: Record<AbilityTrigger, string> = {
  anytime: 'À tout moment',
  afterOwnGoal: 'Après un but de son équipe',
  ownSetPiece: 'Sur coup de pied arrêté offensif',
  opponentSetPiece: 'Sur coup franc adverse',
  ownPenalty: 'Sur penalty pour son équipe',
  opponentPenalty: 'Sur penalty adverse',
  halftime: 'À la mi-temps',
};

const CHANCE_TARGET_LABEL: Record<Extract<Effect, { type: 'chanceBoost' }>['on'], string> = {
  nextChance: 'la prochaine occasion',
  setPiece: 'le prochain coup de pied arrêté',
  penalty: 'le prochain penalty',
  counter: 'la contre-attaque',
  longShot: 'les tirs de loin',
};

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

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

function chanceSuffix(chance: number | undefined): string {
  return chance === undefined || chance >= 1 ? '' : ` (${percent(chance)} de chances)`;
}

/** Effet chiffré d'une capacité, en une ligne lisible (CAP-04, CAP-08). */
export function describeEffect(effect: Effect): string {
  switch (effect.type) {
    case 'modifier':
      return `${signedPercent(effect.value)} ${STAT_LABEL[effect.stat]} (${SCOPE_LABEL[effect.scope]}) pendant ${effect.duration}${NBSP}min`;
    case 'knockout':
      return `Hors jeu ${effect.duration}${NBSP}min : ${SCOPE_LABEL[effect.scope]}${chanceSuffix(effect.chance)}`;
    case 'cancelAction':
      return "Annule l'action adverse en cours";
    case 'chanceBoost':
      return `${signedPercent(effect.value)} de réussite sur ${CHANCE_TARGET_LABEL[effect.on]}`;
    case 'opponentChanceMalus': {
      const shots = effect.shots > 1 ? `les ${effect.shots} prochains tirs adverses` : 'le prochain tir adverse';
      return `${signedPercent(-effect.value)} de réussite pour ${shots}`;
    }
    case 'penaltyAwarded':
      return `${percent(effect.chance)} de penalty accordé`;
    case 'ownGoal':
      return `${percent(effect.chance)} de but contre son camp adverse`;
    case 'card':
      return `${effect.chance >= 1 ? 'Carton' : `${percent(effect.chance)} de carton`} ${effect.card === 'red' ? 'rouge' : 'jaune'} (${SCOPE_LABEL[effect.scope]})`;
    case 'freeze':
      return `Match figé ${effect.duration}${NBSP}min`;
    case 'stoppageTime':
      return `+${effect.minutes}${NBSP}min de temps additionnel`;
    case 'energy':
      return `${signedPercent(effect.value)} d'énergie (${SCOPE_LABEL[effect.scope]})`;
    case 'morale':
      return `${signedPercent(effect.value)} de moral (${SCOPE_LABEL[effect.scope]})`;
    case 'cancelGoal':
      return `Annule un but adverse des ${effect.withinMinutes} dernières minutes`;
    case 'noCards':
      return `Aucun carton pendant ${effect.duration}${NBSP}min`;
    case 'foulsIgnored':
      return `${plural(effect.count, 'faute')} non sifflée${effect.count > 1 ? 's' : ''}`;
    case 'emptyNet':
      return `Cages vides ${effect.duration}${NBSP}min`;
    case 'extraAttacker':
      return `+1 attaquant pendant ${effect.duration}${NBSP}min`;
    case 'clearMoraleMaluses':
      return 'Annule les baisses de moral en cours';
    case 'cancelHomeAdvantage':
      return `Avantage du terrain adverse annulé ${effect.duration}${NBSP}min`;
    case 'fine':
      return `Amende de ${euros.format(effect.amount)} pour le club`;
    case 'budget':
      return `${effect.amount < 0 ? MINUS : '+'}${euros.format(Math.abs(effect.amount))} au budget`;
    case 'presidentConfidence':
      return `Confiance du président ${signed(effect.value)}`;
    case 'injury':
      return `Blessure de ${plural(effect.weeks, 'semaine')} (${SCOPE_LABEL[effect.scope]})`;
    case 'suspension':
      return `Suspension de ${plural(effect.matches, 'match', 'matchs')} (${SCOPE_LABEL[effect.scope]})`;
    case 'squadFatigue':
      return `+${effect.value} de fatigue pour tout l'effectif le lendemain`;
    case 'press':
      return `Presse locale : « ${effect.headline} »`;
  }
}

/** Risque affiché avant activation (CAP-07) : probabilité, nom et conséquences. */
export function describeRisk(risk: Risk): string {
  const odds = risk.chance >= 1 ? 'Certain' : percent(risk.chance);
  const effects = risk.effects.map(describeEffect).join(' ; ');
  return effects ? `${odds} · ${risk.label} : ${effects}` : `${odds} · ${risk.label}`;
}

export function describeCooldown(cooldown: Cooldown): string {
  switch (cooldown.kind) {
    case 'minutes':
      return `Recharge ${cooldown.value}${NBSP}min`;
    case 'perMatch':
      return `${cooldown.uses}× par match`;
    case 'perSeason':
      return `${cooldown.uses}× par saison`;
    case 'perEvent':
      return 'À chaque occasion';
  }
}

export function describeTrigger(trigger: AbilityTrigger): string {
  return TRIGGER_LABEL[trigger];
}

/** Ciblage (CAP-16 à CAP-18). */
export function describeTargeting(targeting: Targeting): string {
  const count = targeting.count ?? 1;
  const range = targeting.range && targeting.range !== 'any' ? `, ${RANGE_LABEL[targeting.range]}` : '';
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
      return `${plural(count, 'coéquipier')} au choix${range}`;
    case 'opponent':
      return `${plural(count, 'adversaire')} au choix${range}`;
    case 'randomOpponent':
      return `${plural(count, 'adversaire')} au hasard`;
  }
}

/** Disponibilité d'un joueur (EFF-05, EFF-07), `null` s'il est apte. */
export function availabilityLabel(player: Pick<Player, 'injuryWeeks' | 'suspendedMatches'>): string | null {
  if (player.injuryWeeks > 0) return `Blessé ${player.injuryWeeks}${NBSP}sem.`;
  if (player.suspendedMatches > 0) return `Suspendu ${player.suspendedMatches}${NBSP}m.`;
  return null;
}

export function fullName(player: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}
