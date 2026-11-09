import { describe, expect, test } from 'bun:test';
import type { Club, Player } from '../types';
import { createRng } from '../core/rng';
import { makePlayer } from '../testing/fixtures';
import type { AbilityLookup } from './model';
import {
  acceptOffer,
  buyPlayer,
  generateIncomingOffers,
  marketListings,
  sellPlayer,
  type IncomingOffer,
  type TransferWorld,
} from './transfers';

const abilityOf: AbilityLookup = (id) => ({ rarity: id === 'legende' ? 'legendary' : 'common' });

function makeClub(id: string, playerIds: string[], overrides: Partial<Club> = {}): Club {
  return {
    id,
    name: `Club ${id}`,
    shortName: id,
    divisionId: 'd1',
    reputation: 30,
    budget: 1_000_000,
    playerIds,
    lineup: null,
    isHuman: false,
    stadium: 'Pré communal',
    ...overrides,
  };
}

/** Le coach (club `coach`) a 15 joueurs, l'IA (club `ai`) en a 15 dont un à capacité cachée. */
function makeWorld(): TransferWorld {
  const players: Record<string, Player> = {};
  const squad = (clubId: string) =>
    Array.from({ length: 15 }, (_, index) => {
      const player = makePlayer({ id: `${clubId}-${index}`, clubId });
      players[player.id] = player;
      return player.id;
    });
  const coachIds = squad('coach');
  const aiIds = squad('ai');
  players['ai-0'] = { ...players['ai-0']!, ability: { ...players['ai-0']!.ability, abilityId: 'legende', revealed: false } };
  return {
    clubs: { coach: makeClub('coach', coachIds, { isHuman: true, budget: 50_000 }), ai: makeClub('ai', aiIds) },
    players,
  };
}

describe('achats et ventes (CLUB-02)', () => {
  test('achat refusé hors fenêtre de transferts', () => {
    const result = buyPlayer(makeWorld(), { buyerId: 'coach', playerId: 'ai-1', price: 1_000, windowOpen: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('windowClosed');
  });

  test('achat refusé sans budget', () => {
    const result = buyPlayer(makeWorld(), { buyerId: 'coach', playerId: 'ai-1', price: 60_000, windowOpen: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficientBudget');
  });

  test('achat refusé quand l’effectif est plein (25 max)', () => {
    const world = makeWorld();
    const full = { ...world.clubs.coach!, playerIds: Array.from({ length: 25 }, (_, index) => `x${index}`) };
    const result = buyPlayer({ ...world, clubs: { ...world.clubs, coach: full } }, {
      buyerId: 'coach',
      playerId: 'ai-1',
      price: 1_000,
      windowOpen: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('squadFull');
  });

  test('achat accepté : budgets, effectifs et capacité révélée à l’arrivée (CAP-13)', () => {
    const result = buyPlayer(makeWorld(), { buyerId: 'coach', playerId: 'ai-0', price: 20_000, windowOpen: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { clubs, players } = result.world;
    expect(clubs.coach!.budget).toBe(30_000);
    expect(clubs.ai!.budget).toBe(1_020_000);
    expect(clubs.coach!.playerIds).toContain('ai-0');
    expect(clubs.ai!.playerIds).not.toContain('ai-0');
    expect(players['ai-0']!.clubId).toBe('coach');
    expect(players['ai-0']!.ability.revealed).toBe(true);
  });

  test('vente refusée si le coach descend sous 11 joueurs', () => {
    const world = makeWorld();
    const small = { ...world.clubs.coach!, playerIds: world.clubs.coach!.playerIds.slice(0, 11) };
    const result = sellPlayer({ ...world, clubs: { ...world.clubs, coach: small } }, {
      playerId: 'coach-0',
      toClubId: 'ai',
      price: 5_000,
      windowOpen: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('squadTooSmall');
  });
});

describe('liste du mercato', () => {
  test('la capacité d’un joueur n’est affichée que si elle est révélée', () => {
    const listings = marketListings(makeWorld(), 'coach', abilityOf);
    expect(listings.some((listing) => listing.clubId === 'coach')).toBe(false);
    expect(listings.find((listing) => listing.playerId === 'ai-0')?.ability).toBeNull();
    expect(listings.find((listing) => listing.playerId === 'ai-1')?.ability).toEqual({ abilityId: 'la-mobylette', rarity: 'common' });
  });
});

describe('offres des clubs IA (CLUB-03)', () => {
  const offer: IncomingOffer = { id: 'o1', playerId: 'coach-3', fromClubId: 'ai', amount: 12_000, expiresWeek: 5 };

  test('offre acceptée : joueur transféré et budget crédité', () => {
    const result = acceptOffer(makeWorld(), offer, { week: 4, windowOpen: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.world.players['coach-3']!.clubId).toBe('ai');
    expect(result.world.clubs.coach!.budget).toBe(62_000);
    expect(result.world.clubs.coach!.playerIds).not.toContain('coach-3');
  });

  test('offre expirée refusée', () => {
    const result = acceptOffer(makeWorld(), offer, { week: 6, windowOpen: true });
    expect(result.ok).toBe(false);
  });

  test('les clubs IA font des offres quand le mercato est ouvert', () => {
    const world = makeWorld();
    const rng = createRng(7);
    const offers = Array.from({ length: 30 }, () =>
      generateIncomingOffers(world, { coachClubId: 'coach', week: 3, windowOpen: true, abilityOf, rng }),
    ).flat();
    expect(offers.length).toBeGreaterThan(0);
    for (const generated of offers) {
      expect(generated.fromClubId).toBe('ai');
      expect(generated.expiresWeek).toBeGreaterThan(3);
      expect(generated.amount).toBeGreaterThan(0);
    }
    expect(generateIncomingOffers(world, { coachClubId: 'coach', week: 3, windowOpen: false, abilityOf, rng: createRng(7) })).toEqual([]);
  });
});
