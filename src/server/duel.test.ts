import { describe, expect, test } from 'bun:test';
import { DIALOGUES } from '../domain/club/dialogues';
import { asCoach, autoPickLineup, humanFixture, humanLineupErrors, isHumanDuel, startHumanMatch, withRng, type GameState } from '../domain/game';
import { dismissEventWindow, summarize, tick } from '../domain/match';
import { DUEL_DECISION_MS, DUEL_MINUTE_MS, DUEL_PAUSE_MS, DUEL_PAUSES } from './duel';
import { MultiplayerHub, type ServerMessage } from './hub';

const ALICE = { id: 'a', name: 'Alice', clubName: 'Les Gros Mollets' };
const BOB = { id: 'b', name: 'Bob', clubName: 'Racing Pastis' };

function gameOf(hub: MultiplayerHub): GameState {
  return hub.save().game!;
}

/** Joue le match contre l'IA d'un coach (comme son navigateur) et répond à son dialogue. */
function settle(hub: MultiplayerHub, coachId: string): void {
  const game = gameOf(hub);
  const summary = asCoach(game, coachId, () => {
    const fixture = humanFixture(game);
    if (!fixture || fixture.result || isHumanDuel(game, fixture)) return null;
    if (humanLineupErrors(game).length > 0) autoPickLineup(game);
    const copy = structuredClone(game);
    const match = withRng(copy, (rng) => startHumanMatch(copy, rng));
    while (match.status !== 'finished') {
      if (match.awaiting) dismissEventWindow(match);
      tick(match);
    }
    return summarize(match);
  });
  if (summary) hub.command(coachId, 'submitMatch', [summary]);
  const dialogueId = asCoach(game, coachId, () => game.dialogue?.dialogueId);
  if (dialogueId) hub.command(coachId, 'answerDialogue', [DIALOGUES.find((dialogue) => dialogue.id === dialogueId)!.choices[0]!.id]);
}

/** Ligue de deux coachs, avancée jusqu'à la semaine où ils s'affrontent. */
function duelWeek(): MultiplayerHub {
  const hub = MultiplayerHub.create(7);
  hub.connect('a');
  hub.connect('b');
  hub.join(ALICE);
  hub.join(BOB);
  hub.start('a');
  const game = gameOf(hub);
  for (let guard = 0; guard < 40; guard++) {
    const fixture = asCoach(game, 'a', () => humanFixture(game));
    if (fixture && isHumanDuel(game, fixture)) return hub;
    settle(hub, 'a');
    settle(hub, 'b');
    hub.setReady('a', true);
    hub.setReady('b', true);
  }
  throw new Error('Pas de duel trouvé');
}

function view(hub: MultiplayerHub, coachId: string, now: number) {
  const message = JSON.parse(hub.duelMessageFor(coachId, now)!) as ServerMessage;
  if (message.type !== 'duel') throw new Error('match attendu');
  return message;
}

describe('match en direct entre coachs (MULTI-07)', () => {
  test('le coup d’envoi attend les deux coachs, puis le serveur joue à ×1 jusqu’au bout', () => {
    const hub = duelWeek();
    let now = 1_000_000;
    expect(hub.joinDuel('a', now).ok).toBe(true);
    hub.advanceDuels((now += 5000));
    expect(view(hub, 'a', now).match.minute).toBe(0);
    expect(view(hub, 'a', now).view.started).toBe(false);
    expect(hub.joinDuel('b', now).ok).toBe(true);
    expect(view(hub, 'b', now).view.started).toBe(true);
    // Une minute de jeu par seconde.
    hub.advanceDuels((now += DUEL_MINUTE_MS));
    expect(view(hub, 'a', now).match.minute).toBe(1);
    // Pendant le match, pas de semaine suivante.
    expect(hub.setReady('a', true).ok).toBe(false);
    let gameChanged = false;
    for (let step = 0; step < 5000 && !gameChanged; step++) gameChanged = hub.advanceDuels((now += 200)).gameChanged;
    expect(gameChanged).toBe(true);
    const game = gameOf(hub);
    const fixture = asCoach(game, 'a', () => humanFixture(game))!;
    expect(fixture.result).toBeDefined();
    // Les deux coachs voient leurs joueurs alignés, et peuvent passer à la semaine suivante.
    for (const coach of ['a', 'b']) asCoach(game, coach, () => expect(game.lastAppearances.length).toBeGreaterThanOrEqual(11));
    settle(hub, 'a');
    settle(hub, 'b');
    expect(hub.setReady('a', true).ok).toBe(true);
    const advanced = hub.setReady('b', true);
    expect(advanced.ok && advanced.value.advanced).toBe(true);
  });

  test('trois pauses de 10 s par coach, et seul celui qui a mis pause peut reprendre', () => {
    const hub = duelWeek();
    let now = 2_000_000;
    hub.joinDuel('a', now);
    hub.joinDuel('b', now);
    for (let pause = 0; pause < DUEL_PAUSES; pause++) {
      expect(hub.duelCommand('a', 'pause', [], now).ok).toBe(true);
      expect(hub.duelCommand('b', 'resume', [], now).ok).toBe(false);
      const minute = view(hub, 'a', now).match.minute;
      hub.advanceDuels((now += DUEL_PAUSE_MS - 100));
      expect(view(hub, 'a', now).match.minute).toBe(minute);
      hub.advanceDuels((now += 200));
      expect(view(hub, 'a', now).view.pausedBy).toBeNull();
    }
    expect(hub.duelCommand('a', 'pause', [], now).ok).toBe(false);
    expect(view(hub, 'a', now).view.pausesLeft).toEqual({ home: 0, away: DUEL_PAUSES });
  });

  test('une décision ne bloque pas le match plus de 15 s, et chacun ne joue que pour son camp', () => {
    const hub = duelWeek();
    let now = 3_000_000;
    hub.joinDuel('a', now);
    hub.joinDuel('b', now);
    // On avance jusqu'à la première fenêtre de choix (coup franc, corner, penalty…).
    let awaiting = view(hub, 'a', now).match.awaiting;
    for (let step = 0; step < 2000 && !awaiting; step++) {
      hub.advanceDuels((now += 200));
      awaiting = view(hub, 'a', now).match.awaiting;
    }
    if (!awaiting) throw new Error('Aucune fenêtre de choix dans le match');
    const deciding = awaiting.side === 'home' ? 'a' : 'b';
    const other = deciding === 'a' ? 'b' : 'a';
    expect(hub.duelCommand(other, 'dismissWindow', [], now).ok).toBe(false);
    const minute = view(hub, 'a', now).match.minute;
    hub.advanceDuels((now += DUEL_DECISION_MS - 200));
    expect(view(hub, 'a', now).match.awaiting).not.toBeNull();
    expect(view(hub, 'a', now).match.minute).toBe(minute);
    // Passé 15 s, le jeu décide seul et le match repart (fenêtre de l'autre camp éventuelle comprise).
    for (let step = 0; step < 200; step++) hub.advanceDuels((now += 200));
    expect(view(hub, 'a', now).match.minute).toBeGreaterThan(minute);
  });
});
