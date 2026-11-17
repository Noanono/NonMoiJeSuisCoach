import { describe, expect, test } from 'bun:test';
import { answerCoachOffer, buy, cancelCoachOffer, coachOffersReceived, coachOffersSent, makeCoachOffer, pruneCoachOffers } from './actions';
import { asCoach } from './coaches';
import { newMultiplayerGame } from './multiplayer';
import { humanClub } from './selectors';
import type { GameState } from './state';

const SIGNUPS = [
  { id: 'a', name: 'Alice', clubName: 'Les Gros Mollets' },
  { id: 'b', name: 'Bob', clubName: 'Racing Pastis' },
];

/** Ligue de deux coachs, mercato ouvert (semaine 1), et un joueur de Bob convoité par Alice. */
function league(): { state: GameState; target: string } {
  const state = newMultiplayerGame({ seed: 21, coaches: SIGNUPS });
  const target = asCoach(state, 'b', () => humanClub(state).playerIds[4]!);
  asCoach(state, 'a', () => (humanClub(state).budget = 1_000_000));
  return { state, target };
}

describe('offres entre coachs (MULTI-08)', () => {
  test('on n’achète pas directement le joueur d’un autre coach', () => {
    const { state, target } = league();
    const result = asCoach(state, 'a', () => buy(state, target));
    expect(result.ok).toBe(false);
    expect(result.message).toContain('offre');
  });

  test('l’offre arrive chez l’autre coach, qui l’accepte : le joueur et l’argent changent de club', () => {
    const { state, target } = league();
    const aliceClub = asCoach(state, 'a', () => humanClub(state).id);
    const bobClub = asCoach(state, 'b', () => humanClub(state).id);
    const bobBudget = state.clubs[bobClub]!.budget;
    expect(asCoach(state, 'a', () => makeCoachOffer(state, target, 12_345)).ok).toBe(true);
    expect(asCoach(state, 'a', () => coachOffersSent(state)).length).toBe(1);
    const received = asCoach(state, 'b', () => coachOffersReceived(state));
    expect(received.map((offer) => offer.amount)).toEqual([12_345]);
    expect(asCoach(state, 'b', () => state.news.some((line) => line.includes('Alice'))))
      .toBe(true);
    // Alice ne peut pas répondre à sa propre offre.
    expect(asCoach(state, 'a', () => answerCoachOffer(state, received[0]!.id, true)).ok).toBe(false);
    expect(asCoach(state, 'b', () => answerCoachOffer(state, received[0]!.id, true)).ok).toBe(true);
    expect(state.players[target]!.clubId).toBe(aliceClub);
    expect(state.clubs[bobClub]!.budget).toBe(bobBudget + 12_345);
    expect(state.coachOffers).toEqual([]);
    expect(asCoach(state, 'a', () => state.news.some((line) => line.includes('accepte')))).toBe(true);
  });

  test('refus, retrait, montant invalide, budget insuffisant', () => {
    const { state, target } = league();
    expect(asCoach(state, 'a', () => makeCoachOffer(state, target, 0)).ok).toBe(false);
    expect(asCoach(state, 'a', () => makeCoachOffer(state, target, 5_000_000)).ok).toBe(false);
    asCoach(state, 'a', () => makeCoachOffer(state, target, 1000));
    // Une nouvelle offre remplace la précédente.
    asCoach(state, 'a', () => makeCoachOffer(state, target, 2000));
    expect(state.coachOffers!.map((offer) => offer.amount)).toEqual([2000]);
    const offerId = state.coachOffers![0]!.id;
    expect(asCoach(state, 'b', () => cancelCoachOffer(state, offerId)).ok).toBe(false);
    expect(asCoach(state, 'b', () => answerCoachOffer(state, offerId, false)).ok).toBe(true);
    expect(state.players[target]!.clubId).not.toBe(asCoach(state, 'a', () => state.humanClubId));
    expect(asCoach(state, 'a', () => state.news.some((line) => line.includes('refuse')))).toBe(true);
    asCoach(state, 'a', () => makeCoachOffer(state, target, 3000));
    expect(asCoach(state, 'a', () => cancelCoachOffer(state, state.coachOffers![0]!.id)).ok).toBe(true);
    expect(state.coachOffers).toEqual([]);
  });

  test('une offre tombe après 2 semaines ou à la fermeture du mercato', () => {
    const { state, target } = league();
    asCoach(state, 'a', () => makeCoachOffer(state, target, 1000));
    pruneCoachOffers(state, state.week + 2, true);
    expect(state.coachOffers!.length).toBe(1);
    pruneCoachOffers(state, state.week + 3, true);
    expect(state.coachOffers).toEqual([]);
    asCoach(state, 'a', () => makeCoachOffer(state, target, 1000));
    pruneCoachOffers(state, state.week + 1, false);
    expect(state.coachOffers).toEqual([]);
  });
});
