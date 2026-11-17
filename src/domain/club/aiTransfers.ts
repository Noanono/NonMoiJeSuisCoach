/**
 * Mercato entre clubs IA (C7) : chaque semaine de fenêtre ouverte, quelques clubs IA renforcent leur
 * poste le plus faible chez un club de même niveau ou d'en dessous. Les effectifs bougent, les bons
 * joueurs des petits clubs finissent par monter, et le coach voit passer les transferts de sa division.
 */
import type { Rng } from '../core/rng';
import { overall } from '../player/rating';
import type { Club, Player, Position, Rarity } from '../types';
import { SQUAD_COMPOSITION } from '../world/playerGenerator';
import { countRarities, rarityLimits } from './rarityQuota';
import { askingPrice, buyPlayer, MAX_SQUAD_SIZE, type TransferWorld } from './transfers';

/** Transferts tentés par semaine de fenêtre, pour tout le monde. */
const ATTEMPTS_PER_WEEK = 4;
/** Un club IA ne dépense pas plus que cette part de sa trésorerie sur un joueur. */
const MAX_BUDGET_SHARE = 0.5;
/** Le vendeur garde de quoi aligner une équipe et un banc. */
const SELLER_MIN_SQUAD = 16;
/** Titulaires par poste dans un onze type : le renfort se compare au plus faible d'entre eux. */
const STARTERS_BY_POSITION: Record<Position, number> = { GK: 1, DEF: 4, MID: 4, ATT: 2 };
/** Joueurs qu'un vendeur garde au moins à chaque poste. */
const SELLER_KEEPS: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, ATT: 3 };
/** Le renfort doit valoir au moins ça de plus que le titulaire actuel. */
const MIN_UPGRADE = 2;
/** Parmi les meilleurs candidats, le club en prend un au hasard. */
const SHORTLIST = 3;

export interface AiTransfer {
  playerId: string;
  fromClubId: string;
  toClubId: string;
  price: number;
}

export interface AiTransferInput {
  rng: Rng;
  abilityOf: (abilityId: string) => { rarity: Rarity };
  /** Niveau de division de chaque club (1 = élite). */
  tierOf: (clubId: string) => number;
}

/** Joue les transferts de la semaine entre clubs IA. Rend le monde mis à jour et la liste des transferts. */
export function runAiTransfers(world: TransferWorld, input: AiTransferInput): { world: TransferWorld; transfers: AiTransfer[] } {
  const { rng } = input;
  let current = world;
  const transfers: AiTransfer[] = [];
  const buyers = Object.values(world.clubs).filter((club) => !club.isHuman);
  for (let attempt = 0; attempt < ATTEMPTS_PER_WEEK && buyers.length > 0; attempt++) {
    const buyer = current.clubs[rng.pick(buyers).id]!;
    const deal = findDeal(current, buyer, input);
    if (!deal) continue;
    const result = buyPlayer(current, { buyerId: buyer.id, playerId: deal.playerId, price: deal.price, windowOpen: true });
    if (!result.ok) continue;
    current = result.world;
    transfers.push({ ...deal, toClubId: buyer.id });
  }
  return { world: current, transfers };
}

function squadOf(world: TransferWorld, club: Club): Player[] {
  return club.playerIds.map((id) => world.players[id]).filter((player): player is Player => player !== undefined);
}

/** Poste à renforcer : celui où il manque du monde, sinon celui dont le titulaire le plus faible est le plus faible. */
function weakestPosition(squad: readonly Player[]): { position: Position; level: number } {
  let best: { position: Position; score: number; level: number } | null = null;
  for (const position of Object.keys(SQUAD_COMPOSITION) as Position[]) {
    const players = squad.filter((player) => player.position === position).map(overall).sort((a, b) => b - a);
    const missing = SQUAD_COMPOSITION[position] - players.length;
    const level = players[STARTERS_BY_POSITION[position] - 1] ?? 0;
    const score = missing > 0 ? -1000 + level - missing * 10 : level;
    if (!best || score < best.score) best = { position, score, level };
  }
  return { position: best!.position, level: best!.level };
}

function findDeal(world: TransferWorld, buyer: Club, input: AiTransferInput): Omit<AiTransfer, 'toClubId'> | null {
  if (buyer.playerIds.length >= MAX_SQUAD_SIZE) return null;
  const squad = squadOf(world, buyer);
  const { position, level } = weakestPosition(squad);
  const abilities = new Set(squad.map((player) => player.ability.abilityId));
  const buyerTier = input.tierOf(buyer.id);
  // Quotas de rareté (CAP-24) : il n'achète pas un joueur de plus d'une rareté qu'il ne pourrait pas aligner.
  const limits = rarityLimits(buyerTier);
  const owned = countRarities(squad, (id) => input.abilityOf(id).rarity);
  const alignable = (player: Player) => {
    const rarity = input.abilityOf(player.ability.abilityId).rarity;
    return rarity === 'common' || owned[rarity] < limits[rarity];
  };
  const budget = buyer.budget * MAX_BUDGET_SHARE;
  const candidates: { player: Player; price: number; gain: number }[] = [];
  for (const seller of Object.values(world.clubs)) {
    if (seller.isHuman || seller.id === buyer.id || input.tierOf(seller.id) < buyerTier || seller.playerIds.length <= SELLER_MIN_SQUAD) continue;
    const sellerSquad = squadOf(world, seller);
    // Le vendeur ne se sépare pas d'un joueur s'il n'en a plus assez à ce poste.
    if (sellerSquad.filter((player) => player.position === position).length <= SELLER_KEEPS[position]) continue;
    for (const player of sellerSquad) {
      if (player.position !== position || abilities.has(player.ability.abilityId) || player.injuryWeeks > 0 || !alignable(player)) continue;
      const gain = overall(player) - level;
      if (gain < MIN_UPGRADE) continue;
      const price = askingPrice(player, input.abilityOf(player.ability.abilityId).rarity);
      if (price > budget) continue;
      candidates.push({ player, price, gain });
    }
  }
  if (candidates.length === 0) return null;
  // Le meilleur rapport progression / prix, avec un peu de hasard.
  candidates.sort((a, b) => b.gain / b.price - a.gain / a.price);
  const chosen = input.rng.pick(candidates.slice(0, SHORTLIST));
  return { playerId: chosen.player.id, fromClubId: chosen.player.clubId!, price: chosen.price };
}
