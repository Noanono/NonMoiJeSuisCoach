<script lang="ts">
  import Button from '../../kit/Button.svelte';
  import { store } from '../../store.svelte';
  import { formatEuros } from '../../format';
  import { getAbility } from '../../../domain/abilities/catalog';
  import { playerValue } from '../../../domain/club/valuation';
  import { coachOfClub, coachOffersReceived, coachOffersSent, transferWindowOpen, type CoachOffer, type GameState } from '../../../domain/game';
  import { fullName } from '../describe';

  /** Offres entre coachs de la ligue (MULTI-08) : celles reçues, à accepter ou refuser, et celles envoyées. */
  function describe(game: GameState, offer: CoachOffer, otherClubId: string) {
    const player = game.players[offer.playerId];
    const coachId = coachOfClub(game, otherClubId);
    const coach = game.coaches?.find((entry) => entry.id === coachId)?.name ?? 'Un coach';
    const value = player ? playerValue(player, getAbility(player.ability.abilityId).rarity) : 0;
    return {
      id: offer.id,
      coach,
      club: game.clubs[otherClubId]?.name ?? '',
      player: player ? fullName(player) : 'Joueur parti',
      amount: offer.amount,
      value,
      gap: value > 0 ? Math.round(((offer.amount - value) / value) * 100) : 0,
      expiresWeek: offer.expiresWeek,
    };
  }

  const view = $derived(
    store.select((game) => ({
      windowOpen: transferWindowOpen(game),
      received: coachOffersReceived(game).map((offer) => describe(game, offer, offer.fromClubId)),
      sent: coachOffersSent(game).map((offer) => describe(game, offer, offer.toClubId)),
    })),
  );

  function answer(offerId: string, accept: boolean): void {
    store.notify(store.command('answerCoachOffer', offerId, accept).message);
  }

  function withdraw(offerId: string): void {
    store.notify(store.command('cancelCoachOffer', offerId).message);
  }
</script>

{#if view.received.length > 0 || view.sent.length > 0}
  <section class="coachs" aria-label="Offres entre coachs">
    {#each view.received as offer (offer.id)}
      <div class="offre recue">
        <p class="tampon">Offre de {offer.coach} · {offer.club}</p>
        <p><span class="texte-fort">{offer.player}</span> contre <span class="mono texte-fort">{formatEuros(offer.amount)}</span></p>
        <p class="texte-s">
          Valeur <span class="mono">{formatEuros(offer.value)}</span>
          <span class:bonus={offer.gap >= 0} class:malus={offer.gap < 0}>({offer.gap >= 0 ? '+' : ''}{offer.gap} %)</span>
          · expire semaine <span class="mono">{offer.expiresWeek}</span>
        </p>
        <div class="ligne-actions">
          <Button size="s" disabled={!view.windowOpen} onclick={() => answer(offer.id, true)}>Accepter</Button>
          <Button size="s" variant="ghost" onclick={() => answer(offer.id, false)}>Refuser</Button>
        </div>
      </div>
    {/each}
    {#each view.sent as offer (offer.id)}
      <div class="offre envoyee">
        <p class="tampon discret">Ton offre à {offer.coach}</p>
        <p><span class="texte-fort">{offer.player}</span> pour <span class="mono">{formatEuros(offer.amount)}</span> · en attente de sa réponse</p>
        <div class="ligne-actions">
          <Button size="s" variant="ghost" onclick={() => withdraw(offer.id)}>Retirer l'offre</Button>
        </div>
      </div>
    {/each}
  </section>
{/if}

<style>
  .coachs {
    display: grid;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
  .offre {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-4);
    border: var(--trait-fin) solid var(--encre);
  }
  .offre.recue {
    border-width: var(--trait-epais);
    background: var(--craie);
  }
  .offre p {
    margin: 0;
  }
</style>
