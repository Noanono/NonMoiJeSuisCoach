import { describe, expect, test } from 'bun:test';
import { DIALOGUES } from '../club/dialogues';
import { facilitiesOf, MAX_FACILITY_LEVEL, upgradeCost } from '../club/facilities';
import { CUP_WINNER_PRIZE, leaguePrize } from '../club/finance';
import { cupRoundFixtures } from '../league/cup';
import { cupStagePrize, payCupRound } from './cupPrizes';
import { createRng } from '../core/rng';
import { dismissEventWindow, tick } from '../match';
import { overall } from '../player/rating';
import { salaryForRating } from '../world/playerGenerator';
import { generateYouthIntake } from '../world/youthAcademy';
import { ABILITIES } from '../abilities/catalog';
import { XP_THRESHOLDS } from '../abilities/progression';
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

  test('une sauvegarde de la version 4 passe aux nouveaux paliers d’XP sans perdre de niveau', () => {
    const state = newGame({ seed: 42 });
    const mine = humanSquad(state)[0]!;
    mine.ability = { ...mine.ability, level: 3, xp: 90 };
    const veteran = Object.values(state.players).find((player) => player.clubId !== state.humanClubId && player.age >= 32)!;
    veteran.ability = { ...veteran.ability, level: 1, xp: 0 };
    const migrated = migrateGame(JSON.parse(JSON.stringify(state)), 4)!;
    expect(migrated.players[mine.id]!.ability).toMatchObject({ level: 3, xp: XP_THRESHOLDS[2] });
    expect(migrated.players[veteran.id]!.ability.level).toBeGreaterThan(1);
  });
});

describe('niveau des capacités dans le monde (CAP-10)', () => {
  test('les joueurs générés ont une capacité d’autant plus haute qu’ils sont âgés', () => {
    const players = Object.values(newGame({ seed: 43 }).players);
    const averageLevel = (min: number, max: number) => {
      const group = players.filter((player) => player.age >= min && player.age <= max);
      return group.reduce((sum, player) => sum + player.ability.level, 0) / group.length;
    };
    expect(averageLevel(18, 20)).toBeLessThan(averageLevel(24, 27));
    expect(averageLevel(24, 27)).toBeLessThan(averageLevel(31, 34));
    expect(averageLevel(31, 34)).toBeGreaterThanOrEqual(3);
  });

  test('en fin de saison, les capacités des autres clubs progressent, pas celles du coach', () => {
    const state = newGame({ seed: 44 });
    const mine = humanSquad(state)[0]!;
    const other = Object.values(state.players).find((player) => player.clubId !== state.humanClubId && player.age < 30)!;
    const [mineXp, otherXp] = [mine.ability.xp, other.ability.xp];
    withRng(state, (rng) => endSeason(state, rng));
    expect(state.players[mine.id]!.ability.xp).toBe(mineXp);
    expect(state.players[other.id]!.ability.xp).toBeGreaterThan(otherXp);
  });
});

describe('primes de fin de saison (CLUB-01)', () => {
  test('la prime dépend de la place et du niveau de la division', () => {
    expect(leaguePrize(1, 1, 10)).toBeGreaterThan(leaguePrize(1, 2, 10));
    expect(leaguePrize(1, 10, 10)).toBeCloseTo(leaguePrize(1, 1, 10) * 0.1, -2);
    expect(leaguePrize(1, 1, 10)).toBeGreaterThan(leaguePrize(2, 1, 10));
    expect(leaguePrize(4, 1, 10)).toBeGreaterThan(leaguePrize(4, 10, 10));
  });

  test('en fin de saison, le club du coach touche sa prime de classement', () => {
    const state = newGame({ seed: 45 });
    const before = humanClub(state).budget;
    withRng(state, (rng) => endSeason(state, rng));
    const record = state.history.at(-1)!;
    expect(record.prizeMoney).toBe(leaguePrize(4, record.position, 10));
    expect(humanClub(state).budget).toBe(before + record.prizeMoney!);
  });

  test('le vainqueur de la coupe touche une prime en plus', () => {
    const state = newGame({ seed: 46 });
    const cup = state.cup;
    // Coupe jouée jusqu'à une finale gagnée par le club du coach.
    cup.currentRound = cup.totalRounds;
    cup.fixtures.push({ id: 'finale', competition: 'cup', divisionId: null, round: cup.totalRounds, week: 99, homeId: state.humanClubId, awayId: Object.keys(state.clubs).find((id) => id !== state.humanClubId)!, result: { homeGoals: 2, awayGoals: 0, scorers: [] } });
    expect(cupRoundFixtures(cup, cup.totalRounds).some((fixture) => fixture.id === 'finale')).toBe(true);
    withRng(state, (rng) => endSeason(state, rng));
    const record = state.history.at(-1)!;
    expect(record.prizeMoney).toBe(leaguePrize(4, record.position, 10) + CUP_WINNER_PRIZE);
  });
});

describe('primes de coupe selon le tour atteint (CLUB-01)', () => {
  test('la prime double à chaque tour, la finale perdue vaut la moitié de la victoire', () => {
    expect(cupStagePrize(6, 6)).toBe(CUP_WINNER_PRIZE / 2);
    expect(cupStagePrize(6, 5)).toBe(CUP_WINNER_PRIZE / 4);
    expect(cupStagePrize(6, 2)).toBeGreaterThan(cupStagePrize(6, 1));
  });

  test('éliminé, le club du coach touche sa prime tout de suite, une seule fois', () => {
    // Une partie où le club du coach joue le premier tour (sinon il est exempté).
    const plays = (game: GameState) => game.cup.fixtures.find((entry) => entry.round === game.cup.currentRound && (entry.homeId === game.humanClubId || entry.awayId === game.humanClubId));
    let seed = 47;
    while (!plays(newGame({ seed }))) seed++;
    const state = newGame({ seed });
    const fixture = plays(state)!;
    for (const entry of cupRoundFixtures(state.cup, state.cup.currentRound)) entry.result = { homeGoals: 0, awayGoals: 1, scorers: [] };
    const humanIsHome = fixture.homeId === state.humanClubId;
    const before = humanClub(state).budget;
    payCupRound(state, state.cup.currentRound);
    payCupRound(state, state.cup.currentRound);
    const expected = humanIsHome ? cupStagePrize(state.cup.totalRounds, state.cup.currentRound) : 0;
    expect(humanClub(state).budget).toBe(before + expected);
    if (humanIsHome) expect(state.lastFinance.at(-1)).toEqual({ label: 'Prime de coupe', amount: expected });
  });
});
