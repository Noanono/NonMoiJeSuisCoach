import type { Club, Player, Rarity } from '../types';
import type { Rng } from '../core/rng';
import { overall } from '../player/rating';
import { playerName, type AbilityLookup } from './model';
import { askingSalary, playerValue } from './valuation';

/**
 * Mercato (CLUB-02, CLUB-03) : achats, ventes, offres des clubs IA.
 * Toutes les fonctions renvoient un nouveau monde, l'ancien n'est jamais modifié.
 */

export interface TransferWorld {
  clubs: Record<string, Club>;
  players: Record<string, Player>;
}

export const MAX_SQUAD_SIZE = 25;
export const MIN_SQUAD_SIZE = 11;

/** Un club demande plus que la valeur ; un joueur libre ne coûte qu'une prime de signature. */
const CLUB_SELLER_MARKUP = 1.2;
const FREE_AGENT_SIGNING_RATIO = 0.3;
const PRICE_ROUNDING = 100;

/** Offres IA (CLUB-03). */
const OFFER_BASE_CHANCE = 0.05;
const OFFER_MIN_RATIO = 0.8;
const OFFER_MAX_RATIO = 1.3;
const OFFER_VALIDITY_WEEKS = 2;
const MAX_OFFERS_PER_WEEK = 3;

export type TransferRefusal =
  | 'windowClosed'
  | 'unknownPlayer'
  | 'unknownClub'
  | 'alreadyInClub'
  | 'insufficientBudget'
  | 'squadFull'
  | 'squadTooSmall'
  | 'offerExpired';

export type TransferResult =
  | { ok: true; world: TransferWorld; messages: string[] }
  | { ok: false; reason: TransferRefusal; message: string };

export interface TransferDeal {
  buyerId: string;
  playerId: string;
  /** Indemnité versée au club vendeur (ou prime de signature d'un joueur libre). */
  price: number;
  /** Fenêtre de transferts ouverte (CLUB-02), fournie par le calendrier. */
  windowOpen: boolean;
  /** Nouveau salaire hebdomadaire ; à défaut le joueur garde le sien. */
  salary?: number;
}

const REFUSAL_MESSAGE: Record<TransferRefusal, string> = {
  windowClosed: 'Le mercato est fermé : reviens pendant la fenêtre des transferts.',
  unknownPlayer: 'Joueur introuvable : il a dû partir à Ibiza sans prévenir.',
  unknownClub: 'Club introuvable.',
  alreadyInClub: 'Ce joueur est déjà chez toi, inutile de le racheter.',
  insufficientBudget: 'Budget insuffisant : même en vendant la tireuse de la buvette, ça ne passe pas.',
  squadFull: `Effectif complet : ${MAX_SQUAD_SIZE} joueurs maximum, le vestiaire n'a que ${MAX_SQUAD_SIZE} patères.`,
  squadTooSmall: `Le club vendeur doit garder au moins ${MIN_SQUAD_SIZE} joueurs pour aligner une équipe.`,
  offerExpired: "L'offre a expiré : le club acheteur a trouvé un autre pigeon.",
};

function refuse(reason: TransferRefusal): TransferResult {
  return { ok: false, reason, message: REFUSAL_MESSAGE[reason] };
}

/** Retire un joueur de la composition d'un club : une composition à 10 titulaires est annulée. */
function withoutPlayer(club: Club, playerId: string): Club {
  const playerIds = club.playerIds.filter((id) => id !== playerId);
  const { lineup } = club;
  if (!lineup) return { ...club, playerIds };
  if (lineup.starters.includes(playerId)) return { ...club, playerIds, lineup: null };
  return { ...club, playerIds, lineup: { ...lineup, bench: lineup.bench.filter((id) => id !== playerId) } };
}

function checkDeal(world: TransferWorld, deal: TransferDeal): TransferRefusal | null {
  if (!deal.windowOpen) return 'windowClosed';
  const player = world.players[deal.playerId];
  const buyer = world.clubs[deal.buyerId];
  if (!player) return 'unknownPlayer';
  if (!buyer) return 'unknownClub';
  if (player.clubId === buyer.id) return 'alreadyInClub';
  if (buyer.budget < deal.price) return 'insufficientBudget';
  if (buyer.playerIds.length >= MAX_SQUAD_SIZE) return 'squadFull';
  const seller = player.clubId ? world.clubs[player.clubId] : undefined;
  if (seller && seller.playerIds.length <= MIN_SQUAD_SIZE) return 'squadTooSmall';
  return null;
}

/**
 * Le club `deal.buyerId` (coach ou IA) achète un joueur (CLUB-02) si la fenêtre est ouverte,
 * le budget suffisant et les effectifs dans les limites. À l'arrivée chez le coach,
 * la capacité est révélée (CAP-13).
 */
export function buyPlayer(world: TransferWorld, deal: TransferDeal): TransferResult {
  const refusal = checkDeal(world, deal);
  if (refusal) return refuse(refusal);
  const player = world.players[deal.playerId]!;
  const buyer = world.clubs[deal.buyerId]!;
  const seller = player.clubId ? world.clubs[player.clubId] : undefined;

  const clubs = { ...world.clubs };
  clubs[buyer.id] = { ...buyer, budget: buyer.budget - deal.price, playerIds: [...buyer.playerIds, player.id] };
  if (seller) clubs[seller.id] = { ...withoutPlayer(seller, player.id), budget: seller.budget + deal.price };

  const revealed = player.ability.revealed || buyer.isHuman;
  const moved: Player = {
    ...player,
    clubId: buyer.id,
    salary: deal.salary ?? player.salary,
    ability: { ...player.ability, revealed },
  };
  const messages = [`${playerName(moved)} rejoint ${buyer.name} pour ${deal.price} €.`];
  if (revealed && !player.ability.revealed) messages.push(`Sa capacité cachée est révélée à son arrivée au club.`);
  return { ok: true, world: { clubs, players: { ...world.players, [player.id]: moved } }, messages };
}

/** Le coach vend l'un de ses joueurs à un autre club (CLUB-02). */
export function sellPlayer(
  world: TransferWorld,
  sale: { playerId: string; toClubId: string; price: number; windowOpen: boolean },
): TransferResult {
  return buyPlayer(world, { buyerId: sale.toClubId, playerId: sale.playerId, price: sale.price, windowOpen: sale.windowOpen });
}

// ---------------------------------------------------------------------------
// Liste du mercato
// ---------------------------------------------------------------------------

export interface MarketListing {
  playerId: string;
  /** `null` = joueur libre. */
  clubId: string | null;
  overall: number;
  /** Indemnité demandée. */
  price: number;
  /** Salaire hebdomadaire réclamé. */
  askingSalary: number;
  /** Capacité affichée seulement si elle est connue (CAP-13). */
  ability: { abilityId: string; rarity: Rarity } | null;
}

function roundPrice(value: number): number {
  return Math.round(value / PRICE_ROUNDING) * PRICE_ROUNDING;
}

/** Prix demandé pour un joueur sur le marché. */
export function askingPrice(player: Player, rarity: Rarity): number {
  const ratio = player.clubId ? CLUB_SELLER_MARKUP : FREE_AGENT_SIGNING_RATIO;
  return roundPrice(playerValue(player, rarity) * ratio);
}

/**
 * Joueurs que le club `buyerId` peut recruter : joueurs libres et joueurs des clubs
 * qui peuvent se permettre de vendre, du meilleur au moins bon.
 */
export function marketListings(world: TransferWorld, buyerId: string, abilityOf: AbilityLookup): MarketListing[] {
  const listings: MarketListing[] = [];
  for (const player of Object.values(world.players)) {
    if (player.clubId === buyerId) continue;
    const seller = player.clubId ? world.clubs[player.clubId] : undefined;
    if (seller && seller.playerIds.length <= MIN_SQUAD_SIZE) continue;
    const { rarity } = abilityOf(player.ability.abilityId);
    listings.push({
      playerId: player.id,
      clubId: player.clubId,
      overall: overall(player),
      price: askingPrice(player, rarity),
      askingSalary: askingSalary(player, rarity),
      ability: player.ability.revealed ? { abilityId: player.ability.abilityId, rarity } : null,
    });
  }
  return listings.sort((a, b) => b.overall - a.overall);
}

// ---------------------------------------------------------------------------
// Offres des clubs IA (CLUB-03)
// ---------------------------------------------------------------------------

export interface IncomingOffer {
  id: string;
  playerId: string;
  fromClubId: string;
  amount: number;
  /** Dernière semaine où l'offre peut être acceptée. */
  expiresWeek: number;
}

export interface OfferGenerationInput {
  coachClubId: string;
  week: number;
  windowOpen: boolean;
  abilityOf: AbilityLookup;
  rng: Rng;
}

function pickBidder(world: TransferWorld, coachClubId: string, amount: number, rng: Rng): Club | null {
  const bidders = Object.values(world.clubs).filter(
    (club) => club.id !== coachClubId && !club.isHuman && club.budget >= amount && club.playerIds.length < MAX_SQUAD_SIZE,
  );
  return bidders.length > 0 ? rng.pick(bidders) : null;
}

/** Offres reçues cette semaine sur les joueurs du coach (CLUB-03). */
export function generateIncomingOffers(world: TransferWorld, input: OfferGenerationInput): IncomingOffer[] {
  const coachClub = world.clubs[input.coachClubId];
  if (!input.windowOpen || !coachClub || coachClub.playerIds.length <= MIN_SQUAD_SIZE) return [];
  const offers: IncomingOffer[] = [];
  for (const playerId of coachClub.playerIds) {
    if (offers.length >= MAX_OFFERS_PER_WEEK) break;
    const player = world.players[playerId];
    if (!player) continue;
    if (!input.rng.chance(OFFER_BASE_CHANCE)) continue;
    const ratio = OFFER_MIN_RATIO + input.rng.next() * (OFFER_MAX_RATIO - OFFER_MIN_RATIO);
    const amount = roundPrice(playerValue(player, input.abilityOf(player.ability.abilityId).rarity) * ratio);
    const bidder = pickBidder(world, coachClub.id, amount, input.rng);
    if (!bidder) continue;
    offers.push({
      id: `offer-${input.week}-${player.id}-${bidder.id}`,
      playerId: player.id,
      fromClubId: bidder.id,
      amount,
      expiresWeek: input.week + OFFER_VALIDITY_WEEKS,
    });
  }
  return offers;
}

/** Le coach accepte une offre : le joueur part et le budget est crédité (CLUB-03). */
export function acceptOffer(
  world: TransferWorld,
  offer: IncomingOffer,
  context: { week: number; windowOpen: boolean },
): TransferResult {
  if (context.week > offer.expiresWeek) return refuse('offerExpired');
  return buyPlayer(world, {
    buyerId: offer.fromClubId,
    playerId: offer.playerId,
    price: offer.amount,
    windowOpen: context.windowOpen,
  });
}

export function activeOffers(offers: readonly IncomingOffer[], week: number): IncomingOffer[] {
  return offers.filter((offer) => offer.expiresWeek >= week);
}
