<script lang="ts">
  import { t, td, type MessageKey } from '../../i18n/t';
  import './parts/screens.css';
  import Card from '../kit/Card.svelte';
  import { store } from '../store.svelte';
  import { humanDivision, seasonLeaders, type LeaderRow } from '../../domain/game';

  /** Statistiques de la saison (UNIV-08) : buteurs, passeurs, cartons, équipe type et palmarès. */
  const POSITION_LABEL: Record<'GK' | 'DEF' | 'MID' | 'ATT', MessageKey> = { GK: 'stats.pos.GK', DEF: 'stats.pos.DEF', MID: 'stats.pos.MID', ATT: 'stats.pos.ATT' };

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

  const boards: { id: string; title: MessageKey; unit: MessageKey; rows: () => LeaderRow[]; empty: MessageKey }[] = [
    { id: 'scorers', title: 'stats.scorers.title', unit: 'stats.scorers.unit', rows: () => leaders.scorers, empty: 'stats.scorers.empty' },
    { id: 'assisters', title: 'stats.assisters.title', unit: 'stats.assisters.unit', rows: () => leaders.assisters, empty: 'stats.assisters.empty' },
    { id: 'cards', title: 'stats.cards.title', unit: 'stats.cards.unit', rows: () => leaders.cards, empty: 'stats.cards.empty' },
  ];
</script>

<div class="ecran">
  <div class="entete">
    <label class="champ">
      <span class="tampon">{t('club.col.division')}</span>
      <select class="select" value={divisionId} onchange={(event) => (chosenDivisionId = event.currentTarget.value)}>
        {#each divisions.list as division (division.id)}
          <option value={division.id}>{td(division.name)}{division.id === divisions.humanId ? t('stats.yours') : ''}</option>
        {/each}
      </select>
    </label>
  </div>

  <div class="grille">
    {#each boards as board (board.id)}
      {@const rows = board.rows()}
      <Card title={t(board.title)}>
        {#if rows.length === 0}
          <p class="vide">{t(board.empty)}</p>
        {:else}
          <ol class="liste-nue classement">
            {#each rows as row, index (row.playerId)}
              <li class:surligne={row.isHuman}>
                <span class="mono rang">{index + 1}</span>
                <span class="nom">
                  <span class:texte-fort={row.isHuman}>{row.name}</span>
                  <span class="texte-s discret">{td(row.clubName)} · {td(row.detail)}</span>
                </span>
                <span class="mono texte-fort valeur">{row.value} <span class="texte-s discret">{t(board.unit)}</span></span>
              </li>
            {/each}
          </ol>
        {/if}
      </Card>
    {/each}

    <Card title={t('stats.team')}>
      {#if leaders.team.length === 0}
        <p class="vide">{t('stats.teamEmpty')}</p>
      {:else}
        <ol class="liste-nue classement">
          {#each leaders.team as row (row.playerId)}
            <li class:surligne={row.isHuman}>
              <span class="tampon rang">{t(POSITION_LABEL[row.position])}</span>
              <span class="nom">
                <span class:texte-fort={row.isHuman}>{row.name}</span>
                <span class="texte-s discret">{td(row.clubName)} · {td(row.detail)}</span>
              </span>
              <span class="mono texte-fort valeur">{row.value}</span>
            </li>
          {/each}
        </ol>
      {/if}
    </Card>
  </div>

  <Card title={t('stats.honours')}>
    {#if history.length === 0}
      <p class="vide">{t('stats.honoursEmpty')}</p>
    {:else}
      <ul class="liste-nue palmares">
        {#each history as record (record.season)}
          <li>
            <p class="texte-fort">{t('common.season', { season: record.season })} · {record.clubName ?? ''} {record.clubName ? '·' : ''} {t('stats.rankIn', { position: t('common.rank', { position: record.position }), division: td(record.divisionName) })}</p>
            <p class="texte-s">{td(record.verdict)}</p>
            {#each record.awards ?? [] as award (award)}
              <p class="texte-s discret">{td(award)}</p>
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
