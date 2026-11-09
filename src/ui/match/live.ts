/**
 * Live texte et horloge (MATCH-02, MATCH-04, MATCH-07) : fonctions pures de présentation.
 */
import type { MatchEvent, MatchState, Side } from '../../domain/match';

export type Speed = 1 | 2 | 4;
export const SPEEDS: readonly Speed[] = [1, 2, 4];

/** Durée réelle d'une minute de jeu selon la vitesse (MATCH-02). */
const BASE_MINUTE_MS = 1000;

export function minuteIntervalMs(speed: Speed): number {
  return BASE_MINUTE_MS / speed;
}

/** Minute affichée : 45+2' en temps additionnel. */
export function minuteLabel(minute: number, addedMinute: number): string {
  return addedMinute > 0 ? `${minute}+${addedMinute}'` : `${minute}'`;
}

const PERIOD_LABEL: Record<MatchState['status'], string> = {
  firstHalf: '1re mi-temps',
  halftime: 'Mi-temps',
  secondHalf: '2e mi-temps',
  finished: 'Terminé',
};

export function periodLabel(state: MatchState): string {
  return PERIOD_LABEL[state.status];
}

/** Lignes du live affichées par défaut : au-delà, « tout voir » (green code). */
export const LIVE_LIMIT = 60;

export type LiveTone = 'goal' | 'mine' | 'theirs' | 'card' | 'plain';

export interface LiveLine {
  /** Index dans `state.events` : le live ne fait que s'allonger, la clé est stable. */
  key: number;
  minute: string;
  tone: LiveTone;
  /** Étiquette courte en tampon, toujours avec la couleur (design system). */
  tag: string | null;
  /** L'action en quelques mots. */
  text: string;
  /** Le commentaire complet, en infobulle. */
  detail: string;
}

const TAG: Record<LiveTone, string | null> = {
  goal: 'But',
  mine: 'Toi',
  theirs: 'En face',
  card: 'Carton',
  plain: null,
};

/** Tonalité d'une ligne : buts et capacités ressortent, celles d'en face clairement annoncées. */
export function liveTone(event: MatchEvent, coachSide: Side): LiveTone {
  switch (event.kind) {
    case 'goal':
      return 'goal';
    case 'activation':
    case 'substitution':
      return event.side === coachSide ? 'mine' : 'theirs';
    case 'yellowCard':
    case 'redCard':
      return 'card';
    default:
      return 'plain';
  }
}

/** Score vu du coach : ses buts d'abord. */
function scoreText(score: [number, number], coachSide: Side): string {
  return coachSide === 'home' ? `${score[0]}-${score[1]}` : `${score[1]}-${score[0]}`;
}

/** L'action en quelques mots, `null` pour ce qui ne compte pas dans le fil (fautes, ambiance). */
export function liveHeadline(event: MatchEvent, coachSide: Side, nameOf: (playerId: string) => string): string | null {
  const name = event.playerId ? nameOf(event.playerId) : '';
  const team = event.side === coachSide ? 'toi' : 'eux';
  switch (event.kind) {
    case 'kickoff':
      return "Coup d'envoi";
    case 'halftime':
      return 'Mi-temps';
    case 'fullTime':
      return 'Fin du match';
    case 'stoppage':
      return `+${event.label} min de temps additionnel`;
    case 'goal':
      return `${name} marque${event.label ? ' (compte double)' : ''} · ${scoreText(event.score!, coachSide)}`;
    case 'goalCancelled':
      return `But annulé · ${scoreText(event.score!, coachSide)}`;
    case 'save':
      return `Arrêt sur la frappe de ${name}`;
    case 'miss':
      return `${name} rate le cadre`;
    case 'actionCancelled':
      return 'Action annulée';
    case 'yellowCard':
      return `Jaune pour ${name}`;
    case 'redCard':
      return `Rouge pour ${name}`;
    case 'penalty':
      return `Penalty pour ${team}`;
    case 'freeKick':
      return `Coup franc dangereux pour ${team}`;
    case 'injury':
      return `${name} blessé`;
    case 'activation':
      return `${name} : ${event.label}`;
    case 'effect':
      return name ? `${name} au sol` : event.text;
    case 'substitution':
    case 'shootout':
      return event.text;
    case 'ambiance':
    case 'foul':
    case 'corner':
    case 'eventWindow':
      return null;
  }
}

/** Les actions qui comptent, la plus récente en haut, limitées à `limit` lignes (0 = tout). */
export function liveLines(events: readonly MatchEvent[], coachSide: Side, limit: number, nameOf: (playerId: string) => string): LiveLine[] {
  const lines: LiveLine[] = [];
  for (let index = events.length - 1; index >= 0 && (limit === 0 || lines.length < limit); index--) {
    const event = events[index]!;
    const text = liveHeadline(event, coachSide, nameOf);
    if (text === null) continue;
    const tone = liveTone(event, coachSide);
    lines.push({ key: index, minute: minuteLabel(event.minute, event.addedMinute), tone, tag: TAG[tone], text, detail: event.text });
  }
  return lines;
}

/** Dernier but annoncé, pour la région `aria-live` limitée aux buts. */
export function lastGoalText(events: readonly MatchEvent[]): string {
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index]!;
    if (event.kind === 'goal') return `${minuteLabel(event.minute, event.addedMinute)} ${event.text}`;
  }
  return '';
}
