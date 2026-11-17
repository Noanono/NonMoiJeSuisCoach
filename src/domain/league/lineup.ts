import type { Formation, Instructions, Lineup, Player, Position } from '../types';
import { effectiveRating, FORMATION_SLOTS, isAvailable } from '../player/rating';

export const STARTERS_COUNT = 11;
export const MAX_BENCH_SIZE = 7;
/** Poste laissé libre dans `Lineup.starters`, pendant que le coach compose. */
export const EMPTY_SLOT = '';
/** Le gardien occupe toujours le premier poste de FORMATION_SLOTS. */
const GOALKEEPER_SLOT = 0;

export const DEFAULT_INSTRUCTIONS: Instructions = { mentality: 'balanced', highPress: false, longBall: false };

/**
 * Composition automatique (EFF-03) : pour chaque poste de la formation, le meilleur joueur disponible
 * de ce poste ; à défaut, le meilleur disponible hors poste (EFF-02). Banc : les 7 meilleurs restants.
 */
export function autoLineup(
  players: readonly Player[],
  formation: Formation,
  instructions: Instructions = DEFAULT_INSTRUCTIONS,
  /** Quotas de rareté (CAP-24) : appelé une fois par joueur retenu, `false` = il ne peut pas entrer. */
  fits: (player: Player) => boolean = () => true,
): Lineup {
  const slots = FORMATION_SLOTS[formation];
  const remaining = players.filter(isAvailable);
  const takeBest = (pool: Player[], position: Position, naturalOnly: boolean) => takeBestFitting(pool, position, naturalOnly, fits);
  const starters: (Player | null)[] = slots.map((position) => takeBest(remaining, position, true));
  // Dernier recours : un poste ne reste jamais vide, quitte à dépasser un quota (la compo le signalera).
  const filled = starters.map((player, index) => player ?? takeBest(remaining, slots[index]!, false) ?? takeBestFitting(remaining, slots[index]!, false, () => true));
  const bench = [...remaining]
    .sort((a, b) => effectiveRating(b, b.position) - effectiveRating(a, a.position))
    .filter(fits)
    .slice(0, MAX_BENCH_SIZE);

  return {
    formation,
    starters: filled.filter((player): player is Player => player !== null).map((player) => player.id),
    bench: bench.map((player) => player.id),
    instructions,
  };
}

/** Retire de `pool` le meilleur joueur pour `position` qui passe le filtre, et le renvoie (null si aucun). */
function takeBestFitting(pool: Player[], position: Position, naturalOnly: boolean, fits: (player: Player) => boolean): Player | null {
  const candidates = pool
    .filter((player) => !naturalOnly || player.position === position)
    .sort((a, b) => effectiveRating(b, position) - effectiveRating(a, position));
  for (const player of candidates) {
    if (!fits(player)) continue;
    pool.splice(pool.indexOf(player), 1);
    return player;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type LineupErrorCode =
  | 'tooManyStarters'
  | 'notEnoughStarters'
  | 'duplicatePlayer'
  | 'unknownPlayer'
  | 'unavailablePlayer'
  | 'noGoalkeeper'
  | 'benchTooLarge'
  | 'rarityQuota';

export interface LineupError {
  code: LineupErrorCode;
  message: string;
}

/** Vérifie une composition (EFF-03) : liste vide si elle est valide. `players` = l'effectif du club. */
export function validateLineup(lineup: Lineup, players: readonly Player[]): LineupError[] {
  const squad = new Map(players.map((player) => [player.id, player]));
  return [
    ...checkStarterCount(lineup),
    ...checkBenchSize(lineup),
    ...checkDuplicates(lineup, squad),
    ...checkMembershipAndAvailability(lineup, squad),
    ...checkGoalkeeper(lineup, squad),
  ];
}

function filledStarters(starters: readonly string[]): string[] {
  return starters.filter((id) => id !== EMPTY_SLOT);
}

function checkStarterCount({ starters }: Lineup): LineupError[] {
  const count = filledStarters(starters).length;
  if (count > STARTERS_COUNT) {
    return [{ code: 'tooManyStarters', message: `Tu as mis ${count} joueurs. Même nous on a vu.` }];
  }
  if (count < STARTERS_COUNT) {
    return [
      {
        code: 'notEnoughStarters',
        message: `${count} titulaires seulement ? Il en faut 11, même en district.`,
      },
    ];
  }
  return [];
}

function checkBenchSize({ bench }: Lineup): LineupError[] {
  if (bench.length <= MAX_BENCH_SIZE) return [];
  return [{ code: 'benchTooLarge', message: `Sept remplaçants maximum. Le banc en bois ne tiendra pas ${bench.length} fessiers.` }];
}

function checkDuplicates({ starters, bench }: Lineup, squad: ReadonlyMap<string, Player>): LineupError[] {
  const seen = new Set<string>();
  const errors: LineupError[] = [];
  for (const id of [...filledStarters(starters), ...bench]) {
    if (seen.has(id)) {
      errors.push({ code: 'duplicatePlayer', message: `${displayName(id, squad)} est aligné deux fois. Il a un jumeau caché ?` });
    }
    seen.add(id);
  }
  return errors;
}

function checkMembershipAndAvailability({ starters, bench }: Lineup, squad: ReadonlyMap<string, Player>): LineupError[] {
  const errors: LineupError[] = [];
  for (const id of new Set([...filledStarters(starters), ...bench])) {
    const player = squad.get(id);
    if (!player) {
      errors.push({ code: 'unknownPlayer', message: 'Ce gars-là n’est pas au club. On ne recrute pas à la buvette.' });
    } else if (!isAvailable(player)) {
      errors.push({
        code: 'unavailablePlayer',
        message: `${displayName(id, squad)} est blessé ou suspendu. Sa place, c’est en tribune avec une bière.`,
      });
    }
  }
  return errors;
}

function checkGoalkeeper({ starters }: Lineup, squad: ReadonlyMap<string, Player>): LineupError[] {
  const keeperId = starters[GOALKEEPER_SLOT];
  if (keeperId !== undefined && squad.get(keeperId)?.position === 'GK') return [];
  return [{ code: 'noGoalkeeper', message: 'Personne dans les cages. Le poteau, lui, il ne plonge pas.' }];
}

function displayName(id: string, squad: ReadonlyMap<string, Player>): string {
  const player = squad.get(id);
  return player ? `${player.firstName} ${player.lastName}` : 'Un inconnu';
}
