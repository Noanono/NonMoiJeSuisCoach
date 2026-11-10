import type { Ability, Club, Player, Position } from '../types';
import { clamp, type Rng } from '../core/rng';
import { overall } from '../player/rating';
import { generatePlayer } from './playerGenerator';

const MIN_INTAKE = 2;
const MAX_INTAKE = 4;
const MIN_YOUTH_AGE = 16;
const MAX_YOUTH_AGE = 18;
/** Les jeunes partent sous le niveau du club (en plus du retard lié à l'âge). */
const YOUTH_REPUTATION_GAP = 5;
const MIN_POTENTIAL_GAIN = 15;
const MAX_POTENTIAL_GAIN = 35;
const MAX_POTENTIAL = 99;
/** CLUB-07 : la capacité d'un jeune n'est visible que dans environ 30 % des cas. */
const ABILITY_VISIBLE_CHANCE = 0.3;

const NO_BOOST = { rating: 0, potential: 0 };

const YOUTH_POSITIONS: readonly Position[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'ATT', 'ATT'];

export interface YouthIntakeOptions {
  rng: Rng;
  club: Club;
  abilityPool: readonly Ability[];
  /** Capacités déjà présentes dans l'effectif du club (CAP-02). */
  excludedAbilityIds: Iterable<string>;
  /** Nombre de jeunes promus ; par défaut 2 à 4. */
  count?: number;
  /** Bonus du centre de formation (CLUB-09) : note de départ et potentiel plus élevés. */
  boost?: { rating: number; potential: number };
}

/** Promotion annuelle du centre de formation (CLUB-07) : 2 à 4 jeunes, note basse, gros potentiel. */
export function generateYouthIntake({ rng, club, abilityPool, excludedAbilityIds, count, boost = NO_BOOST }: YouthIntakeOptions): Player[] {
  const usedAbilityIds = new Set(excludedAbilityIds);
  const size = count ?? rng.int(MIN_INTAKE, MAX_INTAKE);
  const intake: Player[] = [];
  for (let i = 0; i < size; i++) {
    const player = generatePlayer({
      rng,
      position: rng.pick(YOUTH_POSITIONS),
      reputation: club.reputation - YOUTH_REPUTATION_GAP + boost.rating,
      clubId: club.id,
      abilityPool,
      excludedAbilityIds: usedAbilityIds,
      age: rng.int(MIN_YOUTH_AGE, MAX_YOUTH_AGE),
    });
    usedAbilityIds.add(player.ability.abilityId);
    intake.push(asYouthProspect(rng, player, boost.potential));
  }
  return intake;
}

function asYouthProspect(rng: Rng, player: Player, potentialBonus: number): Player {
  const rating = overall(player);
  return {
    ...player,
    potential: clamp(rating + rng.int(MIN_POTENTIAL_GAIN, MAX_POTENTIAL_GAIN) + potentialBonus, rating, MAX_POTENTIAL),
    ability: { ...player.ability, revealed: rng.chance(ABILITY_VISIBLE_CHANCE) },
  };
}
