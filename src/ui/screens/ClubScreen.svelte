<script lang="ts">
  import './parts/screens.css';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import PresidentPanel from './parts/PresidentPanel.svelte';
  import { store } from '../store.svelte';
  import { formatEuros } from '../format';
  import { FACILITIES, FACILITY_IDS, facilitiesOf, MAX_FACILITY_LEVEL, upgradeCost } from '../../domain/club/facilities';
  import { humanClub, upgradeFacility } from '../../domain/game';
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
    const result = store.run((game) => upgradeFacility(game, id));
    store.notify(result.message);
  }
</script>

<div class="ecran">
  <div class="colonnes">
    <Card title="Le président">
      <PresidentPanel speech />
      {#if club.rival}
        <p class="rival texte-s"><span class="tampon pastille-derby">Rival</span> Cette saison, l'ennemi juré s'appelle <span class="texte-fort">{club.rival}</span>. Les derbys comptent double pour le président et les sponsors.</p>
      {/if}
    </Card>

    <Card title="Installations">
      {#snippet actions()}
        <span class="tampon">Budget {formatEuros(club.budget)}</span>
      {/snippet}
      <ul class="liste-nue installations">
        {#each club.facilities as facility (facility.id)}
          <li>
            <div class="titre">
              <span class="texte-fort">{facility.label}</span>
              <span class="niveaux" aria-label={`Niveau ${facility.level} sur ${MAX_FACILITY_LEVEL}`}>
                {#each Array.from({ length: MAX_FACILITY_LEVEL }, (_, index) => index) as index (index)}
                  <span class="cran" class:plein={index < facility.level}></span>
                {/each}
              </span>
            </div>
            <p class="texte-s discret">{facility.description}</p>
            <p class="texte-s">
              {#if facility.level > 0}<span class="bonus">Actuel : {facility.effect(facility.level)}</span>{:else}<span class="discret">Pas encore construit.</span>{/if}
            </p>
            {#if facility.cost !== null}
              <div class="ligne-actions">
                <span class="texte-s">Niveau {facility.level + 1} : {facility.effect(facility.level + 1)}</span>
                <Button size="s" disabled={club.budget < facility.cost} onclick={() => upgrade(facility.id)}>
                  Améliorer · {formatEuros(facility.cost)}
                </Button>
              </div>
            {:else}
              <p class="tampon">Niveau maximum</p>
            {/if}
          </li>
        {/each}
      </ul>
    </Card>
  </div>

  <Card title="Historique">
    {#if history.length === 0}
      <p class="vide">Première saison en cours : rien d'écrit pour l'instant.</p>
    {:else}
      <div class="defilant">
        <table class="tableau">
          <caption class="sr-only">Bilan des saisons précédentes</caption>
          <thead>
            <tr>
              <th scope="col" class="num">Saison</th>
              <th scope="col">Club</th>
              <th scope="col">Division</th>
              <th scope="col" class="num">Place</th>
              <th scope="col" class="num">Tours de coupe</th>
              <th scope="col">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {#each history as record (record.season)}
              <tr>
                <td class="num">{record.season}</td>
                <td>{record.clubName ?? '–'}</td>
                <td>{record.divisionName}</td>
                <td class="num">{record.position}e</td>
                <td class="num">{record.cupRoundsWon}</td>
                <td>{record.verdict}</td>
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
