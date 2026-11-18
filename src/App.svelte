<script lang="ts">
  import Terrain from './ui/kit/Terrain.svelte';
  import TitleScreen from './ui/TitleScreen.svelte';
  import Shell from './ui/Shell.svelte';
  import MatchScreen from './ui/match/MatchScreen.svelte';
  import MultiLobby from './ui/MultiLobby.svelte';
  import Toast from './ui/kit/Toast.svelte';
  import { onMount } from 'svelte';
  import { store } from './ui/store.svelte';
  import { peerHost } from './ui/net/peerHost.svelte';
  import { crazyGames } from './ui/platform/crazygames.svelte';
  import { MAX_COACHES } from './domain/game/multiplayer';

  onMount(() => {
    // Invitation d'un ami, au lancement ou en pleine partie : on file dans sa ligue, sans écran de plus (PLAT-05).
    crazyGames.onInvite((code) => {
      if (!store.joinServer(code)) store.notify('Invitation illisible : demande le code du serveur à ton ami.');
    });
    if (crazyGames.instantMultiplayer && store.screen === 'title') {
      void store.startInstantLeague().then((started) => {
        if (!started) store.notify('Tes 3 ligues sont prises : choisis-en une à héberger, ou libère un emplacement.');
      });
    }
  });

  /** Ligue où se trouve le joueur, annoncée à CrazyGames pour les boutons « Inviter » et « Rejoindre » (PLAT-05). */
  const room = $derived.by(() => {
    const client = store.multi;
    const hosting = peerHost.status === 'online' ? peerHost.codeText : null;
    const code = client ? (store.serverCode ?? hosting) : hosting;
    if (!code) return null;
    const coaches = client ? client.coaches.length : (peerHost.league?.coaches.length ?? 0);
    return { code, joinable: coaches < MAX_COACHES };
  });
  $effect(() => crazyGames.setRoom(room));

  /** Lignes de craie sur les écrans de jeu, pelouse calme derrière la gestion (composant Terrain). */
  const lignes = $derived(store.screen === 'title' || store.screen === 'lobby' || store.screen === 'match' || store.screen === 'tactics');
</script>

<Terrain {lignes} graine={store.screen === 'match' ? 11 : 7} densite={lignes ? 0.5 : 0.35} />

{#if store.screen === 'title'}
  <TitleScreen />
{:else if store.screen === 'lobby'}
  <MultiLobby />
{:else if store.screen === 'match'}
  <MatchScreen />
{:else}
  <Shell />
{/if}

<Toast />
