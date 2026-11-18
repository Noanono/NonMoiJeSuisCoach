<script lang="ts">
  import { t, td } from '../../i18n/t';
  import './parts/screens.css';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import PresidentPanel from './parts/PresidentPanel.svelte';
  import { store } from '../store.svelte';
  import { formatEuros } from '../format';
  import { FACILITIES, FACILITY_IDS, facilitiesOf, MAX_FACILITY_LEVEL, upgradeCost } from '../../domain/club/facilities';
  import { humanClub } from '../../domain/game';
  import type { FacilityId } from '../../domain/types';

  /** Vie du club : président, installations (CLUB-09), rival (UNIV-09) et historique des saisons. */
  const history = $derived(store.select((game) => game.history.map((record) => ({ ...record }))));

  const club = $derived(
    store.select((game) => {
      const own = humanClub(game);
      const levels = facilitiesOf(own);
      const rival = game.rivalId ? game.clubs[game.rivalId] : undefined;
      return {
        budget: own.budget,
        rival: rival?.name ?? null,
        facilities: FACILITY_IDS.map((id) => ({
          id,
          ...FACILITIES[id],
          level: levels[id],
          cost: upgradeCost(levels[id]),
        })),
      };
    }),
  );

  function upgrade(id: FacilityId): void {
    const result = store.command('upgradeFacility', id);
    store.notify(result.message);
  }
</script>

<div class="ecran">
  <div class="colonnes">
    <Card title={t('dashboard.president')}>
      <PresidentPanel speech />
      {#if club.rival}
        <p class="rival texte-s"><span class="tampon pastille-derby">{t('club.rival')}</span> {t('club.rivalBefore')}<span class="texte-fort">{club.rival}</span>{t('club.rivalAfter')}</p>
      {/if}
    </Card>

    <Card title={t('club.facilities')}>
      {#snippet actions()}
        <span class="tampon">{t('club.budget', { budget: formatEuros(club.budget) })}</span>
      {/snippet}
      <ul class="liste-nue installations">
        {#each club.facilities as facility (facility.id)}
          <li>
            <div class="titre">
              <span class="texte-fort">{td(facility.label)}</span>
              <span class="niveaux" aria-label={t('club.levelOf', { level: facility.level, max: MAX_FACILITY_LEVEL })}>
                {#each Array.from({ length: MAX_FACILITY_LEVEL }, (_, index) => index) as index (index)}
                  <span class="cran" class:plein={index < facility.level}></span>
                {/each}
              </span>
            </div>
            <p class="texte-s discret">{td(facility.description)}</p>
            <p class="texte-s">
              {#if facility.level > 0}<span class="bonus">{t('club.current', { effect: td(facility.effect(facility.level)) })}</span>{:else}<span class="discret">{t('club.notBuilt')}</span>{/if}
            </p>
            {#if facility.cost !== null}
              <div class="ligne-actions">
                <span class="texte-s">{t('club.nextLevel', { level: facility.level + 1, effect: td(facility.effect(facility.level + 1)) })}</span>
                <Button size="s" disabled={club.budget < facility.cost} onclick={() => upgrade(facility.id)}>
                  {t('club.upgrade', { cost: formatEuros(facility.cost) })}
                </Button>
              </div>
            {:else}
              <p class="tampon">{t('club.maxLevel')}</p>
            {/if}
          </li>
        {/each}
      </ul>
    </Card>
  </div>

  <Card title={t('club.history')}>
    {#if history.length === 0}
      <p class="vide">{t('club.historyEmpty')}</p>
    {:else}
      <div class="defilant">
        <table class="tableau">
          <caption class="sr-only">{t('club.historyCaption')}</caption>
          <thead>
            <tr>
              <th scope="col" class="num">{t('club.col.season')}</th>
              <th scope="col">{t('shell.tabs.club')}</th>
              <th scope="col">{t('club.col.division')}</th>
              <th scope="col" class="num">{t('club.col.position')}</th>
              <th scope="col" class="num">{t('club.col.cupRounds')}</th>
              <th scope="col" class="num">{t('club.col.prizes')}</th>
              <th scope="col">{t('club.col.verdict')}</th>
            </tr>
          </thead>
          <tbody>
            {#each history as record (record.season)}
              <tr>
                <td class="num">{record.season}</td>
                <td>{record.clubName ?? '–'}</td>
                <td>{td(record.divisionName)}</td>
                <td class="num">{t('common.rank', { position: record.position })}</td>
                <td class="num">{record.cupRoundsWon}</td>
                <td class="num">{record.prizeMoney === undefined ? '–' : formatEuros(record.prizeMoney)}</td>
                <td>{td(record.verdict)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</div>

<style>
  p {
    margin: 0;
  }
  .rival {
    margin-top: var(--space-4);
  }
  .pastille-derby {
    padding: 0 var(--space-1);
    background: var(--carton);
    color: var(--craie-fixe);
    border: var(--trait-fin) solid var(--encre-fixe);
  }
  .installations {
    gap: var(--space-4);
  }
  .installations li {
    display: grid;
    gap: var(--space-1);
    padding-bottom: var(--space-4);
    border-bottom: var(--trait-fin) solid var(--craie-2);
  }
  .titre {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
  }
  .niveaux {
    display: flex;
    gap: var(--space-1);
  }
  .cran {
    width: 18px;
    height: 10px;
    border: var(--trait-fin) solid var(--encre);
    background: var(--craie);
  }
  .cran.plein {
    background: var(--terrain);
  }
  .ligne-actions {
    justify-content: space-between;
    align-items: center;
  }
</style>
