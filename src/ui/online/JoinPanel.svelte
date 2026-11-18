<script lang="ts">
  import { t, td } from '../../i18n/t';
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
  import { PeerTransport } from '../net/peerTransport';
  import { formatCode, parseCode } from '../net/serverCode';
  import type { PublicServer } from '../net/publicDirectory';

  let { initialCode = '' }: { initialCode?: string } = $props();

  // svelte-ignore state_referenced_locally
  let code = $state(initialCode);
  let error = $state<string | null>(null);
  const watcher = new DirectoryWatcher();
  void watcher.start();
  onDestroy(() => watcher.stop());

  function join(raw: string): void {
    const parsed = parseCode(raw);
    if (!parsed) {
      error = t('join.badCode');
      return;
    }
    error = null;
    store.openMultiplayer(() => new PeerTransport(parsed), formatCode(parsed));
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    join(code);
  }

  function line(server: PublicServer): string {
    const when = server.phase === 'lobby' ? t('host.lobby') : t('host.seasonWeek', { season: server.season ?? '?', week: server.week ?? '?' });
    return `${t('join.coaches', { count: server.coaches, max: server.max })} · ${when}`;
  }
</script>

<Card title={t('title.join.title')}>
  <form onsubmit={submit}>
    <label class="tampon" for="code-serveur">{t('join.code')}</label>
    <input id="code-serveur" bind:value={code} placeholder="ABCD-EFGH-JKMN-PQRS.…" autocomplete="off" spellcheck="false" />
    <div class="row">
      <Button variant="primary" type="submit" disabled={code.trim().length === 0}>{t('title.join.button')}</Button>
    </div>
  </form>
  {#if error}<p class="texte-s erreur" role="alert">{td(error)}</p>{/if}
  <p class="texte-s meta">{t('join.help')}</p>
</Card>

<Card title={t('join.publicServers')}>
  {#if watcher.status === 'error'}
    <p class="texte-s erreur">{t('join.directoryDown')}</p>
  {:else if watcher.servers.length === 0}
    <p class="texte-s meta">{watcher.status === 'searching' ? t('join.searching') : t('join.none')}</p>
  {:else}
    <ul class="liste">
      {#each watcher.servers as server (server.code)}
        {@const compatible = server.version === GAME_VERSION}
        {@const full = server.coaches >= server.max && server.phase === 'lobby'}
        <li class:grise={!compatible}>
          <div>
            <p class="texte-fort">{server.name} {#if server.phase === 'lobby'}<Sticker>{t('host.lobby')}</Sticker>{/if}</p>
            <p class="texte-s meta">{server.hostName ? `${t('join.host', { name: server.hostName })} · ` : ''}{line(server)}</p>
          </div>
          <Button size="s" variant="primary" disabled={!compatible || full} onclick={() => join(server.code)}>
            {!compatible ? t('join.otherVersion') : full ? t('join.full') : t('title.join.button')}
          </Button>
        </li>
      {/each}
    </ul>
  {/if}
  <p class="texte-s meta">{t('join.listHelp')}</p>
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
