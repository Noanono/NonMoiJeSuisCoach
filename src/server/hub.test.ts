import { describe, expect, test } from 'bun:test';
import { DIALOGUES } from '../domain/club/dialogues';
import { asCoach, autoPickLineup, humanFixture, humanLineupErrors, isHumanDuel, startHumanMatch, withRng, type GameState } from '../domain/game';
import { dismissEventWindow, summarize, tick } from '../domain/match';
import { MultiplayerHub, type HubSnapshot, type ServerMessage } from './hub';

const ALICE = { id: 'a', name: 'Alice', clubName: 'Les Gros Mollets' };
const BOB = { id: 'b', name: 'Bob', clubName: 'Racing Pastis' };

function startedHub(): MultiplayerHub {
  const hub = MultiplayerHub.create(42);
  hub.connect('a');
  hub.connect('b');
  hub.join(ALICE);
  hub.join(BOB);
  expect(hub.start('a').ok).toBe(true);
  return hub;
}

function gameOf(hub: MultiplayerHub): GameState {
  return hub.save().game!;
}

/** Ce que le client fait de son côté : jouer son match contre l'IA, puis envoyer le résumé. */
function playOwnMatch(hub: MultiplayerHub, coachId: string): void {
  const game = gameOf(hub);
  const summary = asCoach(game, coachId, () => {
    const fixture = humanFixture(game);
    if (!fixture || fixture.result || isHumanDuel(game, fixture)) return null;
    if (humanLineupErrors(game).length > 0) autoPickLineup(game);
    // Le client joue sur sa copie : le générateur du serveur n'est pas touché.
    const copy = structuredClone(game);
    const match = withRng(copy, (rng) => startHumanMatch(copy, rng));
    while (match.status !== 'finished') {
      if (match.awaiting) dismissEventWindow(match);
      tick(match);
    }
    return summarize(match);
  });
  if (summary) expect(hub.command(coachId, 'submitMatch', [summary]).ok).toBe(true);
  const dialogueId = asCoach(game, coachId, () => game.dialogue?.dialogueId);
  if (dialogueId) {
    const choice = DIALOGUES.find((dialogue) => dialogue.id === dialogueId)!.choices[0]!.id;
    expect(hub.command(coachId, 'answerDialogue', [choice]).ok).toBe(true);
  }
}

describe('serveur de la ligue entre amis (MULTI-02 à MULTI-05)', () => {
  test('salle d’attente : inscriptions, noms uniques, puis lancement avec les coachs connectés', () => {
    const hub = MultiplayerHub.create(1);
    hub.connect('a');
    expect(hub.join(ALICE).ok).toBe(true);
    expect(hub.join({ id: 'b', name: 'alice', clubName: 'X' }).ok).toBe(false);
    hub.join(BOB);
    // Bob s'est inscrit mais n'est pas connecté au lancement : il n'est pas de la partie.
    expect(hub.start('a').ok).toBe(true);
    expect(gameOf(hub).coaches!.map((coach) => coach.id)).toEqual(['a']);
  });

  test('chaque coach reçoit la partie de son point de vue', () => {
    const hub = startedHub();
    const forAlice = JSON.parse(hub.messageFor('a')) as ServerMessage;
    const forBob = JSON.parse(hub.messageFor('b')) as ServerMessage;
    if (forAlice.type !== 'game' || forBob.type !== 'game') throw new Error('partie attendue');
    expect(forAlice.game.clubs[forAlice.game.humanClubId]!.name).toBe(ALICE.clubName);
    expect(forBob.game.clubs[forBob.game.humanClubId]!.name).toBe(BOB.clubName);
    expect(forAlice.coaches.map((coach) => coach.name)).toEqual(['Alice', 'Bob']);
    // Un inconnu reste dans la salle d'attente.
    expect((JSON.parse(hub.messageFor('z')) as ServerMessage).type).toBe('lobby');
  });

  test('une commande ne touche que le club de celui qui l’envoie', () => {
    const hub = startedHub();
    const game = gameOf(hub);
    const bobPlayer = asCoach(game, 'b', () => game.clubs[game.humanClubId]!.playerIds[3]!);
    expect(hub.command('a', 'setTrainingFocus', [bobPlayer, 'speed']).ok).toBe(true);
    expect(game.players[bobPlayer]!.training.focus).not.toBe('speed');
    expect(hub.command('b', 'setTrainingFocus', [bobPlayer, 'speed']).ok).toBe(true);
    expect(game.players[bobPlayer]!.training.focus).toBe('speed');
    expect(hub.command('a', 'pirater', []).ok).toBe(false);
    expect(hub.command('z', 'autoPickLineup', []).ok).toBe(false);
  });

  test('la semaine n’avance que quand tout le monde a cliqué', () => {
    const hub = startedHub();
    for (let week = 1; week <= 4; week++) {
      const before = gameOf(hub).week;
      playOwnMatch(hub, 'a');
      playOwnMatch(hub, 'b');
      expect(hub.setReady('a', true).ok).toBe(true);
      expect(gameOf(hub).week).toBe(before);
      expect(hub.presence().find((coach) => coach.id === 'a')!.ready).toBe(true);
      const result = hub.setReady('b', true);
      expect(result.ok && result.value.advanced).toBe(true);
      expect(gameOf(hub).week).toBe(before + 1);
      expect(hub.presence().every((coach) => !coach.ready)).toBe(true);
    }
  });

  test('pas prêt tant que son match n’est pas joué', () => {
    const hub = startedHub();
    const game = gameOf(hub);
    while (!asCoach(game, 'a', () => {
      const fixture = humanFixture(game);
      return fixture && !isHumanDuel(game, fixture);
    })) {
      playOwnMatch(hub, 'a');
      playOwnMatch(hub, 'b');
      hub.setReady('a', true);
      hub.setReady('b', true);
    }
    const refusal = hub.setReady('a', true);
    expect(refusal.ok).toBe(false);
    expect(hub.presence().find((coach) => coach.id === 'a')!.waitingFor).not.toBeNull();
  });

  test('un ami arrive en cours de partie, et la ligue se recharge depuis la sauvegarde', () => {
    const hub = startedHub();
    expect(hub.join({ id: 'c', name: 'Chloé', clubName: 'AS Cassoulet' }).ok).toBe(true);
    const saved = JSON.parse(JSON.stringify(hub.save())) as HubSnapshot;
    const reloaded = new MultiplayerHub(saved);
    const message = JSON.parse(reloaded.messageFor('c')) as ServerMessage;
    if (message.type !== 'game') throw new Error('partie attendue');
    expect(message.game.clubs[message.game.humanClubId]!.name).toBe('AS Cassoulet');
    expect(reloaded.presence().map((coach) => coach.id)).toEqual(['a', 'b', 'c']);
  });
});
