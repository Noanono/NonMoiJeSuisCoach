<script lang="ts">
  import './parts/screens.css';
  import Card from '../kit/Card.svelte';
  import { store } from '../store.svelte';
  import { humanDivision, seasonLeaders, type LeaderRow } from '../../domain/game';

  /** Statistiques de la saison (UNIV-08) : buteurs, passeurs, cartons, équipe type et palmarès. */
  const POSITION_LABEL = { GK: 'G', DEF: 'DEF', MID: 'MIL', ATT: 'ATT' } as const;

  const divisions = $derived(
    store.select((game) => ({
      list: [...game.divisions].sort((a, b) => a.tier - b.tier).map((division) => ({ id: division.id, name: division.name })),
      humanId: humanDivision(game).id,
    })),
  );

  let chosenDivisionId = $state<string | null>(null);
  const divisionId = $derived(
    chosenDivisionId && divisions.list.some((division) => division.id === chosenDivisionId) ? chosenDivisionId : divisions.humanId,
  );

  const leaders = $derived(store.select((game) => seasonLeaders(game, divisionId)));
  const history = $derived(store.select((game) => [...game.history].reverse()));

  const boards: { title: string; unit: string; rows: () => LeaderRow[]; empty: string }[] = [
    { title: 'Buteurs', unit: 'buts', rows: () => leaders.scorers, empty: 'Personne n’a encore marqué. Les gardiens sont en forme.' },
    { title: 'Passeurs', unit: 'passes', rows: () => leaders.assisters, empty: 'Aucune passe décisive. Tout le monde joue perso.' },
    { title: 'Cartons', unit: 'pts', rows: () => leaders.cards, empty: 'Aucun carton. L’arbitre a oublié son sifflet ?' },
  ];
</script>

<div class="ecran">
  <div class="entete">
    <label class="champ">
      <span class="tampon">Division</span>
      <select class="select" value={divisionId} onchange={(event) => (chosenDivisionId = event.currentTarget.value)}>
        {#each divisions.list as division (division.id)}
          <option value={division.id}>{division.name}{division.id === divisions.humanId ? ' (la tienne)' : ''}</option>
        {/each}
      </select>
    </label>
  </div>

  <div class="grille">
    {#each boards as board (board.title)}
      {@const rows = board.rows()}
      <Card title={board.title}>
        {#if rows.length === 0}
          <p class="vide">{board.empty}</p>
        {:else}
          <ol class="liste-nue classement">
            {#each rows as row, index (row.playerId)}
              <li class:surligne={row.isHuman}>
                <span class="mono rang">{index + 1}</span>
                <span class="nom">
                  <span class:texte-fort={row.isHuman}>{row.name}</span>
                  <span class="texte-s discret">{row.clubName} · {row.detail}</span>
                </span>
                <span class="mono texte-fort valeur">{row.value} <span class="texte-s discret">{board.unit}</span></span>
              </li>
            {/each}
          </ol>
        {/if}
      </Card>
    {/each}

    <Card title="Équipe type">
      {#if leaders.team.length === 0}
        <p class="vide">Pas encore assez de matchs pour désigner les meilleurs.</p>
      {:else}
        <ol class="liste-nue classement">
          {#each leaders.team as row (row.playerId)}
            <li class:surligne={row.isHuman}>
              <span class="tampon rang">{POSITION_LABEL[row.position]}</span>
              <span class="nom">
                <span class:texte-fort={row.isHuman}>{row.name}</span>
                <span class="texte-s discret">{row.clubName} · {row.detail}</span>
              </span>
              <span class="mono texte-fort valeur">{row.value}</span>
            </li>
          {/each}
        </ol>
      {/if}
    </Card>
  </div>

  <Card title="Palmarès du coach">
    {#if history.length === 0}
      <p class="vide">Première saison : le palmarès est encore vierge. Comme l’armoire à trophées.</p>
    {:else}
      <ul class="liste-nue palmares">
        {#each history as record (record.season)}
          <li>
            <p class="texte-fort">Saison {record.season} · {record.clubName ?? ''} {record.clubName ? '·' : ''} {record.position}e de {record.divisionName}</p>
            <p class="texte-s">{record.verdict}</p>
            {#each record.awards ?? [] as award (award)}
              <p class="texte-s discret">{award}</p>
            {/each}
          </li>
        {/each}
      </ul>
    {/if}
  </Card>
</div>

<style>
  p {
    margin: 0;
  }
  .entete {
    display: flex;
    justify-content: flex-end;
  }
  .grille {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
    gap: var(--space-6);
  }
  .classement li {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-bottom: var(--trait-fin) solid var(--craie-2);
  }
  .classement li.surligne {
    background: var(--scotch);
    color: var(--encre-fixe);
  }
  .rang {
    text-align: center;
  }
  .nom {
    display: grid;
    min-width: 0;
  }
  .nom > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .valeur {
    text-align: right;
  }
  .palmares {
    gap: var(--space-4);
  }
  .palmares li {
    display: grid;
    gap: var(--space-1);
    padding-bottom: var(--space-2);
    border-bottom: var(--trait-fin) solid var(--craie-2);
  }
</style>
