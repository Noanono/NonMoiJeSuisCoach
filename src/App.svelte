<script lang="ts">
  import Terrain from './ui/kit/Terrain.svelte';
  import TitleScreen from './ui/TitleScreen.svelte';
  import Shell from './ui/Shell.svelte';
  import MatchScreen from './ui/match/MatchScreen.svelte';
  import Toast from './ui/kit/Toast.svelte';
  import { store } from './ui/store.svelte';

  /** Lignes de craie sur les écrans de jeu, pelouse calme derrière la gestion (composant Terrain). */
  const lignes = $derived(store.screen === 'title' || store.screen === 'match' || store.screen === 'tactics');
</script>

<Terrain {lignes} graine={store.screen === 'match' ? 11 : 7} densite={lignes ? 0.5 : 0.35} />

{#if store.screen === 'title'}
  <TitleScreen />
{:else if store.screen === 'match'}
  <MatchScreen />
{:else}
  <Shell />
{/if}

<Toast />
