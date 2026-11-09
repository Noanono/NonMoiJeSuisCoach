<script lang="ts">
  import Gauge from './kit/Gauge.svelte';
  import { store, type Screen } from './store.svelte';
  import { humanClub } from '../domain/game';
  import { formatEuros } from './format';
  import Dashboard from './screens/Dashboard.svelte';
  import Squad from './screens/Squad.svelte';
  import Tactics from './screens/Tactics.svelte';
  import Market from './screens/Market.svelte';
  import ClubScreen from './screens/ClubScreen.svelte';
  import Competitions from './screens/Competitions.svelte';

  const TABS: { screen: Screen; label: string }[] = [
    { screen: 'dashboard', label: 'Bureau' },
    { screen: 'squad', label: 'Effectif' },
    { screen: 'tactics', label: 'Tactique' },
    { screen: 'market', label: 'Mercato' },
    { screen: 'club', label: 'Club' },
    { screen: 'competitions', label: 'Compétitions' },
  ];

  const header = $derived(
    store.select((game) => ({
      club: humanClub(game).name,
      budget: humanClub(game).budget,
      confidence: game.outlook.presidentConfidence,
      season: game.season,
      week: game.week,
    })),
  );
</script>

<div class="shell">
  <header class="bandeau">
    <div class="ident">
      <h1 class="banderole-m">{header.club}</h1>
      <span class="tampon">Saison {header.season} · semaine {header.week}</span>
    </div>
    <dl class="jauges">
      <div>
        <dt class="tampon">Budget</dt>
        <dd class="chiffre">{formatEuros(header.budget)}</dd>
      </div>
      <div>
        <dt class="tampon">Président</dt>
        <dd><Gauge value={header.confidence} max={100} label="Confiance du président" tone={header.confidence < 30 ? 'carton' : 'victoire'} /></dd>
      </div>
    </dl>
    <button class="quitter tampon" onclick={() => store.quitToTitle()}>Quitter</button>
  </header>

  <nav aria-label="Écrans du club">
    {#each TABS as tab (tab.screen)}
      <button class="onglet tampon" class:actif={store.screen === tab.screen} aria-current={store.screen === tab.screen ? 'page' : undefined} onclick={() => store.go(tab.screen)}>
        {tab.label}
      </button>
    {/each}
  </nav>

  <main>
    {#if store.screen === 'dashboard'}<Dashboard />
    {:else if store.screen === 'squad'}<Squad />
    {:else if store.screen === 'tactics'}<Tactics />
    {:else if store.screen === 'market'}<Market />
    {:else if store.screen === 'club'}<ClubScreen />
    {:else if store.screen === 'competitions'}<Competitions />
    {/if}
  </main>
</div>

<style>
  .shell {
    display: grid;
    gap: var(--space-6);
    padding: var(--marge-page);
    max-width: 1280px;
    margin: 0 auto;
  }
  .bandeau {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    background: var(--craie);
    border: var(--trait-epais) solid var(--encre);
    box-shadow: var(--ombre-sticker);
    padding: var(--space-2) var(--space-4);
  }
  .ident {
    display: grid;
  }
  .jauges {
    display: flex;
    gap: var(--space-6);
    margin: 0;
  }
  .jauges div {
    display: grid;
    gap: var(--space-1);
  }
  dd {
    margin: 0;
  }
  .chiffre {
    font-family: var(--font-mono);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .quitter {
    background: none;
    border: var(--trait-fin) solid var(--encre);
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
  }
  nav {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .onglet {
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    padding: var(--space-2) var(--space-4);
    cursor: pointer;
  }
  .onglet.actif {
    background: var(--scotch);
    color: var(--encre-fixe);
    border-color: var(--encre-fixe);
    box-shadow: var(--ombre-sticker);
  }
</style>
