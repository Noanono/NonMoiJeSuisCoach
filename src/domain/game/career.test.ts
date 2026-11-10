import { describe, expect, test } from 'bun:test';
import { DIALOGUES } from '../club/dialogues';
import { facilitiesOf, MAX_FACILITY_LEVEL, upgradeCost } from '../club/facilities';
import { createRng } from '../core/rng';
import { dismissEventWindow, tick } from '../match';
import { overall } from '../player/rating';
import { salaryForRating } from '../world/playerGenerator';
import { generateYouthIntake } from '../world/youthAcademy';
import { ABILITIES } from '../abilities/catalog';
import { answerDialogue, autoPickLineup, upgradeFacility } from './actions';
import { acceptJob } from './career';
import { DIFFICULTIES, scaleConfidenceDelta } from './difficulty';
import { finishHumanMatch, humanLineupErrors, startHumanMatch } from './matches';
import { newGame } from './newGame';
import { createGameSaves, migrateGame } from './save';
import { endSeason, HUMAN_YOUTH_PER_SEASON, retirementChance } from './season';
import { humanClub, humanFixture, humanSquad, isDerby } from './selectors';
import type { GameState } from './state';
import { seasonLeaders } from './stats';
import { advanceWeek, withRng } from './week';

function playWeek(state: GameState): void {
  const fixture = humanFixture(state);
  if (fixture && !fixture.result) {
    if (humanLineupErrors(state).length > 0) autoPickLineup(state);
    const match = withRng(state, (rng) => startHumanMatch(state, rng));
    while (match.status !== 'finished') {
      if (match.awaiting) dismissEventWindow(match);
      tick(match);
    }
    finishHumanMatch(state, match);
  }
  if (state.dialogue) {
    const dialogue = DIALOGUES.find((entry) => entry.id === state.dialogue!.dialogueId)!;
    answerDialogue(state, dialogue.choices[0]!.id);
  }
  advanceWeek(state);
}

describe('salaires et retraites (EFF-09, EFF-10)', () => {
  test('aucune retraite avant 32 ans, puis une chance qui grimpe chaque année', () => {
    expect(retirementChance(31)).toBe(0);
    expect(retirementChance(32)).toBeGreaterThan(0);
    expect(retirementChance(34)).toBeGreaterThan(retirementChance(33));
    expect(retirementChance(40)).toBe(1);
  });

  test('en fin de saison, les salaires suivent la note et les vieux raccrochent', () => {
    const state = newGame({ seed: 31 });
    const veteran = humanSquad(state)[0]!;
    veteran.age = 45;
    const others = humanSquad(state).slice(1).map((player) => player.id);
    withRng(state, (rng) => endSeason(state, rng));
    expect(state.players[veteran.id]).toBeUndefined();
    expect(humanClub(state).playerIds).not.toContain(veteran.id);
    for (const id of others) {
      const player = state.players[id];
      if (player) expect(player.salary).toBe(salaryForRating(overall(player)));
    }
  });
});

describe('centre de formation (CLUB-07, CLUB-09)', () => {
  test('un seul jeune promu par saison chez le coach', () => {
    const state = newGame({ seed: 32 });
    const before = new Set(humanClub(state).playerIds);
    withRng(state, (rng) => endSeason(state, rng));
    const newcomers = humanClub(state).playerIds.filter((id) => !before.has(id) && (state.players[id]?.age ?? 99) <= 18);
    expect(newcomers).toHaveLength(HUMAN_YOUTH_PER_SEASON);
  });

  test('un centre développé sort des jeunes meilleurs et à plus fort potentiel', () => {
    const club = humanClub(newGame({ seed: 33 }));
    const average = (boost: { rating: number; potential: number }) => {
      const youngsters = generateYouthIntake({ rng: createRng(5), club, abilityPool: ABILITIES, excludedAbilityIds: [], count: 40, boost });
      return {
        rating: youngsters.reduce((sum, player) => sum + overall(player), 0) / youngsters.length,
        potential: youngsters.reduce((sum, player) => sum + player.potential, 0) / youngsters.length,
      };
    };
    const base = average({ rating: 0, potential: 0 });
    const boosted = average({ rating: 12, potential: 15 });
    expect(boosted.rating).toBeGreaterThan(base.rating);
    expect(boosted.potential).toBeGreaterThan(base.potential);
  });
});

describe('installations (CLUB-09)', () => {
  test('une amélioration coûte du budget et monte le niveau, jusqu’au niveau maximum', () => {
    const state = newGame({ seed: 34 });
    const club = humanClub(state);
    club.budget = 1_000_000;
    for (let level = 0; level < MAX_FACILITY_LEVEL; level++) {
      const budget = club.budget;
      expect(upgradeFacility(state, 'buvette').ok).toBe(true);
      expect(club.budget).toBe(budget - upgradeCost(level)!);
    }
    expect(facilitiesOf(club).buvette).toBe(MAX_FACILITY_LEVEL);
    expect(upgradeFacility(state, 'buvette').ok).toBe(false);
  });

  test('sans argent, rien ne se construit', () => {
    const state = newGame({ seed: 35 });
    humanClub(state).budget = 0;
    expect(upgradeFacility(state, 'tribunes').ok).toBe(false);
    expect(facilitiesOf(humanClub(state)).tribunes).toBe(0);
  });
});

describe('difficulté (UNIV-07)', () => {
  test('le facile donne plus de budget et de confiance que le difficile', () => {
    const easy = newGame({ seed: 36, difficulty: 'easy' });
    const hard = newGame({ seed: 36, difficulty: 'hard' });
    expect(humanClub(easy).budget).toBeGreaterThan(humanClub(hard).budget);
    expect(easy.outlook.presidentConfidence).toBe(DIFFICULTIES.easy.startConfidence);
    expect(hard.outlook.presidentConfidence).toBe(DIFFICULTIES.hard.startConfidence);
  });

  test('seules les pertes de confiance sont modulées', () => {
    expect(scaleConfidenceDelta(5, 'hard')).toBe(5);
    expect(scaleConfidenceDelta(-10, 'hard')).toBeLessThan(-10);
    expect(scaleConfidenceDelta(-10, 'easy')).toBeGreaterThan(-10);
  });
});

describe('rebond après licenciement (CLUB-05)', () => {
  test('licencié, le coach reçoit trois offres et peut signer ailleurs', () => {
    const state = newGame({ seed: 37 });
    const formerId = state.humanClubId;
    state.outlook.presidentConfidence = 0;
    playWeek(state);
    expect(state.status).toBe('fired');
    expect(state.jobOffers).toHaveLength(3);
    expect(state.jobOffers).not.toContain(formerId);
    const week = state.week;
    const target = state.jobOffers[0]!;
    expect(acceptJob(state, target)).toBe(true);
    expect(state.status).toBe('playing');
    expect(state.humanClubId).toBe(target);
    expect(state.clubs[formerId]!.isHuman).toBe(false);
    expect(state.clubs[target]!.isHuman).toBe(true);
    expect(state.week).toBe(week + 1);
    expect(state.outlook.presidentConfidence).toBe(DIFFICULTIES.normal.startConfidence);
    playWeek(state);
    expect(state.week).toBe(week + 2);
  });

  test('on ne signe pas dans un club qui n’a rien proposé', () => {
    const state = newGame({ seed: 38 });
    expect(acceptJob(state, Object.keys(state.clubs)[0]!)).toBe(false);
  });
});

describe('rivalités (UNIV-09)', () => {
  test('un rival de la division est tiré chaque saison et ses matchs sont des derbys', () => {
    const state = newGame({ seed: 39 });
    const division = state.divisions.find((entry) => entry.clubIds.includes(state.humanClubId))!;
    expect(state.rivalId).not.toBeNull();
    expect(division.clubIds).toContain(state.rivalId!);
    expect(state.rivalId).not.toBe(state.humanClubId);
    const derbies = state.fixtures.filter((fixture) => isDerby(state, fixture));
    expect(derbies).toHaveLength(2);
  });
});

describe('passes décisives et statistiques (UNIV-08)', () => {
  test('les passes sont comptées et classées en cours de saison', () => {
    const state = newGame({ seed: 40 });
    for (let week = 0; week < 8 && state.status === 'playing'; week++) playWeek(state);
    const players = Object.values(state.players);
    const goals = players.reduce((sum, player) => sum + player.seasonStats.goals, 0);
    const assists = players.reduce((sum, player) => sum + player.seasonStats.assists, 0);
    expect(assists).toBeGreaterThan(0);
    expect(assists).toBeLessThanOrEqual(goals);
    const divisionId = state.divisions.find((entry) => entry.clubIds.includes(state.humanClubId))!.id;
    const leaders = seasonLeaders(state, divisionId);
    expect(leaders.scorers.length).toBeGreaterThan(0);
    expect(leaders.scorers[0]!.value).toBeGreaterThanOrEqual(leaders.scorers.at(-1)!.value);
    expect(leaders.team.length).toBeGreaterThanOrEqual(10);
  });
});

describe('sauvegardes (TECH-03)', () => {
  test('une sauvegarde de la version 3 est mise à niveau au chargement', () => {
    const state = newGame({ seed: 41 });
    const old = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    delete old.difficulty;
    delete old.jobOffers;
    delete old.rivalId;
    for (const player of Object.values(old.players as Record<string, { seasonStats: Record<string, number> }>)) delete player.seasonStats.assists;
    const memory = new Map<string, string>();
    memory.set('nmjsc1', JSON.stringify({ format: 'non-moi-je-suis-coach', meta: { clubName: 'x', season: 1, week: 1, savedAt: '2026-01-01', version: 3 }, data: old }));
    const saves = createGameSaves({
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
    });
    const loaded = saves.load(1);
    expect(loaded.difficulty).toBe('normal');
    expect(loaded.jobOffers).toEqual([]);
    expect(loaded.rivalId).not.toBeNull();
    expect(Object.values(loaded.players).every((player) => player.seasonStats.assists === 0)).toBe(true);
    expect(migrateGame(old, 2)).toBeNull();
  });
});
