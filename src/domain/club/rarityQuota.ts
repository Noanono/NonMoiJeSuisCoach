/**
 * Quotas de rareté (CAP-24) : sur la feuille de match (titulaires + remplaçants), un club aligne au plus
 * tant de joueurs de chaque rareté, selon sa division. Acheter reste permis ; c'est la compo qui bloque.
 */
import type { Player, Rarity } from '../types';

export type RarityLimits = Record<Exclude<Rarity, 'common'>, number>;

/** Par niveau de division : 1 = élite, 4 = district. */
export const RARITY_QUOTA_BY_TIER: Record<number, RarityLimits> = {
  1: { rare: 9, legendary: 4, mythic: 2, foreign: 3 },
  2: { rare: 6, legendary: 3, mythic: 1, foreign: 2 },
  3: { rare: 5, legendary: 2, mythic: 0, foreign: 1 },
  4: { rare: 3, legendary: 0, mythic: 0, foreign: 1 },
};

export const RARITY_QUOTA_LABEL: Record<keyof RarityLimits, string> = { rare: 'rares', legendary: 'légendaires', mythic: 'mythiques', foreign: 'étrangères' };

export function rarityLimits(tier: number): RarityLimits {
  return RARITY_QUOTA_BY_TIER[tier] ?? RARITY_QUOTA_BY_TIER[4]!;
}

/** Joueurs de chaque rareté limitée parmi ceux de la feuille de match. */
export function countRarities(players: readonly Player[], rarityOf: (abilityId: string) => Rarity): RarityLimits {
  const counts: RarityLimits = { rare: 0, legendary: 0, mythic: 0, foreign: 0 };
  for (const player of players) {
    const rarity = rarityOf(player.ability.abilityId);
    if (rarity !== 'common') counts[rarity]++;
  }
  return counts;
}

/** Messages d'erreur si la feuille de match dépasse un quota. */
export function quotaErrors(players: readonly Player[], tier: number, rarityOf: (abilityId: string) => Rarity): string[] {
  const limits = rarityLimits(tier);
  const counts = countRarities(players, rarityOf);
  return (Object.keys(limits) as (keyof RarityLimits)[])
    .filter((rarity) => counts[rarity] > limits[rarity])
    .map((rarity) => `Trop de capacités ${RARITY_QUOTA_LABEL[rarity]} sur la feuille de match : ${counts[rarity]} pour ${limits[rarity]} autorisée(s) dans cette division.`);
}

/** Filtre pour la compo automatique : un joueur entre s'il ne fait pas dépasser le quota. */
export function quotaFilter(tier: number, rarityOf: (abilityId: string) => Rarity): (player: Player) => boolean {
  const limits = rarityLimits(tier);
  const counts: RarityLimits = { rare: 0, legendary: 0, mythic: 0, foreign: 0 };
  return (player) => {
    const rarity = rarityOf(player.ability.abilityId);
    if (rarity === 'common') return true;
    if (counts[rarity] >= limits[rarity]) return false;
    counts[rarity]++;
    return true;
  };
}
