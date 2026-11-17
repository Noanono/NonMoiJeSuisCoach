<script lang="ts">
  /**
   * @deprecated Ligue sur le réseau local (`npm run serveur`, MULTI-09) : n'apparaît que si le jeu est servi
   * par ce serveur. Remplacée par le pair-à-pair (« Héberger » / « Rejoindre ») et vouée à disparaître.
   */
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import Sticker from '../kit/Sticker.svelte';
  import { store } from '../store.svelte';
  import { lanServer, localCoachId } from '../multiClient.svelte';
  import { SseTransport } from '../net/transport';
  import type { ServerInfo, SlotInfo } from '../../server/hub';

  let { server, onrefresh }: { server: ServerInfo; onrefresh: () => Promise<void> } = $props();

  let hostSlots = $state<SlotInfo[]>([]);
  let confirmLeagueDelete = $state<number | null>(null);
  let hostFeedback = $state<string | null>(null);
  /** Reprise d'un coach dans un autre navigateur (C10). */
  let claimCode = $state('');
  let claimFeedback = $state<string | null>(null);
  /** L'identité de ce navigateur peut changer (code de reprise) : relue à chaque fois. */
  let coachId = $state(localCoachId());

  $effect(() => {
    if (server.host) void lanServer.slots().then((slots) => (hostSlots = slots));
  });

  const known = $derived(server.league?.coaches.some((coach) => coach.id === coachId) ?? false);

  async function giveCode(id: string): Promise<void> {
    const reply = await lanServer.claimCode(id);
    hostFeedback = reply.message ?? (reply.ok ? null : 'Refusé.');
  }

  async function claim(): Promise<void> {
    const reply = await lanServer.claim(claimCode);
    claimFeedback = reply.message ?? null;
    if (reply.ok) {
      coachId = localCoachId();
      claimCode = '';
      await onrefresh();
    }
  }

  async function hostAction(action: 'open' | 'delete', slot: number): Promise<void> {
    confirmLeagueDelete = null;
    const reply = await lanServer.hostAction(action, slot);
    hostFeedback = reply.message ?? (reply.ok ? null : 'Refusé.');
    await onrefresh();
    hostSlots = await lanServer.slots();
  }

  function leagueLine(league: NonNullable<SlotInfo['league']>): string {
    const when = league.phase === 'lobby' ? 'salle d’attente' : `saison ${league.season}, semaine ${league.week}`;
    return `${when} · ${league.coaches.map((coach) => coach.name).join(', ') || 'aucun coach'}`;
  }
</script>

<Card title="Réseau local">
  <p><Sticker>obsolète</Sticker></p>
  <p class="texte-s meta">Ce mode (<code>npm run serveur</code>) sera supprimé : héberge plutôt depuis l'accueil, en pair-à-pair.</p>
  {#if server.host}
    <p class="texte-s meta">Tu es sur le PC du serveur : choisis la ligue que tes amis rejoindront.</p>
    <ul class="ligues">
      {#each hostSlots as entry (entry.slot)}
        <li class:ouverte={entry.active}>
          <p class="texte-fort">Ligue {entry.slot} {#if entry.active}<Sticker>ouverte</Sticker>{/if}</p>
          {#if entry.status === 'ok' && entry.league}
            <p class="texte-s meta">{leagueLine(entry.league)}</p>
          {:else if entry.status === 'error'}
            <p class="texte-s erreur">Sauvegarde illisible.</p>
          {:else}
            <p class="texte-s meta">Emplacement vide.</p>
          {/if}
          <div class="row">
            {#if entry.status === 'empty'}
              <Button size="s" onclick={() => hostAction('open', entry.slot)}>Nouvelle ligue</Button>
            {:else if entry.status === 'ok'}
              <Button size="s" variant={entry.active ? 'ghost' : 'primary'} disabled={entry.active} onclick={() => hostAction('open', entry.slot)}>
                {entry.active ? 'Ouverte' : 'Ouvrir'}
              </Button>
            {/if}
            {#if entry.status !== 'empty' && !entry.active}
              {#if confirmLeagueDelete === entry.slot}
                <Button size="s" onclick={() => hostAction('delete', entry.slot)}>Confirmer</Button>
                <Button size="s" variant="ghost" onclick={() => (confirmLeagueDelete = null)}>Annuler</Button>
              {:else}
                <Button size="s" variant="ghost" onclick={() => (confirmLeagueDelete = entry.slot)}>Supprimer</Button>
              {/if}
            {/if}
          </div>
        </li>
      {/each}
    </ul>
    {#if server.league && server.league.coaches.length > 0}
      <p class="texte-s meta">Un ami a changé de navigateur et voit « Rejoindre » ? Donne-lui un code de reprise.</p>
      <ul class="ligues">
        {#each server.league.coaches as coach (coach.id)}
          <li class="row">
            <span class="texte-s"><span class="texte-fort">{coach.name}</span> · {coach.clubName}</span>
            <Button size="s" variant="ghost" onclick={() => giveCode(coach.id)}>Code de reprise</Button>
          </li>
        {/each}
      </ul>
    {/if}
    <p class="texte-s texte-fort" role="status">{hostFeedback ?? ''}</p>
  {/if}
  {#if !server.league}
    <p class="texte-s meta">{server.host ? 'Ouvre une ligue ci-dessus : elle apparaîtra ici.' : 'L’hôte n’a pas encore ouvert de ligue. Patience…'}</p>
  {:else}
    <p class="texte-fort">Ligue {server.league.slot}</p>
    <p class="texte-s meta">{leagueLine(server.league)}</p>
    <div class="row">
      <Button variant="primary" onclick={() => store.openMultiplayer(() => new SseTransport(localCoachId, server.host))}>{known ? 'Continuer' : 'Rejoindre'}</Button>
    </div>
    {#if !known && server.league.coaches.length > 0}
      <form class="row" onsubmit={(event) => { event.preventDefault(); void claim(); }}>
        <label class="texte-s" for="code-reprise-lan">Tu avais déjà un club ? Code de l’hôte :</label>
        <input id="code-reprise-lan" inputmode="numeric" maxlength="6" size="7" bind:value={claimCode} autocomplete="off" />
        <Button size="s" type="submit" disabled={claimCode.trim().length !== 6}>Reprendre mon club</Button>
      </form>
    {/if}
    {#if claimFeedback}<p class="texte-s texte-fort" role="status">{claimFeedback}</p>{/if}
  {/if}
</Card>

<style>
  .ligues {
    list-style: none;
    margin: var(--space-2) 0 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .ligues li {
    padding: var(--space-2);
    border: var(--trait-fin) solid var(--encre-pale);
    border-radius: var(--radius-xs);
  }
  .ligues li.ouverte {
    border-color: var(--encre);
    background: var(--craie);
  }
  p {
    margin: var(--space-1) 0 0;
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
  .erreur {
    color: var(--carton);
  }
  input {
    font: inherit;
    padding: var(--space-1) var(--space-2);
    border: var(--trait-fin) solid var(--encre);
    border-radius: var(--radius-xs);
    background: var(--craie);
    color: var(--encre);
  }
</style>
