<script lang="ts">
  import './parts/screens.css';
  import Card from '../kit/Card.svelte';
  import PresidentPanel from './parts/PresidentPanel.svelte';
  import { store } from '../store.svelte';

  /** Vie du club : président, sponsors et historique des saisons. */
  const history = $derived(store.select((game) => game.history.map((record) => ({ ...record }))));
</script>

<div class="ecran">
  <div class="colonnes">
    <Card title="Le président">
      <PresidentPanel speech />
    </Card>

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
</div>
