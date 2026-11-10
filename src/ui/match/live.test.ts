import { describe, expect, test } from 'bun:test';
import type { MatchEvent } from '../../domain/match';
import { lastGoalText, liveHeadline, liveLines, liveTone, minuteIntervalMs, minuteLabel } from './live';

function event(kind: MatchEvent['kind'], side: MatchEvent['side'], minute: number, text: string = kind): MatchEvent {
  return { kind, side, minute, addedMinute: 0, text };
}

describe('horloge (MATCH-02)', () => {
  test('une minute de jeu dure 1000, 500 ou 250 ms selon la vitesse', () => {
    expect([1, 2, 4].map((speed) => minuteIntervalMs(speed as 1 | 2 | 4))).toEqual([1000, 500, 250]);
  });

  test('affiche le temps additionnel', () => {
    expect(minuteLabel(45, 2)).toBe("45+2'");
    expect(minuteLabel(12, 0)).toBe("12'");
  });
});

describe('live texte (MATCH-04, MATCH-07)', () => {
  const events = [
    event('kickoff', null, 0),
    event('activation', 'away', 10),
    event('goal', 'home', 12, 'But de Michel'),
    event('activation', 'home', 13),
    event('ambiance', 'home', 14),
    event('save', 'away', 15),
  ];
  for (const entry of events) entry.playerId = 'p';
  events[2]!.score = [1, 0];
  events[1]!.label = 'Le Lacet fou';
  events[3]!.label = 'La Mobylette';
  const nameOf = () => 'Michel';

  test('le plus récent en haut, clés stables, affichage limité', () => {
    const lines = liveLines(events, 'home', 3, nameOf);
    expect(lines.map((line) => line.key)).toEqual([5, 3, 2]);
    expect(liveLines(events, 'home', 0, nameOf)).toHaveLength(events.length - 1);
  });

  test('distingue les capacités du coach et celles d’en face', () => {
    expect(liveTone(events[1]!, 'home')).toBe('theirs');
    expect(liveTone(events[3]!, 'home')).toBe('mine');
    expect(liveTone(events[4]!, 'home')).toBe('plain');
    expect(liveTone(events[2]!, 'away')).toBe('goal');
  });

  test('chaque action se lit en quelques mots, le score vu du coach', () => {
    expect(liveHeadline(events[2]!, 'home', nameOf)).toBe('Michel marque · 1-0');
    expect(liveHeadline(events[2]!, 'away', nameOf)).toBe('Michel marque · 0-1');
    expect(liveHeadline(events[1]!, 'home', nameOf)).toBe('Michel : Le Lacet fou');
    expect(liveHeadline(events[4]!, 'home', nameOf)).toBeNull();
    expect(liveHeadline({ ...events[2]!, assistName: 'Gégé' }, 'home', nameOf)).toBe('Michel marque (passe de Gégé) · 1-0');
  });

  test('annonce seulement le dernier but', () => {
    expect(lastGoalText(events)).toBe("12' But de Michel");
    expect(lastGoalText(events.slice(0, 2))).toBe('');
  });
});
