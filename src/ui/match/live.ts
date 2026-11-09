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

export type LiveTone = 'goal' | 'mine' | 'theirs' | 'card' | 'window' | 'plain';

export interface LiveLine {
  /** Index dans `state.events` : le live ne fait que s'allonger, la clé est stable. */
  key: number;
  minute: string;
  tone: LiveTone;
  /** Étiquette courte en tampon, toujours avec la couleur (design system). */
  tag: string | null;
  text: string;
}

const TAG: Record<LiveTone, string | null> = {
  goal: 'But',
  mine: 'Toi',
  theirs: 'En face',
  card: 'Carton',
  window: 'À toi',
  plain: null,
};

/** Tonalité d'une ligne : buts et capacités ressortent, celles d'en face clairement annoncées. */
export function liveTone(event: MatchEvent, coachSide: Side): LiveTone {
  switch (event.kind) {
    case 'goal':
      return 'goal';
    case 'activation':
      return event.side === coachSide ? 'mine' : 'theirs';
    case 'yellowCard':
    case 'redCard':
      return 'card';
    case 'eventWindow':
      return 'window';
    default:
      return 'plain';
  }
}

/** Le plus récent en haut, limité à `limit` lignes (0 = tout). */
export function liveLines(events: readonly MatchEvent[], coachSide: Side, limit: number): LiveLine[] {
  const start = limit > 0 ? Math.max(0, events.length - limit) : 0;
  const lines: LiveLine[] = [];
  for (let index = events.length - 1; index >= start; index--) {
    const event = events[index]!;
    const tone = liveTone(event, coachSide);
    lines.push({ key: index, minute: minuteLabel(event.minute, event.addedMinute), tone, tag: TAG[tone], text: event.text });
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
