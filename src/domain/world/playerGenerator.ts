import type { Ability, AttributeName, Attributes, Player, Position, Rarity } from '../types';
import { clamp, type Rng } from '../core/rng';
import { ratingFor } from '../player/rating';
import { RARITY_GENERATION_WEIGHTS } from '../abilities/progression';
import { defaultTrainingFocus } from '../club/training';
import { FIRST_NAMES, LAST_NAMES } from './names';
import { pickWeighted, randomId } from './random';

const MIN_ATTRIBUTE = 1;
const MAX_ATTRIBUTE = 99;
const MIN_REPUTATION = 1;
const MAX_REPUTATION = 100;

/** Écart de niveau entre joueurs d'un même club : il faut des titulaires et des remplaçants. */
const LEVEL_SPREAD = 8;
/** Bruit propre à chaque attribut. */
const ATTRIBUTE_NOISE = 5;

const MIN_GENERATED_AGE = 18;
const MAX_GENERATED_AGE = 34;
/** En dessous de cet âge, le joueur n'a pas encore atteint son niveau et garde de la marge. */
const MATURITY_AGE = 24;
/** Points de niveau en moins (et de potentiel en plus) par année avant la maturité. */
const LEVEL_PER_YEAR_BEFORE_MATURITY = 2;
const MIN_YOUTH_POTENTIAL_GAIN = 3;
const MAX_YOUTH_POTENTIAL_GAIN = 15;

/** Salaire hebdomadaire : quelques dizaines d'euros en district, quelques milliers dans l'élite. */
const SALARY_BASE = 20;
const SALARY_RATING_SCALE = 16;
const SALARY_ROUNDING = 10;

/** Décalage de chaque attribut par rapport au niveau du joueur, selon son poste (EFF-01, EFF-02). */
const POSITION_PROFILE: Record<Position, Attributes> = {
  GK: { speed: -10, technique: -20, physical: 0, shooting: -40, defense: -20, goalkeeping: 3 },
  DEF: { speed: -5, technique: -5, physical: 3, shooting: -25, defense: 3, goalkeeping: -50 },
  MID: { speed: 0, technique: 3, physical: -5, shooting: -5, defense: -10, goalkeeping: -50 },
  ATT: { speed: 3, technique: 0, physical: -5, shooting: 3, defense: -30, goalkeeping: -50 },
};

/** Ordre de repli quand le pool d'une rareté est épuisé : on se rabat d'abord sur la plus proche. */
const RARITY_FALLBACK: Record<Rarity, Rarity[]> = {
  common: ['common', 'rare', 'legendary', 'mythic'],
  rare: ['rare', 'common', 'legendary', 'mythic'],
  legendary: ['legendary', 'rare', 'common', 'mythic'],
  mythic: ['mythic', 'legendary', 'rare', 'common'],
};

export interface GeneratePlayerOptions {
  rng: Rng;
  position: Position;
  /** 1 à 100 : niveau visé, proche de la réputation du club. */
  reputation: number;
  clubId: string | null;
  abilityPool: readonly Ability[];
  /** Capacités déjà présentes dans l'effectif (CAP-02). */
  excludedAbilityIds: Iterable<string>;
  age?: number;
}

/** Génère un joueur complet, avec sa capacité personnelle (CAP-01, CAP-12, CAP-13). */
export function generatePlayer(options: GeneratePlayerOptions): Player {
  const { rng, position, clubId } = options;
  const age = options.age ?? rng.int(MIN_GENERATED_AGE, MAX_GENERATED_AGE);
  const id = randomId(rng, 'player');
  const level = playerLevel(rng, options.reputation, age);
  const attributes = generateAttributes(rng, position, level);
  const rating = ratingFor(attributes, position);
  const ability = pickAbility({
    rng,
    position,
    abilityPool: options.abilityPool,
    excludedAbilityIds: new Set(options.excludedAbilityIds),
  });

  return {
    id,
    firstName: rng.pick(FIRST_NAMES),
    lastName: rng.pick(LAST_NAMES),
    age,
    position,
    attributes,
    potential: generatePotential(rng, rating, age),
    overallAtSeasonStart: rating,
    training: { focus: defaultTrainingFocus(position), progress: 0 },
    fatigue: 0,
    injuryWeeks: 0,
    suspendedMatches: 0,
    ability: { abilityId: ability.id, level: 1, xp: 0, revealed: !ability.hidden },
    salary: salaryForRating(rating),
    clubId,
    seasonStats: { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
  };
}

/** Salaire hebdomadaire selon la note globale. */
export function salaryForRating(rating: number): number {
  const raw = SALARY_BASE * Math.exp(rating / SALARY_RATING_SCALE);
  return Math.round(raw / SALARY_ROUNDING) * SALARY_ROUNDING;
}

function playerLevel(rng: Rng, reputation: number, age: number): number {
  const youthGap = Math.max(0, MATURITY_AGE - age) * LEVEL_PER_YEAR_BEFORE_MATURITY;
  const target = clamp(reputation, MIN_REPUTATION, MAX_REPUTATION);
  return target + rng.int(-LEVEL_SPREAD, LEVEL_SPREAD) - youthGap;
}

function generateAttributes(rng: Rng, position: Position, level: number): Attributes {
  const profile = POSITION_PROFILE[position];
  const attributes = {} as Attributes;
  for (const name of Object.keys(profile) as AttributeName[]) {
    const value = level + profile[name] + rng.int(-ATTRIBUTE_NOISE, ATTRIBUTE_NOISE);
    attributes[name] = clamp(value, MIN_ATTRIBUTE, MAX_ATTRIBUTE);
  }
  return attributes;
}

/** Les jeunes ont de la marge de progression, les joueurs mûrs sont à leur plafond. */
function generatePotential(rng: Rng, rating: number, age: number): number {
  if (age >= MATURITY_AGE) return rating;
  const growth =
    (MATURITY_AGE - age) * LEVEL_PER_YEAR_BEFORE_MATURITY + rng.int(MIN_YOUTH_POTENTIAL_GAIN, MAX_YOUTH_POTENTIAL_GAIN);
  return clamp(rating + growth, rating, MAX_ATTRIBUTE);
}

/** Les capacités de gardien sont réservées aux gardiens, et un gardien ne prend que GK, ANY ou BENCH. */
export function isAbilityCompatible(ability: Ability, position: Position): boolean {
  return ability.position === position || ability.position === 'ANY' || ability.position === 'BENCH';
}

interface PickAbilityOptions {
  rng: Rng;
  position: Position;
  abilityPool: readonly Ability[];
  excludedAbilityIds: ReadonlySet<string>;
}

/**
 * Rareté tirée selon RARITY_GENERATION_WEIGHTS (CAP-12), puis capacité compatible avec le poste
 * et absente de l'effectif (CAP-02). Si la rareté tirée est épuisée, on se replie sur une autre.
 */
export function pickAbility({ rng, position, abilityPool, excludedAbilityIds }: PickAbilityOptions): Ability {
  const candidates = abilityPool.filter(
    (ability) => isAbilityCompatible(ability, position) && !excludedAbilityIds.has(ability.id),
  );
  const drawnRarity = pickWeighted(rng, RARITY_GENERATION_WEIGHTS);
  for (const rarity of RARITY_FALLBACK[drawnRarity]) {
    const ofRarity = candidates.filter((ability) => ability.rarity === rarity);
    if (ofRarity.length > 0) return rng.pick(ofRarity);
  }
  throw new Error(`Plus aucune capacité disponible pour un joueur au poste ${position} (CAP-02)`);
}

// ---------------------------------------------------------------------------
// Effectif complet
// ---------------------------------------------------------------------------

/** Composition d'un effectif généré : 18 joueurs. */
export const SQUAD_COMPOSITION: Readonly<Record<Position, number>> = { GK: 2, DEF: 6, MID: 6, ATT: 4 };

export interface GenerateSquadOptions {
  rng: Rng;
  reputation: number;
  clubId: string;
  abilityPool: readonly Ability[];
  excludedAbilityIds?: Iterable<string>;
}

/** Génère un effectif complet dont toutes les capacités sont différentes (CAP-02). */
export function generateSquad({ rng, reputation, clubId, abilityPool, excludedAbilityIds = [] }: GenerateSquadOptions): Player[] {
  const usedAbilityIds = new Set(excludedAbilityIds);
  const squad: Player[] = [];
  for (const position of Object.keys(SQUAD_COMPOSITION) as Position[]) {
    for (let i = 0; i < SQUAD_COMPOSITION[position]; i++) {
      const player = generatePlayer({ rng, position, reputation, clubId, abilityPool, excludedAbilityIds: usedAbilityIds });
      usedAbilityIds.add(player.ability.abilityId);
      squad.push(player);
    }
  }
  return squad;
}
