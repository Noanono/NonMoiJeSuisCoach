/**
 * Présentation des données du domaine (capacités, postes, disponibilité), en français ou en
 * anglais selon la langue choisie (I18N-01). Fonctions pures, sans règle de jeu : elles disent
 * ce que le domaine a décidé (CAP-04, CAP-08).
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
import { lang } from '../../i18n/locale';
import { localized } from '../../i18n/localized';

const PERCENT = 100;
/** Signe moins typographique (design system : « + » et « − »). */
const MINUS = '−';
const NBSP = ' ';

export const POSITION_SHORT = localized<Position>({
  fr: { GK: 'GAR', DEF: 'DEF', MID: 'MIL', ATT: 'ATT' },
  en: { GK: 'GK', DEF: 'DEF', MID: 'MID', ATT: 'ATT' },
});
const POSITION_NAMES = {
  fr: { GK: 'Gardien', DEF: 'Défenseur', MID: 'Milieu', ATT: 'Attaquant' },
  en: { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', ATT: 'Forward' },
};
export const POSITION_LABEL = localized<Position>(POSITION_NAMES);
export const POSITION_ORDER: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

export const ABILITY_POSITION_LABEL = localized<AbilityPosition>({
  fr: { ...POSITION_NAMES.fr, ANY: 'Tous postes', BENCH: 'Banc' },
  en: { ...POSITION_NAMES.en, ANY: 'Any position', BENCH: 'Bench' },
});

export const ATTRIBUTE_LABEL = localized<AttributeName>({
  fr: { speed: 'Vitesse', technique: 'Technique', physical: 'Physique', shooting: 'Tir', defense: 'Défense', goalkeeping: 'Gardien' },
  en: { speed: 'Speed', technique: 'Technique', physical: 'Physical', shooting: 'Shooting', defense: 'Defending', goalkeeping: 'Goalkeeping' },
});

export const MENTALITY_LABEL = localized<Mentality>({
  fr: { defensive: 'Défensif', balanced: 'Équilibré', offensive: 'Offensif' },
  en: { defensive: 'Defensive', balanced: 'Balanced', offensive: 'Attacking' },
});

const STAT_LABEL = localized<MatchStat>({
  fr: {
    all: 'à toutes les stats',
    speed: 'de vitesse',
    technique: 'de technique',
    physical: 'de physique',
    shooting: 'au tir',
    defense: 'en défense',
    goalkeeping: "d'arrêts",
    concentration: 'de concentration',
  },
  en: {
    all: 'to all stats',
    speed: 'speed',
    technique: 'technique',
    physical: 'physical',
    shooting: 'shooting',
    defense: 'defending',
    goalkeeping: 'saves',
    concentration: 'focus',
  },
});

const SCOPE_LABEL = localized<Scope>({
  fr: { self: 'lui-même', targets: 'la cible', team: 'son équipe', opponents: "l'équipe adverse", zoneOpponents: 'adversaires de la zone' },
  en: { self: 'himself', targets: 'the target', team: 'his team', opponents: 'the opposing team', zoneOpponents: 'opponents in his zone' },
});

const LINE_WORD = localized<Position>({
  fr: { GK: 'gardien', DEF: 'défenseur', MID: 'milieu', ATT: 'attaquant' },
  en: { GK: 'goalkeeper', DEF: 'defender', MID: 'midfielder', ATT: 'forward' },
});

const TRIGGER_LABEL = localized<AbilityTrigger>({
  fr: {
    anytime: 'À tout moment',
    afterOwnGoal: 'Après un but de son équipe',
    ownSetPiece: 'Sur coup de pied arrêté offensif',
    opponentSetPiece: 'Sur coup de pied arrêté adverse',
    ownPenalty: 'Sur penalty pour son équipe',
    opponentPenalty: 'Sur penalty adverse',
    ownDeadBall: 'Sur penalty ou coup franc pour son équipe',
    halftime: 'À la mi-temps',
    ownFreeKick: 'Sur coup franc pour son équipe',
    opponentFreeKick: 'Sur coup franc adverse',
  },
  en: {
    anytime: 'At any time',
    afterOwnGoal: 'After his team scores',
    ownSetPiece: 'On an attacking set piece',
    opponentSetPiece: 'On an opposing set piece',
    ownPenalty: 'On a penalty for his team',
    opponentPenalty: 'On an opposing penalty',
    ownDeadBall: 'On a penalty or free kick for his team',
    halftime: 'At half-time',
    ownFreeKick: 'On a free kick for his team',
    opponentFreeKick: 'On an opposing free kick',
  },
});

/** Pourcentage arrondi à l'unité, sans signe : 0.335 → « 34 % » (« 34% » en anglais). */
export function percent(fraction: number): string {
  return `${Math.round(Math.abs(fraction) * PERCENT)}${lang() === 'en' ? '' : NBSP}%`;
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
  return lang() === 'en' ? describeEffectEn(effect) : describeEffectFr(effect);
}

function describeEffectFr(effect: Effect): string {
  switch (effect.type) {
    case 'modifier': {
      const extension = effect.extendOnGoal ? `, +${effect.extendOnGoal}${NBSP}min par but marqué` : '';
      return `${signedPercent(effect.value)} ${STAT_LABEL[effect.stat]} (${SCOPE_LABEL[effect.scope]}) pendant ${effect.duration}${NBSP}min${extension}`;
    }
    case 'scaledModifier': {
      if (effect.per === 'minute') {
        return `${signedPercent(effect.perUnit)} ${STAT_LABEL[effect.stat]} par minute jouée (${SCOPE_LABEL[effect.scope]}) pendant ${effect.duration}${NBSP}min`;
      }
      const unit = effect.per === 'goalDeficit' ? 'par but de retard' : 'par but encaissé';
      return `${signedPercent(effect.base)} ${STAT_LABEL[effect.stat]} (${SCOPE_LABEL[effect.scope]}) pendant ${effect.duration}${NBSP}min, ${signedPercent(effect.perUnit)} ${unit}`;
    }
    case 'knockout': {
      const chase = effect.chaseDuration ? `, puis un autre adversaire ${effect.chaseDuration}${NBSP}min` : '';
      return `Hors jeu ${effect.duration}${NBSP}min : ${SCOPE_LABEL[effect.scope]}${chase}`;
    }
    case 'revive':
      return 'Relève la cible immédiatement, ou soigne un blessé resté sur le terrain';
    case 'cancelAction':
      return effect.count ? `Annule les ${effect.count} prochaines actions adverses` : 'Annule la prochaine action adverse';
    case 'chanceBoost': {
      const carrier = effect.carrier ? " : il la tente lui-même, et s'il marque, il pourra la rejouer" : '';
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
    case 'clearMaluses': {
      const who = effect.scope === 'targets' ? 'de la cible' : 'de son équipe';
      const gauge = effect.bonusGauge > 0 ? `, +${plural(effect.bonusGauge, 'point')} de Gueulante si au moins ${effect.threshold} sont retirés` : '';
      const perMalus = effect.perMalus ? `, ${signedPercent(effect.perMalus)} à toutes les stats (son équipe) par malus retiré pendant ${effect.perMalusDuration ?? 15}${NBSP}min` : '';
      return `Retire tous les malus ${who}${gauge}${perMalus}`;
    }
    case 'prolongDown':
      return `${SCOPE_LABEL[effect.scope]} reste au sol ${effect.minutes}${NBSP}min de plus`;
    case 'steady':
      return `Impossible à mettre au sol pendant ${effect.duration}${NBSP}min (${SCOPE_LABEL[effect.scope]})`;
    case 'fieldDoctor':
      return `Jusqu'à la fin du match : un joueur de son équipe mis au sol se relève après ${effect.reviveAfter}${NBSP}min, et les malus adverses durent ${Math.round(effect.malusFactor * 100)}${NBSP}% de leur durée`;
    case 'swapTeams':
      return `Inverse les niveaux des deux équipes pendant ${effect.duration}${NBSP}min`;
    case 'poachBest':
      return "Le meilleur joueur de champ adverse rejoint son équipe jusqu'à la fin du match";
    case 'doubleGoals':
      return `Chaque but de son équipe compte double pendant ${effect.duration}${NBSP}min`;
    case 'miracle':
      return "Ramène les exclus et les blessés, et remet toute l'équipe à 100 % d'énergie";
    case 'setPieceBoost':
      return effect.option === 'shot'
        ? `${signedPercent(effect.value)} de chances de but si le coup franc est tiré directement`
        : `${signedPercent(effect.value)} de chances de but sur un centre (coup franc ou corner)`;
    case 'moveBallCloser':
      return 'Le ballon du coup franc avance d’un cran (lointain → moyen → proche)';
    case 'cancelSetPiece':
      return 'Annule le coup franc ou le corner adverse';
    case 'retakePenalty':
      return effect.count > 1 ? `Les ${effect.count} prochains penalties adverses marqués sont à retirer` : 'Le prochain penalty adverse marqué est à retirer';
    case 'turnIntoPenalty':
      return 'Le coup franc devient un penalty';
    case 'mark':
      return `Marquage : ${signedPercent(effect.value)} ${STAT_LABEL[effect.stat]} pour la cible pendant ${effect.duration}${NBSP}min, tant que le marqueur est sur le terrain et debout`;
    case 'gamble':
      return `Pari à ${percent(effect.chance)} : ${effect.success.map(describeEffectFr).join(', ')}. Raté : ${effect.failure.map(describeEffectFr).join(', ') || 'rien'}`;
    case 'bookSelf':
      return effect.card === 'red' ? 'Carton rouge pour lui' : 'Carton jaune pour lui';
    case 'awardPenalty':
      return 'Penalty pour son équipe';
    case 'opponentChance':
      return `Occasion adverse à ${percent(effect.chance)} de but`;
    case 'deadMinutes':
      return `${plural(effect.duration, 'minute')} sans occasion ni faute, pour personne`;
    case 'addedTime':
      return `+${plural(effect.minutes, 'minute')} de temps additionnel en fin de match`;
    case 'rewind':
      return `Efface tous les buts des ${effect.minutes} dernières minutes, des deux côtés`;
    case 'shield':
      return `Bouclier (${SCOPE_LABEL[effect.scope]}) : ${plural(effect.charges, 'la prochaine capacité adverse qui le vise est annulée', 'prochaines capacités adverses qui le visent sont annulées')} sur lui, pendant ${effect.duration}${NBSP}min`;
    case 'copyLast':
      return "Rejoue la dernière capacité utilisée par l'adversaire, pour son équipe ; si elle coûtait moins cher, la différence de Gueulante est rendue";
    case 'drain':
      return `+${Math.round(effect.value)} de fatigue (${SCOPE_LABEL[effect.scope]}), le temps du match`;
    case 'overcharge':
      return `Surcharge : vide toute la Gueulante, ${signedPercent(effect.perPoint)} ${STAT_LABEL[effect.stat]} (${SCOPE_LABEL[effect.scope]}) par point dépensé (coût compris) pendant ${effect.duration}${NBSP}min`;
  }
}

function describeEffectEn(effect: Effect): string {
  switch (effect.type) {
    case 'modifier': {
      const extension = effect.extendOnGoal ? `, +${effect.extendOnGoal} min per goal scored` : '';
      return `${signedPercent(effect.value)} ${STAT_LABEL[effect.stat]} (${SCOPE_LABEL[effect.scope]}) for ${effect.duration} min${extension}`;
    }
    case 'scaledModifier': {
      if (effect.per === 'minute') {
        return `${signedPercent(effect.perUnit)} ${STAT_LABEL[effect.stat]} per minute played (${SCOPE_LABEL[effect.scope]}) for ${effect.duration} min`;
      }
      const unit = effect.per === 'goalDeficit' ? 'per goal behind' : 'per goal conceded';
      return `${signedPercent(effect.base)} ${STAT_LABEL[effect.stat]} (${SCOPE_LABEL[effect.scope]}) for ${effect.duration} min, ${signedPercent(effect.perUnit)} ${unit}`;
    }
    case 'knockout': {
      const chase = effect.chaseDuration ? `, then another opponent for ${effect.chaseDuration} min` : '';
      return `Out of action for ${effect.duration} min: ${SCOPE_LABEL[effect.scope]}${chase}`;
    }
    case 'revive':
      return 'Gets the target back up at once, or heals an injured player still on the pitch';
    case 'cancelAction':
      return effect.count ? `Cancels the next ${effect.count} opposing moves` : 'Cancels the next opposing move';
    case 'chanceBoost': {
      const carrier = effect.carrier ? ': he takes it himself, and if he scores he can play it again' : '';
      return `${signedPercent(effect.value)} goal chance on the next opportunity${carrier}`;
    }
    case 'instantChance':
      return `Instant chance with a ${percent(effect.chance)} goal probability`;
    case 'opponentChanceMalus': {
      const shots = effect.shots > 1 ? `the next ${effect.shots} opposing shots` : 'the next opposing shot';
      return `${signedPercent(-effect.value)} success for ${shots}`;
    }
    case 'energy':
      return `Wipes out ${percent(effect.value)} of fatigue (${SCOPE_LABEL[effect.scope]})`;
    case 'cancelGoal':
      return `Cancels an opposing goal from the last ${effect.withinMinutes} minutes`;
    case 'gauge':
      return `+${plural(effect.value, 'Rant point')}`;
    case 'stealGauge':
      return `Steals ${plural(effect.value, 'Rant point')} from the opposing coach`;
    case 'cleanSheetGauge':
      return `+${plural(effect.value, 'Rant point')} if nothing is conceded for ${effect.duration} min`;
    case 'clearMaluses': {
      const who = effect.scope === 'targets' ? 'from the target' : 'from his team';
      const gauge = effect.bonusGauge > 0 ? `, +${plural(effect.bonusGauge, 'Rant point')} if at least ${effect.threshold} are removed` : '';
      const perMalus = effect.perMalus ? `, ${signedPercent(effect.perMalus)} to all stats (his team) per penalty removed for ${effect.perMalusDuration ?? 15} min` : '';
      return `Removes every penalty ${who}${gauge}${perMalus}`;
    }
    case 'prolongDown':
      return `${capitalize(SCOPE_LABEL[effect.scope])} stays down ${effect.minutes} min longer`;
    case 'steady':
      return `Cannot be knocked down for ${effect.duration} min (${SCOPE_LABEL[effect.scope]})`;
    case 'fieldDoctor':
      return `Until the final whistle: a knocked-down teammate gets up after ${effect.reviveAfter} min, and opposing penalties last ${Math.round(effect.malusFactor * 100)}% as long`;
    case 'swapTeams':
      return `Swaps the two teams' levels for ${effect.duration} min`;
    case 'poachBest':
      return "The opposition's best outfield player joins his team until the final whistle";
    case 'doubleGoals':
      return `Every goal by his team counts double for ${effect.duration} min`;
    case 'miracle':
      return 'Brings back sent-off and injured players, and restores the whole team to 100% energy';
    case 'setPieceBoost':
      return effect.option === 'shot'
        ? `${signedPercent(effect.value)} goal chance if the free kick is shot directly`
        : `${signedPercent(effect.value)} goal chance on a cross (free kick or corner)`;
    case 'moveBallCloser':
      return 'The free kick moves one step closer (long → mid → close range)';
    case 'cancelSetPiece':
      return 'Cancels the opposing free kick or corner';
    case 'retakePenalty':
      return effect.count > 1 ? `The next ${effect.count} opposing penalties scored must be retaken` : 'The next opposing penalty scored must be retaken';
    case 'turnIntoPenalty':
      return 'The free kick becomes a penalty';
    case 'mark':
      return `Marking: ${signedPercent(effect.value)} ${STAT_LABEL[effect.stat]} for the target for ${effect.duration} min, as long as the marker is on the pitch and standing`;
    case 'gamble':
      return `${percent(effect.chance)} gamble: ${effect.success.map(describeEffectEn).join(', ')}. If it fails: ${effect.failure.map(describeEffectEn).join(', ') || 'nothing'}`;
    case 'bookSelf':
      return effect.card === 'red' ? 'Red card for him' : 'Yellow card for him';
    case 'awardPenalty':
      return 'Penalty for his team';
    case 'opponentChance':
      return `Opposing chance with a ${percent(effect.chance)} goal probability`;
    case 'deadMinutes':
      return `${plural(effect.duration, 'minute')} with no chances or fouls, for anyone`;
    case 'addedTime':
      return `+${plural(effect.minutes, 'minute')} of stoppage time at the end of the match`;
    case 'rewind':
      return `Erases every goal from the last ${effect.minutes} minutes, at both ends`;
    case 'shield':
      return `Shield (${SCOPE_LABEL[effect.scope]}): ${effect.charges > 1 ? `the next ${effect.charges} opposing abilities aimed at him are cancelled` : 'the next opposing ability aimed at him is cancelled'}, for ${effect.duration} min`;
    case 'copyLast':
      return "Replays the opponent's last ability, for his own team; if it cost less, the Rant difference is refunded";
    case 'drain':
      return `+${Math.round(effect.value)} fatigue (${SCOPE_LABEL[effect.scope]}) for the rest of the match`;
    case 'overcharge':
      return `Overload: empties the whole Rant gauge, ${signedPercent(effect.perPoint)} ${STAT_LABEL[effect.stat]} (${SCOPE_LABEL[effect.scope]}) per point spent (cost included) for ${effect.duration} min`;
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Ce que débloque le niveau 5 (CAP-11). */
export function describeLevel5(bonus: Level5Bonus): string {
  const en = lang() === 'en';
  switch (bonus) {
    case 'extraTarget':
      return en ? 'One extra target.' : 'Une cible de plus.';
    case 'longerDuration':
      return en ? 'Duration increased by 50%.' : 'Durée augmentée de 50 %.';
    case 'strongerEffect':
      return en ? 'Effect boosted by 25%.' : 'Effet renforcé de 25 %.';
    case null:
      return en ? 'Nothing more: the effect is already maxed out.' : "Rien de plus : l'effet est déjà au maximum.";
  }
}

export function describeTrigger(trigger: AbilityTrigger): string {
  return TRIGGER_LABEL[trigger];
}

/** Ciblage (CAP-16 à CAP-18). */
export function describeTargeting(targeting: Targeting): string {
  const count = targeting.count ?? 1;
  const en = lang() === 'en';
  switch (targeting.kind) {
    case 'self':
      return en ? 'Himself' : 'Lui-même';
    case 'team':
      return en ? 'His whole team' : 'Toute son équipe';
    case 'opponentTeam':
      return en ? 'The whole opposing team' : "Toute l'équipe adverse";
    case 'zone':
      return en ? 'His zone: you pick the moment' : 'Sa zone : tu choisis le moment';
    case 'teammate':
      return en
        ? `${plural(count, 'teammate')}${targeting.downed ? ' (down or injured)' : ''} of your choice`
        : `${plural(count, 'coéquipier')}${targeting.downed ? ' au sol ou blessé' : ''} au choix`;
    case 'opponent':
      return en
        ? `${plural(count, targeting.line ? LINE_WORD[targeting.line] : 'opponent')} of your choice`
        : `${plural(count, targeting.line ? LINE_WORD[targeting.line] : 'adversaire')} au choix`;
    case 'randomOpponent':
      return en ? `${plural(count, 'random opponent')}` : `${plural(count, 'adversaire')} au hasard`;
  }
}

/** Disponibilité d'un joueur (EFF-05), `null` s'il est apte. */
export function availabilityLabel(player: Pick<Player, 'injuryWeeks' | 'suspendedMatches'>): string | null {
  const en = lang() === 'en';
  if (player.injuryWeeks > 0) return en ? `Injured ${player.injuryWeeks} wk` : `Blessé ${player.injuryWeeks}${NBSP}sem.`;
  if (player.suspendedMatches > 0) return en ? `Suspended ${player.suspendedMatches} m.` : `Suspendu ${player.suspendedMatches}${NBSP}m.`;
  return null;
}

export function fullName(player: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}
