<script lang="ts">
  import Button from '../../kit/Button.svelte';
  import PlayerAvatar from '../../kit/PlayerAvatar.svelte';
  import RarityTag from '../../kit/RarityTag.svelte';
  import RatingBadge from '../../kit/RatingBadge.svelte';
  import PlayerSheet from './PlayerSheet.svelte';
  import { store } from '../../store.svelte';
  import { formatEuros } from '../../format';
  import { getAbility } from '../../../domain/abilities/catalog';
  import { RARITY_LABEL } from '../../../domain/abilities/progression';
  import { playerValue } from '../../../domain/club/valuation';
  import { answerOffer, transferWindowOpen } from '../../../domain/game';
  import { overall } from '../../../domain/player/rating';
  import { fullName, POSITION_LABEL } from '../describe';

  /** Offres des clubs IA sur les joueurs du coach (CLUB-03), avec la fiche résumée du joueur visé. */
  const windowOpen = $derived(store.select(transferWindowOpen));
  const offers = $derived(
    store.select((game) =>
      game.offers.map((offer) => {
        const player = game.players[offer.playerId];
        const base = {
          id: offer.id,
          club: game.clubs[offer.fromClubId]?.name ?? 'Club mystère',
          amount: offer.amount,
          expiresWeek: offer.expiresWeek,
        };
        if (!player) return { ...base, player: null };
        const ability = getAbility(player.ability.abilityId);
        const value = playerValue(player, ability.rarity);
        const lineup = game.clubs[game.humanClubId]?.lineup;
        return {
          ...base,
          value,
          /** Écart de l'offre avec la valeur, en pourcentage. */
          gap: value > 0 ? Math.round(((offer.amount - value) / value) * 100) : 0,
          player: {
            id: player.id,
            name: fullName(player),
            avatar: { id: player.id, age: player.age, clubId: player.clubId, position: player.position },
            position: POSITION_LABEL[player.position],
            age: player.age,
            overall: overall(player),
            potential: player.potential,
            role: lineup?.starters.includes(player.id) ? 'Titulaire' : lineup?.bench.includes(player.id) ? 'Remplaçant' : 'Tribune',
            ability: `${ability.name} · ${RARITY_LABEL[ability.rarity]} · niv. ${player.ability.level}`,
            rarity: ability.rarity,
            stats: player.seasonStats,
            salary: player.salary,
          },
        };
      }),
    ),
  );

  let openPlayerId = $state<string | null>(null);

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
  <ul class="liste-nue offres">
    {#each offers as offer (offer.id)}
      <li class="offre">
        <div class="proposition">
          <p class="tampon discret">Leur proposition</p>
          <p class="texte-fort">{offer.club}</p>
          <p class="montant mono texte-fort">{formatEuros(offer.amount)}</p>
          {#if offer.player}
            <p class="texte-s">
              Valeur <span class="mono">{formatEuros(offer.value)}</span>
              <span class:bonus={offer.gap >= 0} class:malus={offer.gap < 0}>({offer.gap >= 0 ? '+' : ''}{offer.gap} %)</span>
            </p>
          {/if}
          <p class="texte-s discret">Expire semaine <span class="mono">{offer.expiresWeek}</span></p>
          <div class="ligne-actions">
            <Button size="s" disabled={!windowOpen || !offer.player} onclick={() => answer(offer.id, true)}>Accepter</Button>
            <Button size="s" variant="ghost" onclick={() => answer(offer.id, false)}>Refuser</Button>
          </div>
        </div>

        {#if offer.player}
          {@const player = offer.player}
          <div class="joueur">
            <p class="tampon discret">Ton joueur</p>
            <div class="identite">
              <PlayerAvatar player={player.avatar} size={40} />
              <div>
                <button class="lien texte-fort" onclick={() => (openPlayerId = player.id)}>{player.name}</button>
                <p class="texte-s discret">{player.position} · {player.age} ans · {player.role}</p>
              </div>
            </div>
            <dl class="infos texte-s">
              <div><dt class="tampon">Note</dt><dd><RatingBadge value={player.overall} size="s" /></dd></div>
              <div><dt class="tampon">Potentiel</dt><dd class="mono">{player.potential}</dd></div>
              <div><dt class="tampon">Salaire</dt><dd class="mono">{formatEuros(player.salary)}/sem.</dd></div>
              <div><dt class="tampon">Saison</dt><dd class="mono">{player.stats.matches} m. · {player.stats.goals} b. · {player.stats.assists} pd</dd></div>
            </dl>
            <RarityTag rarity={player.rarity} text={player.ability} />
          </div>
        {:else}
          <p class="texte-s discret">Ce joueur n'est plus chez toi.</p>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

{#if openPlayerId}
  <PlayerSheet playerId={openPlayerId} onclose={() => (openPlayerId = null)} />
{/if}

<style>
  p {
    margin: 0;
  }
  .offres {
    gap: var(--space-4);
    container-type: inline-size;
  }
  /* La proposition à gauche, le joueur visé à droite ; empilés seulement si la place manque. */
  .offre {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    gap: var(--space-2);
    padding-bottom: var(--space-4);
    border-bottom: var(--trait-fin) solid var(--craie-2);
  }
  @container (max-width: 300px) {
    .offre {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .proposition,
  .joueur {
    display: grid;
    gap: var(--space-1);
    align-content: start;
  }
  .joueur {
    padding: var(--space-2);
    border: var(--trait-fin) solid var(--encre-pale);
    background: var(--craie);
  }
  .montant {
    font-size: 1.25rem;
  }
  .identite {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .infos {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1) var(--space-2);
    margin: var(--space-1) 0;
  }
  .infos div {
    display: grid;
  }
  dd {
    margin: 0;
  }
</style>
