<script lang="ts">
  import './parts/screens.css';
  import Card from '../kit/Card.svelte';
  import PlayerSheet from './parts/PlayerSheet.svelte';
  import { store } from '../store.svelte';
  import { formatEuros } from '../format';
  import { getAbility } from '../../domain/abilities/catalog';
  import { RARITY_LABEL } from '../../domain/abilities/progression';
  import { wageBill } from '../../domain/club/finance';
  import { playerValue } from '../../domain/club/valuation';
  import { humanSquad } from '../../domain/game';
  import { overall } from '../../domain/player/rating';
  import type { Rarity } from '../../domain/types';
  import { availabilityLabel, fullName, POSITION_LABEL, POSITION_ORDER, POSITION_SHORT } from './describe';
  import { sortRows, type SortDirection } from './views';

  /** Tableau de l'effectif (EFF-01 à EFF-08, CLUB-08) et accès à la fiche joueur. */
  const RARITY_ORDER: Record<Rarity, number> = { common: 1, rare: 2, legendary: 3 };
  const UNKNOWN_ABILITY = '???';

  interface SquadRow {
    id: string;
    name: string;
    position: string;
    positionLabel: string;
    positionOrder: number;
    age: number;
    overall: number;
    fatigue: number;
    morale: number;
    availability: string | null;
    transferRequested: boolean;
    abilityName: string;
    rarity: string;
    rarityOrder: number;
    value: number;
  }

  type SortKey = 'name' | 'position' | 'age' | 'overall' | 'fatigue' | 'morale' | 'availability' | 'ability' | 'value';

  interface Column {
    key: SortKey;
    label: string;
    numeric: boolean;
    sortValue: (row: SquadRow) => number | string;
    /** Premier tri proposé au clic sur la colonne. */
    firstDirection: SortDirection;
  }

  const COLUMNS: Column[] = [
    { key: 'name', label: 'Nom', numeric: false, sortValue: (row) => row.name, firstDirection: 'asc' },
    { key: 'position', label: 'Poste', numeric: false, sortValue: (row) => row.positionOrder * 100 - row.overall, firstDirection: 'asc' },
    { key: 'age', label: 'Âge', numeric: true, sortValue: (row) => row.age, firstDirection: 'asc' },
    { key: 'overall', label: 'Note', numeric: true, sortValue: (row) => row.overall, firstDirection: 'desc' },
    { key: 'fatigue', label: 'Fatigue', numeric: true, sortValue: (row) => row.fatigue, firstDirection: 'desc' },
    { key: 'morale', label: 'Moral', numeric: true, sortValue: (row) => row.morale, firstDirection: 'asc' },
    { key: 'availability', label: 'Dispo', numeric: false, sortValue: (row) => row.availability ?? '', firstDirection: 'desc' },
    { key: 'ability', label: 'Capacité', numeric: false, sortValue: (row) => row.rarityOrder * 1000 - row.overall, firstDirection: 'desc' },
    { key: 'value', label: 'Valeur', numeric: true, sortValue: (row) => row.value, firstDirection: 'desc' },
  ];

  const squad = $derived(
    store.select((game) => {
      const players = humanSquad(game);
      const rows = players.map((player): SquadRow => {
        const ability = getAbility(player.ability.abilityId);
        const known = player.ability.revealed;
        return {
          id: player.id,
          name: fullName(player),
          position: POSITION_SHORT[player.position],
          positionLabel: POSITION_LABEL[player.position],
          positionOrder: POSITION_ORDER[player.position],
          age: player.age,
          overall: overall(player),
          fatigue: player.fatigue,
          morale: player.morale,
          availability: availabilityLabel(player),
          transferRequested: player.transferRequested,
          abilityName: known ? ability.name : UNKNOWN_ABILITY,
          rarity: known ? RARITY_LABEL[ability.rarity] : '',
          rarityOrder: known ? RARITY_ORDER[ability.rarity] : 0,
          value: playerValue(player, ability.rarity),
        };
      });
      return { rows, wages: wageBill(players) };
    }),
  );

  let sortKey = $state<SortKey>('position');
  let direction = $state<SortDirection>('asc');
  let openPlayerId = $state<string | null>(null);

  const sortedRows = $derived(sortRows(squad.rows, COLUMNS.find((column) => column.key === sortKey)!.sortValue, direction));

  function sortBy(column: Column): void {
    if (sortKey === column.key) {
      direction = direction === 'asc' ? 'desc' : 'asc';
      return;
    }
    sortKey = column.key;
    direction = column.firstDirection;
  }

  function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (sortKey !== key) return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
  }
</script>

<div class="ecran">
  <Card title="Effectif">
    {#snippet actions()}
      <span class="tampon">{squad.rows.length} joueurs · salaires {formatEuros(squad.wages)} / sem.</span>
    {/snippet}
    <div class="defilant">
      <table class="tableau">
        <caption class="texte-s discret">Clique sur un nom pour ouvrir sa fiche. Clique sur un en-tête pour trier.</caption>
        <thead>
          <tr>
            {#each COLUMNS as column (column.key)}
              <th scope="col" class:num={column.numeric} aria-sort={ariaSort(column.key)}>
                <button class="tri" onclick={() => sortBy(column)}>
                  {column.label}{#if sortKey === column.key}<span aria-hidden="true">{direction === 'asc' ? ' ▲' : ' ▼'}</span>{/if}
                </button>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each sortedRows as row (row.id)}
            <tr>
              <td><button class="lien" onclick={() => (openPlayerId = row.id)}>{row.name}</button></td>
              <td><abbr title={row.positionLabel}>{row.position}</abbr></td>
              <td class="num">{row.age}</td>
              <td class="num texte-fort">{row.overall}</td>
              <td class="num">{row.fatigue}</td>
              <td class="num">{row.morale}</td>
              <td>
                {#if row.availability}<span class="malus">{row.availability}</span>{:else}<span class="discret">Apte</span>{/if}
                {#if row.transferRequested}<span class="malus"> · veut partir</span>{/if}
              </td>
              <td>
                {row.abilityName}
                {#if row.rarity}<span class="discret"> · {row.rarity}</span>{/if}
              </td>
              <td class="num">{formatEuros(row.value)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>
</div>

{#if openPlayerId}
  <PlayerSheet playerId={openPlayerId} onclose={() => (openPlayerId = null)} />
{/if}

<style>
  abbr {
    text-decoration: none;
  }
</style>
