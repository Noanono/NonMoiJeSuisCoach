<script lang="ts">
  import './parts/screens.css';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import OffersList from './parts/OffersList.svelte';
  import { store } from '../store.svelte';
  import { formatEuros } from '../format';
  import { getAbility } from '../../domain/abilities/catalog';
  import { RARITY_LABEL } from '../../domain/abilities/progression';
  import { MAX_SQUAD_SIZE } from '../../domain/club/transfers';
  import { buy, humanClub, market, transferWindowOpen } from '../../domain/game';
  import type { Position } from '../../domain/types';
  import { fullName, POSITION_LABEL, POSITION_SHORT } from './describe';
  import { nextTransferWindowWeek, transferWindowLastWeek } from './views';

  /** Mercato (CLUB-02, FRAS-05) : liste filtrable, achats et offres reçues. */
  const PAGE_SIZE = 40;
  const POSITIONS = Object.keys(POSITION_LABEL) as Position[];

  const transferWindow = $derived(
    store.select((game) => {
      const open = transferWindowOpen(game);
      const club = humanClub(game);
      return {
        open,
        nextOpening: open ? null : nextTransferWindowWeek(game.week),
        closing: open ? transferWindowLastWeek(game.week) : null,
        budget: club.budget,
        squadSize: club.playerIds.length,
      };
    }),
  );

  /** La liste complète ne se recalcule que quand la partie change, pas à chaque frappe dans les filtres. */
  const listings = $derived(
    store.select((game) =>
      market(game).map((listing) => {
        const player = game.players[listing.playerId]!;
        return {
          id: listing.playerId,
          name: fullName(player),
          position: player.position,
          age: player.age,
          overall: listing.overall,
          club: listing.clubId ? (game.clubs[listing.clubId]?.shortName ?? '?') : 'Libre',
          clubName: listing.clubId ? (game.clubs[listing.clubId]?.name ?? 'Club inconnu') : 'Sans club',
          ability: listing.ability ? `${getAbility(listing.ability.abilityId).name} · ${RARITY_LABEL[listing.ability.rarity]}` : null,
          price: listing.price,
          salary: listing.askingSalary,
        };
      }),
    ),
  );

  let positionFilter = $state<Position | 'all'>('all');
  let minOverall = $state<number | null>(null);
  let maxPrice = $state<number | null>(null);
  let shown = $state(PAGE_SIZE);

  const filtered = $derived(
    listings.filter(
      (listing) =>
        (positionFilter === 'all' || listing.position === positionFilter) &&
        (minOverall === null || listing.overall >= minOverall) &&
        (maxPrice === null || listing.price <= maxPrice),
    ),
  );
  const visible = $derived(filtered.slice(0, shown));
  const squadFull = $derived(transferWindow.squadSize >= MAX_SQUAD_SIZE);

  function resetPaging(): void {
    shown = PAGE_SIZE;
  }

  function purchase(playerId: string): void {
    const result = store.run((game) => buy(game, playerId));
    store.notify(result.message);
  }
</script>

<div class="ecran">
  <div class="colonnes large-gauche">
    <Card title="Mercato" scotch>
      {#snippet actions()}
        <span class="tampon">Budget {formatEuros(transferWindow.budget)} · {transferWindow.squadSize} / {MAX_SQUAD_SIZE} joueurs</span>
      {/snippet}
      {#if transferWindow.open}
        <p class="texte-fort">Fenêtre ouverte jusqu'à la fin de la semaine <span class="mono">{transferWindow.closing}</span> : achète, vends, négocie.</p>
      {:else if transferWindow.nextOpening}
        <p class="texte-fort">Mercato fermé. Prochaine ouverture : semaine <span class="mono">{transferWindow.nextOpening}</span>.</p>
      {:else}
        <p class="texte-fort">Mercato fermé jusqu'à la saison prochaine (semaine <span class="mono">1</span>).</p>
      {/if}
      <p class="texte-s discret">Capacité affichée seulement si elle est connue. Les autres se dévoilent à l'arrivée au club.</p>
    </Card>

    <Card title="Offres reçues">
      <OffersList />
    </Card>
  </div>

  <Card title="Joueurs disponibles">
    {#snippet actions()}
      <span class="tampon">{filtered.length} joueurs</span>
    {/snippet}
    <form class="filtres" onsubmit={(event) => event.preventDefault()} aria-label="Filtres du mercato">
      <label class="champ">
        <span class="tampon">Poste</span>
        <select bind:value={positionFilter} onchange={resetPaging}>
          <option value="all">Tous</option>
          {#each POSITIONS as position (position)}<option value={position}>{POSITION_LABEL[position]}</option>{/each}
        </select>
      </label>
      <label class="champ">
        <span class="tampon">Note minimale</span>
        <input type="number" min="1" max="99" inputmode="numeric" bind:value={minOverall} oninput={resetPaging} />
      </label>
      <label class="champ">
        <span class="tampon">Prix maximal (€)</span>
        <input type="number" min="0" step="100" inputmode="numeric" bind:value={maxPrice} oninput={resetPaging} />
      </label>
    </form>

    {#if filtered.length === 0}
      <p class="vide">Personne ne veut venir. Pour l'instant.</p>
    {:else}
      <div class="defilant">
        <table class="tableau">
          <caption class="sr-only">Joueurs du mercato, du mieux noté au moins bien noté</caption>
          <thead>
            <tr>
              <th scope="col">Nom</th>
              <th scope="col">Poste</th>
              <th scope="col" class="num">Âge</th>
              <th scope="col" class="num">Note</th>
              <th scope="col">Club</th>
              <th scope="col">Capacité</th>
              <th scope="col" class="num">Prix</th>
              <th scope="col" class="num">Salaire / sem.</th>
              <th scope="col"><span class="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {#each visible as listing (listing.id)}
              {@const affordable = listing.price <= transferWindow.budget}
              <tr>
                <td class="texte-fort">{listing.name}</td>
                <td><abbr title={POSITION_LABEL[listing.position]}>{POSITION_SHORT[listing.position]}</abbr></td>
                <td class="num">{listing.age}</td>
                <td class="num texte-fort">{listing.overall}</td>
                <td><abbr title={listing.clubName}>{listing.club}</abbr></td>
                <td>{listing.ability ?? '???'}</td>
                <td class="num">{formatEuros(listing.price)}</td>
                <td class="num">{formatEuros(listing.salary)}</td>
                <td>
                  <Button
                    size="s"
                    disabled={!transferWindow.open || !affordable || squadFull}
                    aria-label={`Acheter ${listing.name} pour ${formatEuros(listing.price)}`}
                    onclick={() => purchase(listing.id)}
                  >
                    {affordable ? 'Acheter' : 'Trop cher'}
                  </Button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if visible.length < filtered.length}
        <div class="plus">
          <Button variant="ghost" size="s" onclick={() => (shown += PAGE_SIZE)}>
            Voir {Math.min(PAGE_SIZE, filtered.length - visible.length)} de plus
          </Button>
        </div>
      {/if}
    {/if}
  </Card>
</div>

<style>
  p {
    margin: 0 0 var(--space-2);
  }
  .filtres {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }
  .filtres input {
    width: 140px;
  }
  abbr {
    text-decoration: none;
  }
  .plus {
    margin-top: var(--space-4);
  }
</style>
