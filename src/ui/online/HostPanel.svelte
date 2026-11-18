<script lang="ts">
  import { t, td } from '../../i18n/t';
  /**
   * Héberger une ligue (MULTI-11 à MULTI-13) : ce navigateur devient le serveur. L'hôte choisit une de ses
   * 3 ligues, partage le code, l'ouvre au public s'il veut, et joue dedans comme les autres.
   */
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import { store } from '../store.svelte';
  import { peerHost } from '../net/peerHost.svelte';
  import { savedProfile } from '../net/identity';
  import { SERVER_NAME_MAX } from '../net/publicDirectory';
  import type { SlotInfo } from '../../server/hub';

  const host = peerHost;
  let confirmDelete = $state<number | null>(null);
  let confirmStop = $state(false);
  let feedback = $state<string | null>(null);
  let copied = $state<'code' | 'lien' | null>(null);
  let serverName = $state(host.serverName || t('host.defaultName', { name: savedProfile().name || t('host.theHost') }));
  let busy = $state(false);

  $effect(() => {
    void host.refreshSlots();
  });

  const online = $derived(host.status === 'online' && host.code !== null);
  const link = $derived(host.codeText ? `${location.origin}${location.pathname}#rejoindre=${encodeURIComponent(host.codeText)}` : '');

  async function run(action: () => Promise<unknown>): Promise<void> {
    busy = true;
    feedback = null;
    try {
      await action();
    } finally {
      busy = false;
    }
  }

  async function open(slot: number): Promise<void> {
    await run(async () => {
      const reply = await host.open(slot);
      feedback = reply.message ?? null;
    });
  }

  async function remove(slot: number): Promise<void> {
    confirmDelete = null;
    await run(async () => {
      const reply = await host.remove(slot);
      feedback = reply.message ?? null;
    });
  }

  async function copy(what: 'code' | 'lien'): Promise<void> {
    const value = what === 'code' ? host.codeText : link;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      copied = what;
      setTimeout(() => (copied = null), 2000);
    } catch {
      feedback = t('host.copyFailed');
    }
  }

  function togglePublic(event: Event): void {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    void host.setPublic(checked, serverName);
  }

  function renamePublic(): void {
    if (host.isPublic) void host.setPublic(true, serverName);
  }

  function giveCode(coachId: string): void {
    const reply = host.createClaimCode(coachId);
    feedback = reply.message ?? null;
  }

  function play(): void {
    store.openMultiplayer(() => host.loopback());
  }

  function leagueLine(league: NonNullable<SlotInfo['league']>): string {
    const when = league.phase === 'lobby' ? t('host.lobby') : t('host.seasonWeek', { season: league.season ?? '?', week: league.week ?? '?' });
    return `${when} · ${league.coaches.map((coach) => coach.name).join(', ') || t('host.noCoach')}`;
  }
</script>

{#if online && host.league}
  <div class="colonnes">
    <Card title={t('host.yourServer')} scotch>
      <p class="texte-s meta">{t('host.league', { slot: host.league.slot })} · {leagueLine(host.league)}</p>
      <p class="tampon">{t('host.codeToShare')}</p>
      <p class="code" data-testid="code-serveur">{host.codeText}</p>
      <div class="row">
        <Button size="s" variant="primary" onclick={() => copy('code')}>{copied === 'code' ? t('host.copied') : t('host.copyCode')}</Button>
        <Button size="s" onclick={() => copy('lien')}>{copied === 'lien' ? t('host.copied') : t('host.copyLink')}</Button>
      </div>
      <p class="texte-s meta">{t('host.shareHelp')}</p>

      <label class="public">
        <input type="checkbox" checked={host.isPublic} onchange={togglePublic} />
        <span class="texte-fort">{t('host.openPublic')}</span>
      </label>
      <label class="tampon" for="nom-serveur">{t('host.listedName')}</label>
      <input id="nom-serveur" bind:value={serverName} maxlength={SERVER_NAME_MAX} onchange={renamePublic} />
      <p class="texte-s meta">
        {host.isPublic ? t('host.isPublic') : t('host.isPrivate')}
      </p>

      <div class="row">
        <Button variant="primary" onclick={play}>{t('host.play')}</Button>
      </div>
      <p class="texte-s alerte">{t('host.keepTab')}</p>
    </Card>

    <Card title={t('host.coaches')}>
      <p class="texte-s meta">{t('host.peers', { count: host.peers })}</p>
      {#if host.league.coaches.length === 0}
        <p class="texte-s meta">{t('host.nobody')}</p>
      {:else}
        <ul class="liste">
          {#each host.league.coaches as coach (coach.id)}
            <li class="row">
              <span class="pastille" class:en-ligne={coach.online} aria-label={coach.online ? t('host.online') : t('shell.coach.offline')}></span>
              <span class="texte-s"><span class="texte-fort">{coach.name}</span> · {coach.clubName}</span>
              <Button size="s" variant="ghost" onclick={() => giveCode(coach.id)}>{t('host.claimCode')}</Button>
            </li>
          {/each}
        </ul>
        <p class="texte-s meta">{t('host.claimHelp')}</p>
      {/if}
      <div class="row">
        <Button size="s" variant="ghost" disabled={busy} onclick={() => run(() => host.renewCode())}>{t('host.newCode')}</Button>
        {#if confirmStop}
          <Button size="s" onclick={() => run(async () => { confirmStop = false; await host.stop(); })}>{t('host.confirmStop')}</Button>
          <Button size="s" variant="ghost" onclick={() => (confirmStop = false)}>{t('common.cancel')}</Button>
        {:else}
          <Button size="s" variant="ghost" onclick={() => (confirmStop = true)}>{t('host.stop')}</Button>
        {/if}
      </div>
      <p class="texte-s meta">{t('host.newCodeHelp')}</p>
    </Card>
  </div>
{:else}
  <Card title={t('title.host.title')}>
    <p class="texte-s meta">{t('host.intro')}</p>
    {#if host.status === 'starting'}
      <p class="texte-s texte-fort" role="status">{t('host.starting')}</p>
    {/if}
    <ul class="liste">
      {#each host.slots as entry (entry.slot)}
        <li>
          <p class="texte-fort">{t('host.league', { slot: entry.slot })}</p>
          {#if entry.status === 'ok' && entry.league}
            <p class="texte-s meta">{leagueLine(entry.league)}</p>
          {:else if entry.status === 'error'}
            <p class="texte-s erreur">{t('host.unreadable')}</p>
          {:else}
            <p class="texte-s meta">{t('host.emptySlot')}</p>
          {/if}
          <div class="row">
            {#if entry.status === 'empty'}
              <Button size="s" variant="primary" disabled={busy} onclick={() => open(entry.slot)}>{t('host.newLeague')}</Button>
            {:else if entry.status === 'ok'}
              <Button size="s" variant="primary" disabled={busy} onclick={() => open(entry.slot)}>{t('title.host.button')}</Button>
            {/if}
            {#if entry.status !== 'empty'}
              {#if confirmDelete === entry.slot}
                <Button size="s" onclick={() => remove(entry.slot)}>{t('common.confirm')}</Button>
                <Button size="s" variant="ghost" onclick={() => (confirmDelete = null)}>{t('common.cancel')}</Button>
              {:else}
                <Button size="s" variant="ghost" onclick={() => (confirmDelete = entry.slot)}>{t('common.delete')}</Button>
              {/if}
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  </Card>
{/if}
{#if host.error}<p class="texte-s erreur" role="alert">{td(host.error)}</p>{/if}
{#if feedback}<p class="texte-s texte-fort" role="status">{td(feedback)}</p>{/if}

<style>
  .colonnes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-6);
    align-items: start;
  }
  .code {
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.04em;
    word-break: break-all;
    user-select: all;
    padding: var(--space-2);
    border: var(--trait-epais) dashed var(--encre);
    background: var(--craie-2, var(--craie));
  }
  .public {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-4);
    cursor: pointer;
  }
  .liste {
    list-style: none;
    margin: var(--space-2) 0 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .liste li:not(.row) {
    padding: var(--space-2);
    border: var(--trait-fin) solid var(--encre-pale);
    border-radius: var(--radius-xs);
  }
  p {
    margin: var(--space-1) 0 0;
  }
  .tampon {
    margin-top: var(--space-4);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .meta {
    color: var(--encre-pale);
  }
  .alerte {
    margin-top: var(--space-4);
    font-weight: 700;
  }
  .erreur {
    color: var(--carton);
  }
  .pastille {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--encre-pale);
  }
  .pastille.en-ligne {
    background: var(--victoire);
  }
  input:not([type='checkbox']) {
    font: inherit;
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-1) var(--space-2);
    border: var(--trait-fin) solid var(--encre);
    border-radius: var(--radius-xs);
    background: var(--craie);
    color: var(--encre);
  }
</style>
