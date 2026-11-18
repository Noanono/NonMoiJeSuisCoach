<script lang="ts">
  /**
   * Rejoindre une ligue (MULTI-12, MULTI-13) : par le code que l'hôte a donné (serveur privé ou public),
   * ou depuis la liste des serveurs publics juste en dessous.
   */
  import { onDestroy } from 'svelte';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import Sticker from '../kit/Sticker.svelte';
  import { store } from '../store.svelte';
  import { GAME_VERSION } from '../../domain/game';
  import { DirectoryWatcher } from '../net/directory.svelte';
  import type { PublicServer } from '../net/publicDirectory';

  let { initialCode = '' }: { initialCode?: string } = $props();

  // svelte-ignore state_referenced_locally
  let code = $state(initialCode);
  let error = $state<string | null>(null);
  const watcher = new DirectoryWatcher();
  void watcher.start();
  onDestroy(() => watcher.stop());

  function join(raw: string): void {
    error = store.joinServer(raw) ? null : 'Code incomplet ou mal copié : il ressemble à « ABCD-EFGH-JKMN-PQRS.xxxxxxxxxxxxxxxxxxxxxx ».';
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    join(code);
  }

  function line(server: PublicServer): string {
    const when = server.phase === 'lobby' ? 'salle d’attente' : `saison ${server.season ?? '?'}, semaine ${server.week ?? '?'}`;
    return `${server.coaches}/${server.max} coachs · ${when}`;
  }
</script>

<Card title="Rejoindre une partie">
  <form onsubmit={submit}>
    <label class="tampon" for="code-serveur">Code du serveur</label>
    <input id="code-serveur" bind:value={code} placeholder="ABCD-EFGH-JKMN-PQRS.…" autocomplete="off" spellcheck="false" />
    <div class="row">
      <Button variant="primary" type="submit" disabled={code.trim().length === 0}>Rejoindre</Button>
    </div>
  </form>
  {#if error}<p class="texte-s erreur" role="alert">{error}</p>{/if}
  <p class="texte-s meta">Privé ou public, un serveur se rejoint avec son code. Ta ligue avance quand tout le monde est prêt.</p>
</Card>

<Card title="Serveurs publics">
  {#if watcher.status === 'error'}
    <p class="texte-s erreur">Annuaire injoignable. Un code marche toujours.</p>
  {:else if watcher.servers.length === 0}
    <p class="texte-s meta">{watcher.status === 'searching' ? 'On regarde qui joue…' : 'Aucun serveur public pour l’instant. Héberge le tien !'}</p>
  {:else}
    <ul class="liste">
      {#each watcher.servers as server (server.code)}
        {@const compatible = server.version === GAME_VERSION}
        {@const full = server.coaches >= server.max && server.phase === 'lobby'}
        <li class:grise={!compatible}>
          <div>
            <p class="texte-fort">{server.name} {#if server.phase === 'lobby'}<Sticker>salle d'attente</Sticker>{/if}</p>
            <p class="texte-s meta">{server.hostName ? `Hôte : ${server.hostName} · ` : ''}{line(server)}</p>
          </div>
          <Button size="s" variant="primary" disabled={!compatible || full} onclick={() => join(server.code)}>
            {!compatible ? 'Autre version' : full ? 'Complet' : 'Rejoindre'}
          </Button>
        </li>
      {/each}
    </ul>
  {/if}
  <p class="texte-s meta">La liste se met à jour toute seule. Un serveur dont l'hôte a fermé l'onglet disparaît en moins d'une minute.</p>
</Card>

<style>
  form {
    display: grid;
    gap: var(--space-2);
  }
  input {
    font-family: var(--font-mono);
    font-size: 15px;
    padding: var(--space-2);
    border: var(--trait-fin) solid var(--encre);
    border-radius: var(--radius-xs);
    background: var(--craie);
    color: var(--encre);
  }
  .liste {
    list-style: none;
    margin: var(--space-2) 0 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .liste li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-2);
    border: var(--trait-fin) solid var(--encre-pale);
    border-radius: var(--radius-xs);
  }
  .liste li.grise {
    opacity: 0.55;
  }
  p {
    margin: var(--space-1) 0 0;
  }
  .row {
    display: flex;
    gap: var(--space-2);
  }
  .meta {
    color: var(--encre-pale);
  }
  .erreur {
    color: var(--carton);
  }
</style>
