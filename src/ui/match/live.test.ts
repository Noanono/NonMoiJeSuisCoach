import { describe, expect, test } from 'bun:test';
import type { MatchEvent } from '../../domain/match';
import { lastGoalText, liveLines, liveTone, minuteIntervalMs, minuteLabel } from './live';

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
    event('combo', 'home', 14),
  ];

  test('le plus récent en haut, clés stables, affichage limité', () => {
    const lines = liveLines(events, 'home', 3);
    expect(lines.map((line) => line.key)).toEqual([4, 3, 2]);
    expect(liveLines(events, 'home', 0)).toHaveLength(events.length);
  });

  test('distingue les capacités du coach et celles d’en face', () => {
    expect(liveTone(events[1]!, 'home')).toBe('theirs');
    expect(liveTone(events[3]!, 'home')).toBe('mine');
    expect(liveTone(events[4]!, 'home')).toBe('combo');
    expect(liveTone(events[2]!, 'away')).toBe('goal');
  });

  test('annonce seulement le dernier but', () => {
    expect(lastGoalText(events)).toBe("12' But de Michel");
    expect(lastGoalText(events.slice(0, 2))).toBe('');
  });
});
