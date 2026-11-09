import type { Ability, Club, Division, Formation, Player } from '../types';
import { createRng, type Rng } from '../core/rng';
import { autoLineup } from '../league/lineup';
import { CLUB_IDENTITIES, DIVISION_NAMES, HUMAN_CLUB_STADIUM, STADIUM_NAMES, type ClubIdentity } from './names';
import { generateSquad } from './playerGenerator';
import { shuffled } from './random';

export const DIVISION_COUNT = DIVISION_NAMES.length;
export const CLUBS_PER_DIVISION = 10;
/** Clubs qui montent (et descendent) entre deux divisions adjacentes (UNIV-04). */
export const PROMOTION_SLOTS = 2;
export const DEFAULT_FORMATION: Formation = '4-4-2';

/** Fourchette de réputation par division, de l'élite (index 0) au district. */
const REPUTATION_BY_TIER: readonly { min: number; max: number }[] = [
  { min: 70, max: 85 },
  { min: 55, max: 70 },
  { min: 40, max: 55 },
  { min: 25, max: 40 },
];
/** Le club du coach part du bas de la fourchette du district (UNIV-02). */
const HUMAN_REPUTATION_MARGIN = 5;

/** Trésorerie de départ : environ six mois de salaires, à ±20 % près. */
const BUDGET_WEEKS_OF_PAYROLL = 26;
const BUDGET_VARIATION_PERCENT = 20;
const PERCENT = 100;
const BUDGET_ROUNDING = 1000;

const MIN_SHORT_NAME_LENGTH = 3;
const MAX_SHORT_NAME_LENGTH = 4;

export interface World {
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  divisions: Division[];
}

export interface GenerateWorldOptions {
  seed: number;
  abilityPool: readonly Ability[];
  /** Nom choisi par le joueur pour son club ; sinon un nom parodique est tiré. */
  humanClubName?: string;
}

/**
 * Génère l'univers de départ (UNIV-01 à UNIV-03) : 4 divisions de 10 clubs, effectifs et compositions.
 * Le club du coach est en district, dans un stade boueux aux vestiaires qui fuient (UNIV-02).
 */
export function generateWorld({ seed, abilityPool, humanClubName }: GenerateWorldOptions): World {
  const rng = createRng(seed);
  const identities = drawIdentities(rng, humanClubName);
  const stadiums = shuffled(rng, STADIUM_NAMES);
  const clubs: Record<string, Club> = {};
  const players: Record<string, Player> = {};
  const divisions: Division[] = [];

  for (let index = 0; index < DIVISION_COUNT; index++) {
    const tier = index + 1;
    const division = createDivision(tier);
    for (let slot = 0; slot < CLUBS_PER_DIVISION; slot++) {
      const clubNumber = index * CLUBS_PER_DIVISION + slot;
      const isHuman = tier === DIVISION_COUNT && slot === 0;
      const { club, squad } = createClub({
        rng,
        id: `club-${String(clubNumber + 1).padStart(2, '0')}`,
        identity: identities[clubNumber]!,
        division,
        isHuman,
        stadium: isHuman ? HUMAN_CLUB_STADIUM : stadiums[clubNumber % stadiums.length]!,
        abilityPool,
      });
      clubs[club.id] = club;
      division.clubIds.push(club.id);
      for (const player of squad) players[player.id] = player;
    }
    divisions.push(division);
  }
  return { clubs, players, divisions };
}

function createDivision(tier: number): Division {
  return {
    id: `div-${tier}`,
    name: DIVISION_NAMES[tier - 1]!,
    tier,
    clubIds: [],
    promoted: tier === 1 ? 0 : PROMOTION_SLOTS,
    relegated: tier === DIVISION_COUNT ? 0 : PROMOTION_SLOTS,
  };
}

/**
 * Identités des 40 clubs dans l'ordre de création, sans doublon de nom ni d'abréviation.
 * Un nom choisi par le joueur est placé au rang du club humain (premier club du district).
 */
function drawIdentities(rng: Rng, humanClubName: string | undefined): ClubIdentity[] {
  const clubCount = DIVISION_COUNT * CLUBS_PER_DIVISION;
  const trimmed = humanClubName?.trim();
  if (!trimmed) return shuffled(rng, CLUB_IDENTITIES).slice(0, clubCount);

  const human: ClubIdentity = { name: trimmed, shortName: abbreviate(trimmed) };
  const others = CLUB_IDENTITIES.filter(
    (identity) => identity.name.toLowerCase() !== human.name.toLowerCase() && identity.shortName !== human.shortName,
  );
  const ai = shuffled(rng, others).slice(0, clubCount - 1);
  const humanIndex = (DIVISION_COUNT - 1) * CLUBS_PER_DIVISION;
  return [...ai.slice(0, humanIndex), human, ...ai.slice(humanIndex)];
}

/** Abréviation de 3-4 lettres à partir des initiales du nom (« Les Gros Mollets » → « LGM »). */
export function abbreviate(name: string): string {
  const letters = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s-]/g, '');
  const initials = letters
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('');
  const compact = letters.replace(/[\s-]/g, '');
  const abbreviation = initials.length >= MIN_SHORT_NAME_LENGTH ? initials : compact;
  return abbreviation.slice(0, MAX_SHORT_NAME_LENGTH).padEnd(MIN_SHORT_NAME_LENGTH, 'X');
}

interface CreateClubOptions {
  rng: Rng;
  id: string;
  identity: ClubIdentity;
  division: Division;
  isHuman: boolean;
  stadium: string;
  abilityPool: readonly Ability[];
}

function createClub({ rng, id, identity, division, isHuman, stadium, abilityPool }: CreateClubOptions): {
  club: Club;
  squad: Player[];
} {
  const range = REPUTATION_BY_TIER[division.tier - 1]!;
  const reputation = isHuman ? rng.int(range.min, range.min + HUMAN_REPUTATION_MARGIN) : rng.int(range.min, range.max);
  const squad = generateSquad({ rng, reputation, clubId: id, abilityPool });
  const club: Club = {
    id,
    name: identity.name,
    shortName: identity.shortName,
    divisionId: division.id,
    reputation,
    budget: startingBudget(rng, squad),
    playerIds: squad.map((player) => player.id),
    lineup: autoLineup(squad, DEFAULT_FORMATION),
    isHuman,
    stadium,
  };
  return { club, squad };
}

function startingBudget(rng: Rng, squad: readonly Player[]): number {
  const weeklyPayroll = squad.reduce((total, player) => total + player.salary, 0);
  const variation = 1 + rng.int(-BUDGET_VARIATION_PERCENT, BUDGET_VARIATION_PERCENT) / PERCENT;
  const budget = weeklyPayroll * BUDGET_WEEKS_OF_PAYROLL * variation;
  return Math.max(BUDGET_ROUNDING, Math.round(budget / BUDGET_ROUNDING) * BUDGET_ROUNDING);
}
