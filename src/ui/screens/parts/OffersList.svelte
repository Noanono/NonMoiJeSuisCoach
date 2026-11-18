<script lang="ts">
  import { t, td } from '../../../i18n/t';
  import Button from '../../kit/Button.svelte';
  import PlayerAvatar from '../../kit/PlayerAvatar.svelte';
  import RarityTag from '../../kit/RarityTag.svelte';
  import RatingBadge from '../../kit/RatingBadge.svelte';
  import PlayerSheet from './PlayerSheet.svelte';
  import CoachOffers from './CoachOffers.svelte';
  import { store } from '../../store.svelte';
  import { formatEuros } from '../../format';
  import { getAbility } from '../../../domain/abilities/catalog';
  import { RARITY_LABEL } from '../../../domain/abilities/progression';
  import { playerValue } from '../../../domain/club/valuation';
  import { transferWindowOpen } from '../../../domain/game';
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
          club: game.clubs[offer.fromClubId]?.name ?? t('offers.mysteryClub'),
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
            avatar: { id: player.id, age: player.age, clubId: player.clubId, position: player.position, nationality: player.nationality },
            position: POSITION_LABEL[player.position],
            age: player.age,
            overall: overall(player),
            potential: player.potential,
            role: lineup?.starters.includes(player.id) ? t('offers.starter') : lineup?.bench.includes(player.id) ? t('offers.sub') : t('offers.stand'),
            ability: `${td(ability.name)} · ${td(RARITY_LABEL[ability.rarity])} · ${t('offers.level', { level: player.ability.level })}`,
            rarity: ability.rarity,
            stats: player.seasonStats,
            salary: player.salary,
          },
        };
      }),
    ),
  );

  let openPlayerId = $state<string | null>(null);
  const coachOfferCount = $derived(store.select((game) => (game.coachOffers ?? []).filter((offer) => offer.toClubId === game.humanClubId || offer.fromClubId === game.humanClubId).length));

  function answer(offerId: string, accept: boolean): void {
    const result = store.command('answerOffer', offerId, accept);
    store.notify(result.message);
  }
</script>

<CoachOffers />

{#if offers.length === 0 && coachOfferCount === 0}
  <p class="vide">{t('offers.none')}</p>
{:else if offers.length > 0}
  {#if !windowOpen}
    <p class="texte-s malus">{t('offers.windowClosed')}</p>
  {/if}
  <ul class="liste-nue offres">
    {#each offers as offer (offer.id)}
      <li class="offre">
        <div class="proposition">
          <p class="tampon discret">{t('offers.theirOffer')}</p>
          <p class="texte-fort">{offer.club}</p>
          <p class="montant mono texte-fort">{formatEuros(offer.amount)}</p>
          {#if offer.player}
            <p class="texte-s">
              {t('sheet.value')} <span class="mono">{formatEuros(offer.value)}</span>
              <span class:bonus={offer.gap >= 0} class:malus={offer.gap < 0}>({offer.gap >= 0 ? '+' : ''}{t('band.percent', { value: offer.gap })})</span>
            </p>
          {/if}
          <p class="texte-s discret">{t('offers.expires')} <span class="mono">{offer.expiresWeek}</span></p>
          <div class="ligne-actions">
            <Button size="s" disabled={!windowOpen || !offer.player} onclick={() => answer(offer.id, true)}>{t('offers.accept')}</Button>
            <Button size="s" variant="ghost" onclick={() => answer(offer.id, false)}>{t('offers.refuse')}</Button>
          </div>
        </div>

        {#if offer.player}
          {@const player = offer.player}
          <div class="joueur">
            <p class="tampon discret">{t('offers.yourPlayer')}</p>
            <div class="identite">
              <PlayerAvatar player={player.avatar} size={40} />
              <div>
                <button class="lien texte-fort" onclick={() => (openPlayerId = player.id)}>{player.name}</button>
                <p class="texte-s discret">{player.position} · {t('offers.age', { age: player.age })} · {player.role}</p>
              </div>
            </div>
            <dl class="infos texte-s">
              <div><dt class="tampon">{t('sheet.overall')}</dt><dd><RatingBadge value={player.overall} size="s" /></dd></div>
              <div><dt class="tampon">{t('sheet.potential')}</dt><dd class="mono">{player.potential}</dd></div>
              <div><dt class="tampon">{t('sheet.salary')}</dt><dd class="mono">{t('sheet.perWeek', { amount: formatEuros(player.salary) })}</dd></div>
              <div><dt class="tampon">{t('sheet.season')}</dt><dd class="mono">{t('offers.seasonStats', { matches: player.stats.matches, goals: player.stats.goals, assists: player.stats.assists })}</dd></div>
            </dl>
            <RarityTag rarity={player.rarity} text={player.ability} />
          </div>
        {:else}
          <p class="texte-s discret">{t('offers.gone')}</p>
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
