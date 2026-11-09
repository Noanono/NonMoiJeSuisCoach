<script lang="ts">
  import './parts/screens.css';
  import Card from '../kit/Card.svelte';
  import DeltaBadge from '../kit/DeltaBadge.svelte';
  import PlayerAvatar from '../kit/PlayerAvatar.svelte';
  import RarityTag from '../kit/RarityTag.svelte';
  import RatingBadge from '../kit/RatingBadge.svelte';
  import type { AvatarPlayer } from '../kit/avatar';
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
  const RARITY_ORDER: Record<Rarity, number> = { common: 1, rare: 2, legendary: 3, mythic: 4 };
  const UNKNOWN_ABILITY = '???';

  interface SquadRow {
    id: string;
    name: string;
    position: string;
    positionLabel: string;
    positionOrder: number;
    age: number;
    overall: number;
    evolution: number;
    fatigue: number;
    availability: string | null;
    avatar: AvatarPlayer;
    abilityName: string;
    rarity: string;
    rarityKey: Rarity | null;
    rarityOrder: number;
    value: number;
  }

  type SortKey = 'name' | 'position' | 'age' | 'overall' | 'evolution' | 'fatigue' | 'availability' | 'ability' | 'value';

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
    { key: 'evolution', label: 'Évol.', numeric: true, sortValue: (row) => row.evolution, firstDirection: 'desc' },
    { key: 'fatigue', label: 'Fatigue', numeric: true, sortValue: (row) => row.fatigue, firstDirection: 'desc' },
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
          evolution: overall(player) - player.overallAtSeasonStart,
          fatigue: player.fatigue,
          availability: availabilityLabel(player),
          avatar: { id: player.id, age: player.age, clubId: player.clubId, position: player.position },
          abilityName: known ? ability.name : UNKNOWN_ABILITY,
          rarity: known ? RARITY_LABEL[ability.rarity] : '',
          rarityKey: known ? ability.rarity : null,
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
    <div class="tri-barre">
      <label class="champ">
        <span class="tampon">Trier par</span>
        <select bind:value={sortKey}>
          {#each COLUMNS as column (column.key)}<option value={column.key}>{column.label}</option>{/each}
        </select>
      </label>
      <button type="button" class="sens tampon" onclick={() => (direction = direction === 'asc' ? 'desc' : 'asc')}>{direction === 'asc' ? 'Croissant' : 'Décroissant'}</button>
    </div>
    <div class="defilant">
      <table class="tableau">
        <caption class="texte-s discret">Clique sur un nom pour ouvrir sa fiche. Évol. : points gagnés ou perdus depuis le début de la saison.</caption>
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
              <td><span class="identite"><PlayerAvatar player={row.avatar} size={32} /><button class="lien" onclick={() => (openPlayerId = row.id)}>{row.name}</button></span></td>
              <td><abbr title={row.positionLabel}>{row.position}</abbr></td>
              <td class="num">{row.age}</td>
              <td class="num"><RatingBadge value={row.overall} size="s" /></td>
              <td class="num"><DeltaBadge value={row.evolution} /></td>
              <td class="num">{row.fatigue}</td>
              <td>
                {#if row.availability}<span class="malus">{row.availability}</span>{:else}<span class="discret">Apte</span>{/if}
              </td>
              <td>
                <RarityTag rarity={row.rarityKey} text={row.rarity ? `${row.abilityName} · ${row.rarity}` : row.abilityName} />
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
  .tri-barre {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
  .sens {
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-fin) solid var(--encre);
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
  }
  .identite {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
</style>
