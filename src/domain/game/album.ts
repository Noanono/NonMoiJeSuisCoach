/**
 * Album des capacités (ENC-01) : le coach découvre une capacité quand elle part dans un de ses
 * matchs (de son côté ou en face), ou quand un de ses joueurs la porte. Les autres restent grisées
 * dans l'encyclopédie : de quoi avoir envie de compléter l'album.
 */
import { ABILITIES } from '../abilities/catalog';
import type { MatchSummary } from '../match';
import type { GameState } from './state';

/** Capacités découvertes par le coach au focus. */
export function discoveredAbilityIds(state: GameState): Set<string> {
  const ids = new Set(state.seenAbilityIds ?? []);
  for (const player of Object.values(state.players)) {
    if (player.clubId === state.humanClubId) ids.add(player.ability.abilityId);
  }
  return ids;
}

/** Note les capacités parties pendant un match du coach ; rend le nombre de nouvelles découvertes. */
export function recordSeenAbilities(state: GameState, summary: Pick<MatchSummary, 'abilities'>): number {
  const before = discoveredAbilityIds(state);
  const seen = new Set(state.seenAbilityIds ?? []);
  let discovered = 0;
  for (const report of summary.abilities) {
    if (!before.has(report.abilityId) && !seen.has(report.abilityId)) discovered++;
    seen.add(report.abilityId);
  }
  state.seenAbilityIds = [...seen];
  if (discovered > 0) state.news.push(`Album des capacités : ${discovered} nouvelle(s) capacité(s) découverte(s) en match.`);
  return discovered;
}

/** Avancée de l'album : découvertes sur le total du catalogue. */
export function albumProgress(state: GameState): { discovered: number; total: number } {
  const known = discoveredAbilityIds(state);
  return { discovered: ABILITIES.filter((ability) => known.has(ability.id)).length, total: ABILITIES.length };
}
