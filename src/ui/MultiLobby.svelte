<script lang="ts">
  import { t, td, type MessageKey } from '../i18n/t';
  import LangSwitch from './kit/LangSwitch.svelte';
  import Button from './kit/Button.svelte';
  import Card from './kit/Card.svelte';
  import Sticker from './kit/Sticker.svelte';
  import { store } from './store.svelte';
  import { savedProfile } from './multiClient.svelte';
  import { peerHost } from './net/peerHost.svelte';

  /**
   * Salle d'attente de la ligue entre amis (MULTI-02, MULTI-03) : chacun crée son club, puis l'un d'eux
   * lance la ligue avec les coachs connectés. Ligue déjà lancée : on la rejoint avec le club IA le plus faible.
   */
  const client = $derived(store.multi);
  const profile = savedProfile();
  let name = $state(profile.name);
  let clubName = $state(profile.clubName);
  let feedback = $state<string | null>(null);
  let busy = $state(false);

  const me = $derived(client?.me);
  const online = $derived(client?.coaches.filter((coach) => coach.online) ?? []);
  const playing = $derived(client?.phase === 'playing');

  async function join(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!client) return;
    busy = true;
    const reply = await client.join({ name, clubName });
    busy = false;
    feedback = reply.ok ? (playing ? t('lobby.welcome') : t('lobby.registered')) : (reply.message ?? t('lobby.refused'));
  }

  async function start(): Promise<void> {
    if (!client) return;
    busy = true;
    const reply = await client.start();
    busy = false;
    if (!reply.ok) feedback = reply.message ?? t('lobby.cannotStart');
  }

  /** Code à partager : celui de l'hôte s'il joue dans sa propre ligue, sinon celui du serveur rejoint. */
  const shareCode = $derived(store.serverCode ?? (peerHost.status === 'online' ? peerHost.codeText : null));

  /** Reprise de son club depuis ce navigateur, avec le code de l'hôte (C10). */
  let claimCode = $state('');
  async function claim(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    busy = true;
    feedback = await store.claimClub(claimCode.trim());
    busy = false;
  }

  const STATUS_LABEL: Record<'idle' | 'connecting' | 'online' | 'offline', MessageKey> = { idle: 'lobby.status.idle', connecting: 'lobby.status.connecting', online: 'lobby.status.online', offline: 'lobby.status.offline' };
</script>

<div class="salle">
  <header>
    <div class="langue"><LangSwitch /></div>
    <h1 class="banderole-xl">{t('lobby.title1')}<br />{t('lobby.title2')}</h1>
    <Sticker tilted>{t(client ? STATUS_LABEL[client.status] : 'lobby.status.idle')}</Sticker>
    {#if client?.status === 'offline'}
      <p class="texte-s texte-fort" role="alert">{t('lobby.hostDown')}</p>
    {/if}
    {#if shareCode}
      <p class="texte-s">{t('lobby.serverCode')} <span class="code">{shareCode}</span></p>
    {/if}
  </header>

  <div class="colonnes">
    <Card title={playing ? t('lobby.joinRunning') : me ? t('lobby.yourClub') : t('lobby.createClub')}>
      {#if playing}
        <p class="texte-s">
          {t('lobby.runningBefore')}<span class="texte-fort">{t('lobby.weakestClub')}</span>{t('lobby.runningAfter')}
        </p>
      {:else if me}
        <p class="texte-fort">{me.name} · {me.clubName}</p>
        <p class="texte-s discret">{t('lobby.canRename')}</p>
      {:else}
        <p class="texte-s">{t('lobby.everyoneStarts')}</p>
      {/if}
      <form onsubmit={join}>
        <label class="tampon" for="coach-nom">{t('lobby.coachName')}</label>
        <input id="coach-nom" bind:value={name} maxlength="24" placeholder="Coach Raymond" required />
        <label class="tampon" for="coach-club">{t('lobby.clubName')}</label>
        <input id="coach-club" bind:value={clubName} maxlength="40" placeholder="Les Gros Mollets" required />
        <div class="row">
          <Button variant={me ? 'ghost' : 'primary'} type="submit" disabled={busy}>
            {playing ? t('lobby.joinLeague') : me ? t('lobby.update') : t('lobby.register')}
          </Button>
        </div>
      </form>
      <p class="texte-s texte-fort" role="status">{feedback ? td(feedback) : ''}</p>
      {#if !me && client && client.coaches.length > 0}
        <form onsubmit={claim}>
          <label class="tampon" for="code-reprise">{t('lobby.hadClub')}</label>
          <p class="texte-s discret">{t('lobby.askCode')}</p>
          <input id="code-reprise" inputmode="numeric" maxlength="6" bind:value={claimCode} autocomplete="off" placeholder="123456" />
          <div class="row">
            <Button size="s" type="submit" disabled={busy || claimCode.trim().length !== 6}>{t('lobby.reclaim')}</Button>
          </div>
        </form>
      {/if}
    </Card>

    <Card title={playing ? t('shell.leagueCoaches') : t('lobby.waitingRoom')}>
      {#if !client || client.coaches.length === 0}
        <p class="texte-s discret">{t('lobby.nobody')}</p>
      {:else}
        <ul class="coachs">
          {#each client.coaches as coach (coach.id)}
            <li>
              <span class="pastille" class:en-ligne={coach.online} aria-label={coach.online ? t('host.online') : t('shell.coach.offline')}></span>
              <span class="texte-fort">{coach.name}</span>
              <span class="texte-s discret">{coach.clubName}</span>
              {#if coach.id === client.id}<Sticker>{t('live.you')}</Sticker>{/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if !playing}
        <p class="texte-s">{t('lobby.startsWithBefore')}<span class="texte-fort">{t('lobby.registeredOnline')}</span>{t('lobby.startsWithAfter')}</p>
        {#if client?.host}
          <div class="row">
            <Button variant="primary" disabled={!me || busy} onclick={start}>{t('lobby.start', { count: online.length })}</Button>
          </div>
        {:else}
          <p class="texte-s texte-fort">{t('lobby.hostStarts')}</p>
        {/if}
      {/if}
    </Card>
  </div>

  <div class="row">
    <Button variant="ghost" onclick={() => store.quitToTitle()}>{t('common.back')}</Button>
  </div>
</div>

<style>
  .salle {
    display: grid;
    gap: var(--space-6);
    padding: var(--marge-page);
    max-width: 1100px;
    margin: 0 auto;
  }
  header {
    display: grid;
    gap: var(--space-4);
    justify-items: start;
  }
  .langue {
    justify-self: end;
  }
  .colonnes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-6);
    align-items: start;
  }
  form {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  input {
    font: inherit;
    padding: var(--space-1) var(--space-2);
    border: var(--trait-fin) solid var(--encre);
    border-radius: var(--radius-xs);
    background: var(--craie);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  p {
    margin: var(--space-1) 0 0;
  }
  .coachs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .coachs li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
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
  .code {
    font-family: var(--font-mono);
    font-weight: 700;
    word-break: break-all;
    user-select: all;
  }
</style>
