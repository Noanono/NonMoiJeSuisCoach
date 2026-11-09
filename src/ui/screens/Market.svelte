<script lang="ts">
  import './parts/screens.css';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import PlayerAvatar from '../kit/PlayerAvatar.svelte';
  import RarityTag from '../kit/RarityTag.svelte';
  import RatingBadge from '../kit/RatingBadge.svelte';
  import OffersList from './parts/OffersList.svelte';
  import PlayerSheet from './parts/PlayerSheet.svelte';
  import { store } from '../store.svelte';
  import { formatEuros } from '../format';
  import { getAbility } from '../../domain/abilities/catalog';
  import { RARITY_LABEL } from '../../domain/abilities/progression';
  import { MAX_SQUAD_SIZE } from '../../domain/club/transfers';
  import { buy, humanClub, market, transferWindowOpen } from '../../domain/game';
  import type { Position, Rarity } from '../../domain/types';
  import { fullName, POSITION_LABEL, POSITION_ORDER, POSITION_SHORT } from './describe';
  import { AGE_BANDS, inAgeBand, nextTransferWindowWeek, sortRows, transferWindowLastWeek, type AgeBandId, type SortDirection } from './views';

  /** Mercato (CLUB-02) : liste filtrable, achats et offres reçues. */
  const PAGE_SIZE = 40;
  const POSITIONS = Object.keys(POSITION_LABEL) as Position[];
  const RARITIES = Object.keys(RARITY_LABEL) as Rarity[];
  const RARITY_ORDER: Record<Rarity, number> = { common: 1, rare: 2, legendary: 3, mythic: 4 };

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
          avatar: { id: player.id, age: player.age, clubId: player.clubId, position: player.position },
          position: player.position,
          age: player.age,
          overall: listing.overall,
          club: listing.clubId ? (game.clubs[listing.clubId]?.shortName ?? '?') : 'Libre',
          clubName: listing.clubId ? (game.clubs[listing.clubId]?.name ?? 'Club inconnu') : 'Sans club',
          ability: listing.ability ? `${getAbility(listing.ability.abilityId).name} · ${RARITY_LABEL[listing.ability.rarity]}` : null,
          rarity: listing.ability?.rarity ?? null,
          price: listing.price,
          salary: listing.askingSalary,
        };
      }),
    ),
  );

  type Listing = (typeof listings)[number];
  type SortKey = 'name' | 'position' | 'age' | 'overall' | 'club' | 'ability' | 'price' | 'salary';

  interface Column {
    key: SortKey;
    label: string;
    numeric: boolean;
    sortValue: (row: Listing) => number | string;
    firstDirection: SortDirection;
  }

  const COLUMNS: Column[] = [
    { key: 'name', label: 'Nom', numeric: false, sortValue: (row) => row.name, firstDirection: 'asc' },
    { key: 'position', label: 'Poste', numeric: false, sortValue: (row) => POSITION_ORDER[row.position], firstDirection: 'asc' },
    { key: 'age', label: 'Âge', numeric: true, sortValue: (row) => row.age, firstDirection: 'asc' },
    { key: 'overall', label: 'Note', numeric: true, sortValue: (row) => row.overall, firstDirection: 'desc' },
    { key: 'club', label: 'Club', numeric: false, sortValue: (row) => row.club, firstDirection: 'asc' },
    { key: 'ability', label: 'Capacité', numeric: false, sortValue: (row) => (row.rarity ? RARITY_ORDER[row.rarity] : 0), firstDirection: 'desc' },
    { key: 'price', label: 'Prix', numeric: true, sortValue: (row) => row.price, firstDirection: 'asc' },
    { key: 'salary', label: 'Salaire / sem.', numeric: true, sortValue: (row) => row.salary, firstDirection: 'asc' },
  ];

  let openPlayerId = $state<string | null>(null);
  let sortKey = $state<SortKey>('overall');
  let direction = $state<SortDirection>('desc');
  let ageFilter = $state<AgeBandId | 'all'>('all');
  let rarityFilter = $state<Rarity | 'all'>('all');
  let positionFilter = $state<Position | 'all'>('all');
  let minOverall = $state<number | null>(null);
  let maxPrice = $state<number | null>(null);
  let shown = $state(PAGE_SIZE);

  const filtered = $derived(
    listings.filter(
      (listing) =>
        (positionFilter === 'all' || listing.position === positionFilter) &&
        (ageFilter === 'all' || inAgeBand(listing.age, ageFilter)) &&
        (rarityFilter === 'all' || listing.rarity === rarityFilter) &&
        (minOverall === null || listing.overall >= minOverall) &&
        (maxPrice === null || listing.price <= maxPrice),
    ),
  );
  const sorted = $derived(sortRows(filtered, COLUMNS.find((column) => column.key === sortKey)!.sortValue, direction));
  const visible = $derived(sorted.slice(0, shown));

  function sortBy(column: Column): void {
    if (sortKey === column.key) direction = direction === 'asc' ? 'desc' : 'asc';
    else {
      sortKey = column.key;
      direction = column.firstDirection;
    }
    resetPaging();
  }

  function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (sortKey !== key) return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
  }
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
        <span class="tampon">Âge</span>
        <select bind:value={ageFilter} onchange={resetPaging}>
          <option value="all">Tous</option>
          {#each AGE_BANDS as band (band.id)}<option value={band.id}>{band.label}</option>{/each}
        </select>
      </label>
      <label class="champ">
        <span class="tampon">Rareté</span>
        <select bind:value={rarityFilter} onchange={resetPaging}>
          <option value="all">Toutes</option>
          {#each RARITIES as rarity (rarity)}<option value={rarity}>{RARITY_LABEL[rarity]}</option>{/each}
        </select>
      </label>
      <label class="champ">
        <span class="tampon">Trier par</span>
        <select bind:value={sortKey} onchange={resetPaging}>
          {#each COLUMNS as column (column.key)}<option value={column.key}>{column.label}</option>{/each}
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
          <caption class="sr-only">Joueurs du mercato</caption>
          <thead>
            <tr>
              {#each COLUMNS as column (column.key)}
                <th scope="col" class:num={column.numeric} aria-sort={ariaSort(column.key)}>
                  <button class="tri" onclick={() => sortBy(column)}>
                    {column.label}{#if sortKey === column.key}<span aria-hidden="true">{direction === 'asc' ? ' ▲' : ' ▼'}</span>{/if}
                  </button>
                </th>
              {/each}
              <th scope="col"><span class="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {#each visible as listing (listing.id)}
              {@const affordable = listing.price <= transferWindow.budget}
              <tr>
                <td><span class="identite"><PlayerAvatar player={listing.avatar} size={32} /><button class="lien" onclick={() => (openPlayerId = listing.id)}>{listing.name}</button></span></td>
                <td><abbr title={POSITION_LABEL[listing.position]}>{POSITION_SHORT[listing.position]}</abbr></td>
                <td class="num">{listing.age}</td>
                <td class="num"><RatingBadge value={listing.overall} size="s" /></td>
                <td><abbr title={listing.clubName}>{listing.club}</abbr></td>
                <td><RarityTag rarity={listing.rarity} text={listing.ability ?? '???'} /></td>
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

{#if openPlayerId}
  <PlayerSheet playerId={openPlayerId} onclose={() => (openPlayerId = null)} />
{/if}

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
  .identite {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .plus {
    margin-top: var(--space-4);
  }
</style>
