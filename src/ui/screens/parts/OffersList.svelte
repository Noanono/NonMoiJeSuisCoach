<script lang="ts">
  import Button from '../../kit/Button.svelte';
  import { store } from '../../store.svelte';
  import { formatEuros } from '../../format';
  import { getAbility } from '../../../domain/abilities/catalog';
  import { playerValue } from '../../../domain/club/valuation';
  import { answerOffer, transferWindowOpen } from '../../../domain/game';
  import { fullName, POSITION_SHORT } from '../describe';

  /** Offres des clubs IA sur les joueurs du coach (CLUB-03). */
  const windowOpen = $derived(store.select(transferWindowOpen));
  const offers = $derived(
    store.select((game) =>
      game.offers.map((offer) => {
        const player = game.players[offer.playerId];
        return {
          id: offer.id,
          playerName: player ? fullName(player) : 'Joueur parti',
          position: player ? POSITION_SHORT[player.position] : '',
          value: player ? playerValue(player, getAbility(player.ability.abilityId).rarity) : 0,
          wantsOut: player?.transferRequested ?? false,
          club: game.clubs[offer.fromClubId]?.name ?? 'Club mystère',
          amount: offer.amount,
          expiresWeek: offer.expiresWeek,
        };
      }),
    ),
  );

  function answer(offerId: string, accept: boolean): void {
    const result = store.run((game) => answerOffer(game, offerId, accept));
    store.notify(result.message);
  }
</script>

{#if offers.length === 0}
  <p class="vide">Aucune offre. Personne ne veut de tes gars. Pour l'instant.</p>
{:else}
  {#if !windowOpen}
    <p class="texte-s malus">Mercato fermé : impossible d'accepter avant la réouverture. Refuser reste possible.</p>
  {/if}
  <ul class="liste-nue">
    {#each offers as offer (offer.id)}
      <li class="offre">
        <p class="texte-s">
          <span class="texte-fort">{offer.club}</span> propose
          <span class="mono texte-fort">{formatEuros(offer.amount)}</span> pour
          <span class="texte-fort">{offer.playerName}</span>
          <span class="discret">{offer.position}</span>
        </p>
        <p class="texte-s discret">
          Valeur <span class="mono">{formatEuros(offer.value)}</span> · expire semaine
          <span class="mono">{offer.expiresWeek}</span>{#if offer.wantsOut} · il veut partir, un refus le vexera{/if}
        </p>
        <div class="ligne-actions">
          <Button size="s" disabled={!windowOpen} onclick={() => answer(offer.id, true)}>Accepter</Button>
          <Button size="s" variant="ghost" onclick={() => answer(offer.id, false)}>Refuser</Button>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .offre {
    display: grid;
    gap: var(--space-1);
    padding-bottom: var(--space-2);
    border-bottom: var(--trait-fin) solid var(--craie-2);
  }
  p {
    margin: 0;
  }
</style>
