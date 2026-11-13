<script lang="ts">
  import Gauge from './kit/Gauge.svelte';
  import RatingBadge from './kit/RatingBadge.svelte';
  import { store, type Screen } from './store.svelte';
  import { humanClub, teamRating } from '../domain/game';
  import { formatEuros } from './format';
  import Dashboard from './screens/Dashboard.svelte';
  import Squad from './screens/Squad.svelte';
  import Tactics from './screens/Tactics.svelte';
  import Market from './screens/Market.svelte';
  import Training from './screens/Training.svelte';
  import ClubScreen from './screens/ClubScreen.svelte';
  import Competitions from './screens/Competitions.svelte';
  import Stats from './screens/Stats.svelte';

  const TABS: { screen: Screen; label: string }[] = [
    { screen: 'dashboard', label: 'Bureau' },
    { screen: 'squad', label: 'Effectif' },
    { screen: 'tactics', label: 'Tactique' },
    { screen: 'training', label: 'Entraînement' },
    { screen: 'market', label: 'Mercato' },
    { screen: 'club', label: 'Club' },
    { screen: 'competitions', label: 'Compétitions' },
    { screen: 'stats', label: 'Statistiques' },
  ];

  /** Licencié : plus d'accès aux écrans du club, seul le Bureau (et son écran de fin) reste. */
  const fired = $derived(store.select((game) => game.status === 'fired'));
  $effect(() => {
    if (fired && store.screen !== 'dashboard') store.go('dashboard');
  });

  const header = $derived(
    store.select((game) => ({
      club: humanClub(game).name,
      budget: humanClub(game).budget,
      rating: teamRating(game),
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
      {#if header.rating !== null}
        <div>
          <dt class="tampon">Général équipe</dt>
          <dd><RatingBadge value={header.rating} size="l" /></dd>
        </div>
      {/if}
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

  {#if !fired}
  <nav aria-label="Écrans du club">
    {#each TABS as tab (tab.screen)}
      <button class="onglet tampon" class:actif={store.screen === tab.screen} aria-current={store.screen === tab.screen ? 'page' : undefined} onclick={() => store.go(tab.screen)}>
        {tab.label}
      </button>
    {/each}
  </nav>
  {/if}

  {#if store.multi}
  <section class="ligue" aria-label="Coachs de la ligue">
    <span class="tampon">Ligue</span>
    {#each store.multi.coaches as coach (coach.id)}
      <span class="coach texte-s" class:pret={coach.ready} class:absent={!coach.online} title={coach.waitingFor ?? ''}>
        <span class="texte-fort">{coach.name}</span>
        {coach.ready ? '· prêt' : !coach.online ? '· hors ligne' : coach.waitingFor ? '· ' + coach.waitingFor : '· en réflexion'}
      </span>
    {/each}
  </section>
  {/if}

  <main>
    {#if store.screen === 'dashboard'}<Dashboard />
    {:else if store.screen === 'squad'}<Squad />
    {:else if store.screen === 'tactics'}<Tactics />
    {:else if store.screen === 'training'}<Training />
    {:else if store.screen === 'market'}<Market />
    {:else if store.screen === 'club'}<ClubScreen />
    {:else if store.screen === 'competitions'}<Competitions />
    {:else if store.screen === 'stats'}<Stats />
    {/if}
  </main>
</div>

<style>
  .ligue {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }
  .coach {
    padding: var(--space-1) var(--space-2);
    border: var(--trait-fin) solid var(--encre);
    border-radius: var(--radius-pill);
    background: var(--craie);
  }
  .coach.pret {
    background: var(--victoire);
    color: var(--craie-fixe);
  }
  .coach.absent {
    opacity: 0.6;
  }
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
