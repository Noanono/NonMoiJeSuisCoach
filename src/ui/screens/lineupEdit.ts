/**
 * Édition de la composition depuis l'écran Tactique (EFF-03) : échanges de postes et banc.
 * La validité est jugée par le domaine (`setLineup`) ; ici on ne fait que déplacer des identifiants.
 */
import { DEFAULT_INSTRUCTIONS, MAX_BENCH_SIZE } from '../../domain/league/lineup';
import type { Formation, Lineup } from '../../domain/types';

export function emptyLineup(formation: Formation): Lineup {
  return { formation, starters: [], bench: [], instructions: DEFAULT_INSTRUCTIONS };
}

/**
 * Place `playerId` au poste `index`. Un titulaire déplacé échange sa place avec l'occupant,
 * un remplaçant échange avec lui sa place sur le banc. Un poste vide se remplit à la suite
 * des titulaires (la composition ne connaît pas les trous).
 */
export function assignStarter(lineup: Lineup, index: number, playerId: string): Lineup {
  const starters = [...lineup.starters];
  const bench = [...lineup.bench];
  const previous = starters[index];
  if (previous === playerId) return lineup;
  const starterIndex = starters.indexOf(playerId);
  const benchIndex = bench.indexOf(playerId);

  if (previous === undefined) {
    if (starterIndex >= 0) return lineup;
    if (benchIndex >= 0) bench.splice(benchIndex, 1);
    starters.push(playerId);
    return { ...lineup, starters, bench };
  }
  if (starterIndex >= 0) starters[starterIndex] = previous;
  else if (benchIndex >= 0) bench[benchIndex] = previous;
  starters[index] = playerId;
  return { ...lineup, starters, bench };
}

/** Met un non-titulaire sur le banc, ou l'en retire. Banc plein : rien ne change. */
export function toggleBench(lineup: Lineup, playerId: string): Lineup {
  if (lineup.starters.includes(playerId)) return lineup;
  if (lineup.bench.includes(playerId)) return { ...lineup, bench: lineup.bench.filter((id) => id !== playerId) };
  if (lineup.bench.length >= MAX_BENCH_SIZE) return lineup;
  return { ...lineup, bench: [...lineup.bench, playerId] };
}
