/**
 * Déplacement des cartes sur l'écran Tactique (EFF-03) : terrain, banc et tribune.
 * La validité est jugée par le domaine (`setLineup`) ; ici on ne fait que déplacer des identifiants.
 */
import { DEFAULT_INSTRUCTIONS, EMPTY_SLOT, MAX_BENCH_SIZE, STARTERS_COUNT } from '../../domain/league/lineup';
import type { Formation, Lineup } from '../../domain/types';

export function emptyLineup(formation: Formation): Lineup {
  return { formation, starters: [], bench: [], instructions: DEFAULT_INSTRUCTIONS };
}

/** Où lâcher une carte. `occupantId` : la carte visée, avec qui échanger. */
export type LineupDrop = { kind: 'slot'; index: number } | { kind: 'bench' | 'stand'; occupantId?: string };

/** Les 11 places, postes libres compris. */
function allSlots(lineup: Lineup): string[] {
  return Array.from({ length: STARTERS_COUNT }, (_, index) => lineup.starters[index] ?? EMPTY_SLOT);
}

/**
 * Déplace une carte. Lâchée sur une place occupée, elle échange avec l'occupant, qui part
 * là d'où elle vient. Rend la composition inchangée si le déplacement est impossible (banc plein).
 */
export function movePlayer(lineup: Lineup, playerId: string, drop: LineupDrop): Lineup {
  const starters = allSlots(lineup);
  const bench = [...lineup.bench];
  const fromSlot = starters.indexOf(playerId);
  const fromBench = bench.indexOf(playerId);
  const onField = fromSlot >= 0;
  const onBench = fromBench >= 0;
  const done = (): Lineup => ({ ...lineup, starters, bench });

  /** Remet `id` à la place que la carte vient de quitter (`EMPTY_SLOT` ou absent = rien à remettre). */
  const backfill = (id: string | undefined): void => {
    const filled = id !== undefined && id !== EMPTY_SLOT;
    if (onField) starters[fromSlot] = filled ? id : EMPTY_SLOT;
    else if (onBench && filled) bench[fromBench] = id;
    else if (onBench) bench.splice(fromBench, 1);
  };

  if (drop.kind === 'slot') {
    if (fromSlot === drop.index) return lineup;
    const occupant = starters[drop.index];
    backfill(occupant);
    starters[drop.index] = playerId;
    return done();
  }

  if (drop.kind === 'bench') {
    const occupantIndex = drop.occupantId ? bench.indexOf(drop.occupantId) : -1;
    if (occupantIndex >= 0) {
      if (drop.occupantId === playerId) return lineup;
      backfill(drop.occupantId);
      bench[occupantIndex] = playerId;
      return done();
    }
    if (onBench || bench.length >= MAX_BENCH_SIZE) return lineup;
    backfill(undefined);
    bench.push(playerId);
    return done();
  }

  // Tribune : la carte quitte le groupe ; lâchée sur un joueur en tribune, il prend sa place.
  if (!onField && !onBench) return lineup;
  backfill(drop.occupantId);
  return done();
}
