import { CUP_WINNER_PRIZE } from '../club/finance';
import { cupRoundFixtures, fixtureWinnerId, type CupState } from '../league/cup';
import type { GameState } from './state';
import { asCoachOfClub, forEachCoach } from './coaches';

/**
 * Primes de coupe (CLUB-01) : chaque club touche une prime au moment où il est éliminé, d'autant plus
 * grosse qu'il est allé loin ; le vainqueur touche la prime de la coupe. La prime double à chaque tour.
 */

const PRIZE_ROUNDING = 100;

/** Prime d'un club éliminé au tour `round` : la moitié de la prime du vainqueur en finale, puis moitié par tour. */
export function cupStagePrize(totalRounds: number, round: number): number {
  const stepsFromWinner = Math.max(1, totalRounds - round + 1);
  return Math.round(CUP_WINNER_PRIZE / 2 ** stepsFromWinner / PRIZE_ROUNDING) * PRIZE_ROUNDING;
}

/** Ce qu'un club a touché en coupe cette saison (0 tant qu'il est en lice). */
export function cupPrizeFor(cup: CupState, clubId: string): number {
  for (const fixture of cup.fixtures) {
    if (!fixture.result || (fixture.homeId !== clubId && fixture.awayId !== clubId)) continue;
    const won = fixtureWinnerId(fixture) === clubId;
    if (!won) return cupStagePrize(cup.totalRounds, fixture.round);
    if (fixture.round === cup.totalRounds) return CUP_WINNER_PRIZE;
  }
  return 0;
}

function formatPrize(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} €`;
}

/** Paie les clubs éliminés d'un tour terminé (et le vainqueur après la finale). Une seule fois par tour. */
export function payCupRound(state: GameState, round: number): void {
  const cup = state.cup;
  if ((cup.paidRounds ?? []).includes(round)) return;
  cup.paidRounds = [...(cup.paidRounds ?? []), round];
  for (const fixture of cupRoundFixtures(cup, round)) {
    if (!fixture.result) continue;
    const winnerId = fixtureWinnerId(fixture);
    const loserId = winnerId === fixture.homeId ? fixture.awayId : fixture.homeId;
    pay(state, loserId, cupStagePrize(cup.totalRounds, round), false);
    if (round === cup.totalRounds) pay(state, winnerId, CUP_WINNER_PRIZE, true);
  }
}

function pay(state: GameState, clubId: string, amount: number, champion: boolean): void {
  const club = state.clubs[clubId];
  if (!club || amount <= 0) return;
  club.budget += amount;
  if (champion) {
    forEachCoach(state, () => {
      if (state.humanClubId !== clubId) state.news.push(`La coupe est remportée par ${club.name}.`);
    });
  }
  asCoachOfClub(state, clubId, () => {
    state.lastFinance = [...state.lastFinance, { label: champion ? 'Coupe gagnée' : 'Prime de coupe', amount }];
    state.news.push(
      champion
        ? `COUPE GAGNÉE ! Prime de ${formatPrize(amount)}, le trophée trône déjà sur le comptoir.`
        : `Éliminé de la coupe, mais la fédération verse ${formatPrize(amount)}. Le trésorier essuie une larme.`,
    );
  });
}
