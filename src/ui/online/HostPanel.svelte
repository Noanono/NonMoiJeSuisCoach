<script lang="ts">
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
  let serverName = $state(host.serverName || `Ligue de ${savedProfile().name || 'l’hôte'}`);
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
      feedback = 'Copie impossible : sélectionne le code à la main.';
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
    const when = league.phase === 'lobby' ? 'salle d’attente' : `saison ${league.season}, semaine ${league.week}`;
    return `${when} · ${league.coaches.map((coach) => coach.name).join(', ') || 'aucun coach'}`;
  }
</script>

{#if online && host.league}
  <div class="colonnes">
    <Card title="Ton serveur" scotch>
      <p class="texte-s meta">Ligue {host.league.slot} · {leagueLine(host.league)}</p>
      <p class="tampon">Code à partager</p>
      <p class="code" data-testid="code-serveur">{host.codeText}</p>
      <div class="row">
        <Button size="s" variant="primary" onclick={() => copy('code')}>{copied === 'code' ? 'Copié !' : 'Copier le code'}</Button>
        <Button size="s" onclick={() => copy('lien')}>{copied === 'lien' ? 'Copié !' : 'Copier le lien'}</Button>
      </div>
      <p class="texte-s meta">Tes amis le collent dans « Rejoindre une partie ». Connexion directe entre navigateurs, chiffrée.</p>

      <label class="public">
        <input type="checkbox" checked={host.isPublic} onchange={togglePublic} />
        <span class="texte-fort">Ouvrir au public</span>
      </label>
      <label class="tampon" for="nom-serveur">Nom affiché dans la liste</label>
      <input id="nom-serveur" bind:value={serverName} maxlength={SERVER_NAME_MAX} onchange={renamePublic} />
      <p class="texte-s meta">
        {host.isPublic ? 'Ton serveur apparaît dans la liste des serveurs publics : n’importe qui peut entrer.' : 'Privé : seuls ceux qui ont le code peuvent entrer.'}
      </p>

      <div class="row">
        <Button variant="primary" onclick={play}>Jouer dans ma ligue</Button>
      </div>
      <p class="texte-s alerte">Garde cet onglet ouvert : c'est lui le serveur. Le fermer renvoie tout le monde à l'accueil (la ligue reste sauvegardée ici).</p>
    </Card>

    <Card title="Coachs">
      <p class="texte-s meta">{host.peers} navigateur{host.peers > 1 ? 's' : ''} d'amis connecté{host.peers > 1 ? 's' : ''}.</p>
      {#if host.league.coaches.length === 0}
        <p class="texte-s meta">Personne d'inscrit pour l'instant.</p>
      {:else}
        <ul class="liste">
          {#each host.league.coaches as coach (coach.id)}
            <li class="row">
              <span class="pastille" class:en-ligne={coach.online} aria-label={coach.online ? 'en ligne' : 'hors ligne'}></span>
              <span class="texte-s"><span class="texte-fort">{coach.name}</span> · {coach.clubName}</span>
              <Button size="s" variant="ghost" onclick={() => giveCode(coach.id)}>Code de reprise</Button>
            </li>
          {/each}
        </ul>
        <p class="texte-s meta">Un ami a changé de navigateur ? Donne-lui un code de reprise : il le tape dans la salle d'attente.</p>
      {/if}
      <div class="row">
        <Button size="s" variant="ghost" disabled={busy} onclick={() => run(() => host.renewCode())}>Nouveau code</Button>
        {#if confirmStop}
          <Button size="s" onclick={() => run(async () => { confirmStop = false; await host.stop(); })}>Confirmer l'arrêt</Button>
          <Button size="s" variant="ghost" onclick={() => (confirmStop = false)}>Annuler</Button>
        {:else}
          <Button size="s" variant="ghost" onclick={() => (confirmStop = true)}>Arrêter le serveur</Button>
        {/if}
      </div>
      <p class="texte-s meta">« Nouveau code » : l'ancien ne mène plus nulle part, et les amis connectés doivent recevoir le nouveau.</p>
    </Card>
  </div>
{:else}
  <Card title="Héberger une partie">
    <p class="texte-s meta">Ton navigateur devient le serveur : choisis une ligue, tu obtiendras un code à donner à tes amis. Tes ligues restent sur ce PC.</p>
    {#if host.status === 'starting'}
      <p class="texte-s texte-fort" role="status">Ouverture du serveur…</p>
    {/if}
    <ul class="liste">
      {#each host.slots as entry (entry.slot)}
        <li>
          <p class="texte-fort">Ligue {entry.slot}</p>
          {#if entry.status === 'ok' && entry.league}
            <p class="texte-s meta">{leagueLine(entry.league)}</p>
          {:else if entry.status === 'error'}
            <p class="texte-s erreur">Sauvegarde illisible.</p>
          {:else}
            <p class="texte-s meta">Emplacement vide.</p>
          {/if}
          <div class="row">
            {#if entry.status === 'empty'}
              <Button size="s" variant="primary" disabled={busy} onclick={() => open(entry.slot)}>Nouvelle ligue</Button>
            {:else if entry.status === 'ok'}
              <Button size="s" variant="primary" disabled={busy} onclick={() => open(entry.slot)}>Héberger</Button>
            {/if}
            {#if entry.status !== 'empty'}
              {#if confirmDelete === entry.slot}
                <Button size="s" onclick={() => remove(entry.slot)}>Confirmer</Button>
                <Button size="s" variant="ghost" onclick={() => (confirmDelete = null)}>Annuler</Button>
              {:else}
                <Button size="s" variant="ghost" onclick={() => (confirmDelete = entry.slot)}>Supprimer</Button>
              {/if}
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  </Card>
{/if}
{#if host.error}<p class="texte-s erreur" role="alert">{host.error}</p>{/if}
{#if feedback}<p class="texte-s texte-fort" role="status">{feedback}</p>{/if}

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
