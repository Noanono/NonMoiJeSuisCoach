<script lang="ts">
  import { t, td, type MessageKey } from '../../i18n/t';
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
  import { abilityKnown, coachOffersSent, humanClub, isCoachPlayer, isScouted, market, potentialView, scoutingOf, transferWindowOpen } from '../../domain/game';
  import { potentialLabel, potentialSortValue } from './views';
  import type { Position, Rarity } from '../../domain/types';
  import { fullName, POSITION_LABEL, POSITION_ORDER, POSITION_SHORT } from './describe';
  import { AGE_BANDS, inAgeBand, nextTransferWindowWeek, sortRows, transferWindowLastWeek, type AgeBandId, type SortDirection } from './views';

  /** Mercato (CLUB-02) : liste filtrable, achats et offres reçues. */
  const PAGE_SIZE = 40;
  const POSITIONS = Object.keys(POSITION_LABEL) as Position[];
  const RARITIES = Object.keys(RARITY_LABEL) as Rarity[];
  const RARITY_ORDER: Record<Rarity, number> = { common: 1, rare: 2, legendary: 3, mythic: 4, foreign: 5 };

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
        reports: scoutingOf(game).reports,
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
          avatar: { id: player.id, age: player.age, clubId: player.clubId, position: player.position, nationality: player.nationality },
          position: player.position,
          age: player.age,
          overall: listing.overall,
          club: listing.clubId ? (game.clubs[listing.clubId]?.shortName ?? '?') : t('market.free'),
          clubName: listing.clubId ? (game.clubs[listing.clubId]?.name ?? t('sheet.unknownClub')) : t('sheet.noClub'),
          // Rareté toujours visible ; nom de la capacité et potentiel selon la cellule de scouts (CLUB-10).
          ability: listing.ability && abilityKnown(game, player) ? `${td(getAbility(listing.ability.abilityId).name)} · ${td(RARITY_LABEL[listing.ability.rarity])} · ${t('offers.level', { level: player.ability.level })}` : `??? · ${td(RARITY_LABEL[listing.ability!.rarity])}`,
          abilityLevel: player.ability.level,
          rarity: listing.ability?.rarity ?? null,
          potential: potentialView(game, player),
          scouted: isScouted(game, player),
          price: listing.price,
          salary: listing.askingSalary,
          // Joueur d'un autre coach de la ligue : pas d'achat, une offre (MULTI-08).
          coachOwned: isCoachPlayer(game, listing.playerId),
          offerSent: coachOffersSent(game).find((offer) => offer.playerId === listing.playerId)?.amount ?? null,
        };
      }),
    ),
  );

  type Listing = (typeof listings)[number];
  type SortKey = 'name' | 'position' | 'age' | 'overall' | 'potential' | 'club' | 'ability' | 'price' | 'salary';

  interface Column {
    key: SortKey;
    label: MessageKey;
    numeric: boolean;
    sortValue: (row: Listing) => number | string;
    firstDirection: SortDirection;
  }

  const COLUMNS: Column[] = [
    { key: 'name', label: 'squad.col.name', numeric: false, sortValue: (row) => row.name, firstDirection: 'asc' },
    { key: 'position', label: 'squad.col.position', numeric: false, sortValue: (row) => POSITION_ORDER[row.position], firstDirection: 'asc' },
    { key: 'age', label: 'squad.col.age', numeric: true, sortValue: (row) => row.age, firstDirection: 'asc' },
    { key: 'overall', label: 'squad.col.overall', numeric: true, sortValue: (row) => row.overall, firstDirection: 'desc' },
    { key: 'potential', label: 'sheet.potential', numeric: true, sortValue: (row) => potentialSortValue(row.potential), firstDirection: 'desc' },
    { key: 'club', label: 'shell.tabs.club', numeric: false, sortValue: (row) => row.club, firstDirection: 'asc' },
    { key: 'ability', label: 'squad.col.ability', numeric: false, sortValue: (row) => (row.rarity ? RARITY_ORDER[row.rarity] * 10 + row.abilityLevel : 0), firstDirection: 'desc' },
    { key: 'price', label: 'market.price', numeric: true, sortValue: (row) => row.price, firstDirection: 'asc' },
    { key: 'salary', label: 'market.salary', numeric: true, sortValue: (row) => row.salary, firstDirection: 'asc' },
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

  function scout(playerId: string): void {
    store.notify(store.command('scoutPlayer', playerId).message);
  }

  function purchase(playerId: string): void {
    const result = store.command('buy', playerId);
    store.notify(result.message);
  }

  /** Offre en cours de saisie sur le joueur d'un autre coach. */
  let offerFor = $state<string | null>(null);
  let offerAmount = $state(0);

  function openOffer(listing: Listing): void {
    offerFor = listing.id;
    offerAmount = listing.offerSent ?? listing.price;
  }

  function sendOffer(event: SubmitEvent, playerId: string): void {
    event.preventDefault();
    const result = store.command('makeCoachOffer', playerId, offerAmount);
    store.notify(result.message);
    if (result.ok) offerFor = null;
  }
</script>

<div class="ecran">
  <div class="colonnes large-gauche">
    <Card title={t('shell.tabs.market')} scotch>
      {#snippet actions()}
        <span class="tampon">{t('market.summary', { budget: formatEuros(transferWindow.budget), size: transferWindow.squadSize, max: MAX_SQUAD_SIZE, reports: transferWindow.reports })}</span>
      {/snippet}
      {#if transferWindow.open}
        <p class="texte-fort">{t('market.open', { week: transferWindow.closing ?? '' })}</p>
      {:else if transferWindow.nextOpening}
        <p class="texte-fort">{t('market.closedNext', { week: transferWindow.nextOpening })}</p>
      {:else}
        <p class="texte-fort">{t('market.closedSeason')}</p>
      {/if}
      <p class="texte-s discret">{t('market.abilityNote')}</p>
    </Card>

    <Card title={t('dashboard.offers')}>
      <OffersList />
    </Card>
  </div>

  <Card title={t('market.available')}>
    {#snippet actions()}
      <span class="tampon">{t('lineup.players', { count: filtered.length })}</span>
    {/snippet}
    <form class="filtres" onsubmit={(event) => event.preventDefault()} aria-label={t('market.filters')}>
      <label class="champ">
        <span class="tampon">{t('squad.col.position')}</span>
        <select bind:value={positionFilter} onchange={resetPaging}>
          <option value="all">{t('market.all')}</option>
          {#each POSITIONS as position (position)}<option value={position}>{POSITION_LABEL[position]}</option>{/each}
        </select>
      </label>
      <label class="champ">
        <span class="tampon">{t('squad.col.age')}</span>
        <select bind:value={ageFilter} onchange={resetPaging}>
          <option value="all">{t('market.all')}</option>
          {#each AGE_BANDS as band (band.id)}<option value={band.id}>{td(band.label)}</option>{/each}
        </select>
      </label>
      <label class="champ">
        <span class="tampon">{t('sheet.rarity')}</span>
        <select bind:value={rarityFilter} onchange={resetPaging}>
          <option value="all">{t('market.allFeminine')}</option>
          {#each RARITIES as rarity (rarity)}<option value={rarity}>{td(RARITY_LABEL[rarity])}</option>{/each}
        </select>
      </label>
      <label class="champ">
        <span class="tampon">{t('squad.sortBy')}</span>
        <select bind:value={sortKey} onchange={resetPaging}>
          {#each COLUMNS as column (column.key)}<option value={column.key}>{t(column.label)}</option>{/each}
        </select>
      </label>
      <label class="champ">
        <span class="tampon">{t('market.minOverall')}</span>
        <input type="number" min="1" max="99" inputmode="numeric" bind:value={minOverall} oninput={resetPaging} />
      </label>
      <label class="champ">
        <span class="tampon">{t('market.maxPrice')}</span>
        <input type="number" min="0" step="100" inputmode="numeric" bind:value={maxPrice} oninput={resetPaging} />
      </label>
    </form>

    {#if filtered.length === 0}
      <p class="vide">{t('market.nobody')}</p>
    {:else}
      <div class="defilant">
        <table class="tableau">
          <caption class="sr-only">{t('market.caption')}</caption>
          <thead>
            <tr>
              {#each COLUMNS as column (column.key)}
                <th scope="col" class:num={column.numeric} aria-sort={ariaSort(column.key)}>
                  <button class="tri" onclick={() => sortBy(column)}>
                    {t(column.label)}{#if sortKey === column.key}<span aria-hidden="true">{direction === 'asc' ? ' ▲' : ' ▼'}</span>{/if}
                  </button>
                </th>
              {/each}
              <th scope="col"><span class="sr-only">{t('market.action')}</span></th>
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
                <td class="num mono">{potentialLabel(listing.potential)}</td>
                <td><abbr title={listing.clubName}>{listing.club}</abbr></td>
                <td><RarityTag rarity={listing.rarity} text={listing.ability ?? '???'} /></td>
                <td class="num">{formatEuros(listing.price)}</td>
                <td class="num">{formatEuros(listing.salary)}</td>
                <td class="actions-ligne">
                  {#if !listing.scouted}
                    <Button
                      size="s"
                      variant="ghost"
                      disabled={transferWindow.reports === 0}
                      aria-label={t('market.scoutLabel', { name: listing.name })}
                      onclick={() => scout(listing.id)}
                    >
                      {t('market.scout')}
                    </Button>
                  {/if}
                  {#if listing.coachOwned}
                    {#if offerFor === listing.id}
                      <form class="offre-coach" onsubmit={(event) => sendOffer(event, listing.id)}>
                        <input type="number" min="1" step="1" bind:value={offerAmount} aria-label={t('market.offerAmount')} />
                        <Button size="s" type="submit">{t('market.send')}</Button>
                        <Button size="s" variant="ghost" onclick={() => (offerFor = null)}>{t('common.cancel')}</Button>
                      </form>
                    {:else}
                      <Button size="s" variant="ghost" disabled={!transferWindow.open || squadFull} onclick={() => openOffer(listing)}>
                        {listing.offerSent !== null ? t('market.offerSent', { amount: formatEuros(listing.offerSent) }) : t('market.makeOffer')}
                      </Button>
                    {/if}
                  {:else}
                    <Button
                      size="s"
                      disabled={!transferWindow.open || !affordable || squadFull}
                      aria-label={t('market.buyLabel', { name: listing.name, price: formatEuros(listing.price) })}
                      onclick={() => purchase(listing.id)}
                    >
                      {affordable ? t('market.buy') : t('market.tooExpensive')}
                    </Button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if visible.length < filtered.length}
        <div class="plus">
          <Button variant="ghost" size="s" onclick={() => (shown += PAGE_SIZE)}>
            {t('market.more', { count: Math.min(PAGE_SIZE, filtered.length - visible.length) })}
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
  .actions-ligne {
    white-space: nowrap;
  }
  .offre-coach {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    align-items: center;
  }
  .offre-coach input {
    width: 9ch;
    font: inherit;
    padding: 2px var(--space-1);
    border: var(--trait-fin) solid var(--encre);
    background: var(--craie);
    color: var(--encre);
  }
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
