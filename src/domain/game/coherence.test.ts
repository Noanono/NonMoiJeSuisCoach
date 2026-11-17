import { describe, expect, test } from 'bun:test';
import { getAbility } from '../abilities/catalog';
import { runAiTransfers } from '../club/aiTransfers';
import { countRarities, rarityLimits } from '../club/rarityQuota';
import { createRng } from '../core/rng';
import { activeEffects } from '../match/queries';
import { makeSheet, testMatchOptions } from '../match/fixtures';
import { createMatch, requirePlayer } from '../match/state';
import { aiTakeTurn } from '../match/ai';
import { beginRun, endRun } from '../match/state';
import { overall } from '../player/rating';
import { makePlayer } from '../testing/fixtures';
import type { Ability } from '../types';
import { developPlayers } from '../world/development';
import { buy, keepStandIn, market } from './actions';
import { newGame } from './newGame';
import { seenByCoach } from './scouting';
import { clubPlayers, divisionOf, humanClub } from './selectors';
import { callUpStandIns, releaseStandIns } from './standIns';

const rarityOf = (id: string) => getAbility(id).rarity;

describe('cohérence du monde', () => {
  test('1. les raretés générées suivent la division : peu en District, plus en élite, aucune mythique en bas', () => {
    const state = newGame({ seed: 100 });
    const share = (tier: number) => {
      const players = Object.values(state.clubs).filter((club) => divisionOf(state, club.id).tier === tier).flatMap((club) => clubPlayers(state, club.id));
      const counts = countRarities(players, rarityOf);
      return { rare: counts.rare / players.length, mythic: counts.mythic };
    };
    expect(share(4).rare).toBeLessThan(share(1).rare);
    expect(share(4).mythic).toBe(0);
  });

  test('2. au mercato, un club IA n’achète pas une rareté qu’il ne pourrait pas aligner', () => {
    const state = newGame({ seed: 101 });
    const tierOf = (clubId: string) => divisionOf(state, clubId).tier;
    let world = { clubs: state.clubs, players: state.players };
    const rng = createRng(4);
    for (let week = 0; week < 10; week++) {
      const before = world;
      const { world: next, transfers } = runAiTransfers(world, { rng, abilityOf: getAbility, tierOf });
      for (const transfer of transfers) {
        const rarity = rarityOf(next.players[transfer.playerId]!.ability.abilityId);
        if (rarity === 'common') continue;
        const squadBefore = before.clubs[transfer.toClubId]!.playerIds.map((id) => before.players[id]!);
        expect(countRarities(squadBefore, rarityOf)[rarity]).toBeLessThan(rarityLimits(tierOf(transfer.toClubId))[rarity]);
      }
      world = next;
    }
  });

  test('6. les joueurs d’un coach progressent moins à l’intersaison, puisqu’ils s’entraînent chaque semaine', () => {
    const young = makePlayer({ age: 19, potential: 80 });
    const [free] = developPlayers([young], createRng(3));
    const [coached] = developPlayers([young], createRng(3), () => ({ seasonStart: overall(young) }));
    expect(overall(coached!)).toBeLessThan(overall(free!));
    expect(overall(coached!)).toBeGreaterThanOrEqual(overall(young));
  });

  test('7. le prix d’un joueur non scouté ne trahit pas son potentiel', () => {
    const state = newGame({ seed: 102 });
    const target = Object.values(state.players).find((player) => player.clubId !== state.humanClubId && player.age <= 21 && seenByCoach(state, player) !== player)!;
    const priceOf = () => market(state).find((listing) => listing.playerId === target.id)?.price;
    const original = priceOf();
    state.players[target.id] = { ...target, potential: Math.min(99, target.potential + 20) };
    expect(priceOf()).toBe(original);
  });

  test('8. un dépanneur dont on n’a plus besoin part au mercato ; un dépanneur gardé reste', () => {
    const state = newGame({ seed: 103 });
    const club = humanClub(state);
    // Blessés en série : le club appelle des dépanneurs.
    const squad = clubPlayers(state, club.id);
    for (const player of squad.slice(1, 8)) state.players[player.id] = { ...player, injuryWeeks: 3 };
    expect(callUpStandIns(state, club.id, createRng(2))).toBeGreaterThan(0);
    const standIns = clubPlayers(state, club.id).filter((player) => player.standIn);
    expect(keepStandIn(state, standIns[0]!.id).ok).toBe(true);
    // Les blessés reviennent : au mercato, les autres dépanneurs s'en vont.
    for (const player of squad.slice(1, 8)) state.players[player.id] = { ...state.players[player.id]!, injuryWeeks: 0 };
    const released = releaseStandIns(state);
    expect(released.get(club.id)?.length).toBe(standIns.length - 1);
    expect(state.players[standIns[0]!.id]!.clubId).toBe(club.id);
    expect(state.players[standIns[1]!.id]!.clubId).toBeNull();
    void buy;
  });
});

describe('cohérence du match', () => {
  const shieldAbility: Ability = {
    id: 'mur',
    name: 'mur',
    rarity: 'common',
    category: 'defense',
    position: 'ANY',
    targeting: { kind: 'self' },
    trigger: 'anytime',
    description: '',
    hidden: false,
    effects: [],
  };

  test('4. bouclier, immunité et marqueur se voient sur le joueur', () => {
    const state = createMatch(testMatchOptions(makeSheet({ clubId: 'h', isHuman: true }), makeSheet({ clubId: 'a', isHuman: true })));
    const player = requirePlayer(state, 'h-9');
    player.shield = { charges: 2, until: state.elapsed + 20 };
    player.steadyUntil = state.elapsed + 10;
    player.effects.push({ label: 'Marquage', stat: 'all', value: -0.5, endsAt: state.elapsed + 30, markerId: 'a-2' });
    const views = activeEffects(state, 'h-9');
    expect(views.find((view) => view.stat === 'shield')?.value).toBe(2);
    expect(views.some((view) => view.stat === 'steady')).toBe(true);
    expect(views.find((view) => view.label === 'Marquage')?.markedBy).toBe(requirePlayer(state, 'a-2').name);
    void shieldAbility;
  });

  test('5. l’IA vise un adversaire sans bouclier plutôt que le meilleur protégé', () => {
    // Sabotage de l'IA (fixture « chambreur » : 2 adversaires) contre une équipe dont les meilleurs sont protégés.
    let protectedHits = 0;
    let hits = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const state = createMatch({ ...testMatchOptions(makeSheet({ clubId: 'h', abilities: { 9: 'boucher' } }), makeSheet({ clubId: 'a', isHuman: true })), seed });
      const attackers = state.away.players.filter((player) => player.line === 'ATT').slice(0, 1);
      for (const attacker of attackers) attacker.shield = { charges: 1, until: 999 };
      state.home.gauge = 10;
      state.minute = 75;
      for (let turn = 0; turn < 40 && state.activations.length === 0; turn++) {
        const run = beginRun(state);
        aiTakeTurn(run, 'home');
        endRun(run);
      }
      hits += state.activations.length;
      for (const activation of state.activations) protectedHits += activation.targetIds.filter((id) => attackers.some((attacker) => attacker.id === id)).length;
    }
    expect(hits).toBeGreaterThan(10);
    expect(protectedHits).toBe(0);
  });
});
