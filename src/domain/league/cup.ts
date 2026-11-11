import type { Fixture } from '../types';
import type { Rng } from '../core/rng';
import { shuffled } from '../world/random';
import { cupRoundWeek } from './calendar';

/**
 * Coupe à élimination directe ouverte à tous les clubs (UNIV-06). Si le nombre de clubs n'est pas
 * une puissance de 2, un tour préliminaire élimine juste ce qu'il faut de clubs ; les autres sont exemptés
 * et entrent au tour suivant. Chaque tour est tiré au sort.
 */
export interface CupState {
  season: number;
  /** Nombre total de tours, préliminaire compris. */
  totalRounds: number;
  /** Clubs exemptés du tour préliminaire, qui entrent au tour 2. */
  byeClubIds: string[];
  /** Tous les matchs tirés jusqu'ici. */
  fixtures: Fixture[];
  /** Dernier tour tiré. */
  currentRound: number;
  /** Tours dont les primes ont été versées (CLUB-01). */
  paidRounds?: number[];
}

const MIN_CUP_CLUBS = 2;

export function cupRoundCount(clubCount: number): number {
  return Math.ceil(Math.log2(clubCount));
}

export interface CreateCupOptions {
  clubIds: readonly string[];
  rng: Rng;
  season: number;
}

/** Crée la coupe et tire le premier tour (préliminaire si besoin). */
export function createCup({ clubIds, rng, season }: CreateCupOptions): CupState {
  if (clubIds.length < MIN_CUP_CLUBS) throw new Error('Il faut au moins deux clubs pour une coupe');
  const totalRounds = cupRoundCount(clubIds.length);
  const mainDrawSize = 2 ** (totalRounds - 1);
  const isPowerOfTwo = clubIds.length === 2 ** totalRounds;
  const firstRoundEntrants = isPowerOfTwo ? clubIds.length : (clubIds.length - mainDrawSize) * 2;
  const drawn = shuffled(rng, clubIds);
  return {
    season,
    totalRounds,
    byeClubIds: drawn.slice(firstRoundEntrants),
    fixtures: pairUp(drawn.slice(0, firstRoundEntrants), 1, season),
    currentRound: 1,
  };
}

/** Qualifié d'un match de coupe : au score, sinon aux tirs au but (`penaltyWinnerId`). */
export function fixtureWinnerId(fixture: Fixture): string {
  const { result } = fixture;
  if (!result) throw new Error(`Le match ${fixture.id} n'a pas encore été joué`);
  if (result.homeGoals > result.awayGoals) return fixture.homeId;
  if (result.awayGoals > result.homeGoals) return fixture.awayId;
  if (result.penaltyWinnerId === fixture.homeId || result.penaltyWinnerId === fixture.awayId) {
    return result.penaltyWinnerId;
  }
  throw new Error(`Match nul sans tirs au but en coupe : ${fixture.id}`);
}

export function cupRoundFixtures(cup: CupState, round: number): Fixture[] {
  return cup.fixtures.filter((fixture) => fixture.round === round);
}

export function isCupRoundComplete(cup: CupState, round: number): boolean {
  return cupRoundFixtures(cup, round).every((fixture) => fixture.result !== null);
}

/** Clubs encore en lice : qualifiés du dernier tour joué, plus les exemptés après le préliminaire. */
function qualifiedClubIds(cup: CupState): string[] {
  const winners = cupRoundFixtures(cup, cup.currentRound).map(fixtureWinnerId);
  return cup.currentRound === 1 ? [...winners, ...cup.byeClubIds] : winners;
}

/** Tire au sort le tour suivant, une fois le tour en cours entièrement joué. Renvoie un nouvel état. */
export function drawNextCupRound(cup: CupState, rng: Rng): CupState {
  if (cup.currentRound >= cup.totalRounds) throw new Error('La finale est déjà tirée');
  if (!isCupRoundComplete(cup, cup.currentRound)) throw new Error(`Le tour ${cup.currentRound} n'est pas terminé`);
  const round = cup.currentRound + 1;
  const drawn = shuffled(rng, qualifiedClubIds(cup));
  return { ...cup, currentRound: round, fixtures: [...cup.fixtures, ...pairUp(drawn, round, cup.season)] };
}

/** Vainqueur de la coupe, ou null tant que la finale n'est pas jouée. */
export function cupWinnerId(cup: CupState): string | null {
  if (cup.currentRound !== cup.totalRounds) return null;
  const [final] = cupRoundFixtures(cup, cup.totalRounds);
  return final?.result ? fixtureWinnerId(final) : null;
}

/** Nom d'un tour, pour l'affichage. */
export function cupRoundName(cup: CupState, round: number): string {
  const hasPreliminary = cup.byeClubIds.length > 0;
  if (hasPreliminary && round === 1) return 'Tour préliminaire';
  const matches = 2 ** (cup.totalRounds - round);
  if (matches === 1) return 'Finale';
  if (matches === 2) return 'Demi-finales';
  if (matches === 4) return 'Quarts de finale';
  if (matches === 8) return 'Huitièmes de finale';
  if (matches === 16) return 'Seizièmes de finale';
  return `${matches}es de finale`;
}

function pairUp(clubIds: readonly string[], round: number, season: number): Fixture[] {
  const week = cupRoundWeek(round);
  const fixtures: Fixture[] = [];
  for (let i = 0; i + 1 < clubIds.length; i += 2) {
    fixtures.push({
      id: `s${season}-cup-t${round}-m${i / 2 + 1}`,
      competition: 'cup',
      divisionId: null,
      round,
      week,
      homeId: clubIds[i]!,
      awayId: clubIds[i + 1]!,
      result: null,
    });
  }
  return fixtures;
}
