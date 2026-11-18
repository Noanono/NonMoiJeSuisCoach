<script lang="ts">
  import Button from './kit/Button.svelte';
  import Card from './kit/Card.svelte';
  import Sticker from './kit/Sticker.svelte';
  import { store } from './store.svelte';
  import type { SaveSlot } from '../domain/save/saveSlots';
  import { DIFFICULTIES, type Difficulty } from '../domain/game/difficulty';
  import { lanServer } from './multiClient.svelte';
  import type { ServerInfo } from '../server/hub';
  import HostPanel from './online/HostPanel.svelte';
  import JoinPanel from './online/JoinPanel.svelte';
  import LanLeague from './lan/LanLeague.svelte';
  import { peerHost } from './net/peerHost.svelte';
  import { crazyGames } from './platform/crazygames.svelte';

  const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[];
  const JOIN_LINK = /^#rejoindre=(.+)$/;

  let slots = $state(store.listSlots());
  let creatingSlot = $state<SaveSlot | null>(null);
  let confirmDelete = $state<SaveSlot | null>(null);
  let clubName = $state('');
  let difficulty = $state<Difficulty>('normal');
  /** Lien d'invitation (`#rejoindre=CODE`) : on arrive directement sur « Rejoindre », le code rempli. */
  const linkCode = readJoinLink();
  /** Écran d'entrée : solo, héberger une ligue, ou en rejoindre une (MULTI-09, MULTI-11). */
  let mode = $state<'choice' | 'solo' | 'host' | 'join'>(linkCode ? 'join' : peerHost.status === 'online' ? 'host' : 'choice');
  /** @deprecated Serveur du réseau local qui sert le jeu ; `null` ailleurs (Netlify). */
  let lan = $state<ServerInfo | null>(null);

  function readJoinLink(): string {
    const match = JOIN_LINK.exec(location.hash);
    if (!match) return '';
    // Le code ne reste pas dans la barre d'adresse (ni dans l'historique partagé par erreur).
    history.replaceState(null, '', location.pathname + location.search);
    try {
      return decodeURIComponent(match[1]!);
    } catch {
      return '';
    }
  }

  async function refreshLan(): Promise<void> {
    // Sur CrazyGames, aucun serveur du réseau local ne sert le jeu : inutile de le chercher.
    if (crazyGames.enabled) return;
    lan = await lanServer.info();
  }

  // Le serveur du réseau local (obsolète) peut ouvrir une autre ligue : on le relit tant qu'il répond.
  $effect(() => {
    void refreshLan();
    const timer = setInterval(() => {
      if (lan) void refreshLan();
    }, 3000);
    return () => clearInterval(timer);
  });

  function create(event: SubmitEvent): void {
    event.preventDefault();
    if (creatingSlot) store.startNewGame(creatingSlot, clubName, difficulty);
  }

  function remove(slot: SaveSlot): void {
    store.removeSlot(slot);
    confirmDelete = null;
    slots = store.listSlots();
  }

  const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
</script>

<div class="title">
  {#if crazyGames.enabled && crazyGames.accountAvailable}
    <!-- Compte CrazyGames (PLAT-02) : en coin, jamais un passage obligé. -->
    <div class="compte">
      {#if crazyGames.user}
        <img src={crazyGames.user.profilePictureUrl} alt="" width="32" height="32" />
        <span class="texte-s texte-fort">{crazyGames.user.username}</span>
      {:else}
        <Button size="s" variant="ghost" onclick={() => crazyGames.login()}>Se connecter avec CrazyGames</Button>
      {/if}
    </div>
  {/if}
  <header>
    <h1 class="banderole-xl">NON, MOI JE<br />SUIS COACH</h1>
    <p class="accroche texte-fort">Le jeu de gestion pour tous ceux qui savaient mieux que le sélectionneur.</p>
    <Sticker tilted>District · saison 1</Sticker>
  </header>

  {#if mode === 'choice'}
  <div class="modes">
    <Card title="Solo">
      <p class="texte-s meta">{crazyGames.user ? 'Ton club, ta carrière, trois vestiaires de sauvegarde rangés dans ton compte CrazyGames.' : 'Ton club, ta carrière, trois vestiaires de sauvegarde sur ce PC.'}</p>
      <div class="row"><Button variant="primary" onclick={() => (mode = 'solo')}>Jouer en solo</Button></div>
    </Card>
    <Card title="Héberger une partie">
      <p class="texte-s meta">
        {peerHost.status === 'online' ? 'Ton serveur tourne : reviens-y pour le code et les coachs.' : 'Ton navigateur devient le serveur. Tu obtiens un code à partager, et tu peux ouvrir ta ligue au public.'}
      </p>
      <div class="row"><Button variant="primary" onclick={() => (mode = 'host')}>{peerHost.status === 'online' ? 'Mon serveur' : 'Héberger'}</Button></div>
    </Card>
    <Card title="Rejoindre une partie">
      <p class="texte-s meta">Un ami t'a donné un code ? Ou pioche dans la liste des serveurs publics.</p>
      <div class="row"><Button variant="primary" onclick={() => (mode = 'join')}>Rejoindre</Button></div>
    </Card>
    {#if lan}
      <LanLeague server={lan} onrefresh={refreshLan} />
    {/if}
  </div>
  {:else if mode === 'host'}
  <div class="row"><Button variant="ghost" onclick={() => (mode = 'choice')}>Retour au choix du mode</Button></div>
  <HostPanel />
  {:else if mode === 'join'}
  <div class="row"><Button variant="ghost" onclick={() => (mode = 'choice')}>Retour au choix du mode</Button></div>
  <div class="rejoindre">
    <JoinPanel initialCode={linkCode} />
  </div>
  {:else}
  <div class="row"><Button variant="ghost" onclick={() => (mode = 'choice')}>Retour au choix du mode</Button></div>
  <div class="slots">
    {#each slots as entry (entry.slot)}
      <Card title={`Vestiaire ${entry.slot}`}>
        {#if entry.status === 'ok'}
          <p class="texte-fort">{entry.meta.clubName}</p>
          <p class="tampon meta">Saison {entry.meta.season} · semaine {entry.meta.week}</p>
          <p class="texte-s meta">Sauvé le {dateFormat.format(new Date(entry.meta.savedAt))}</p>
          <div class="row">
            <Button variant="primary" onclick={() => store.load(entry.slot)}>Reprendre</Button>
            {#if confirmDelete === entry.slot}
              <Button onclick={() => remove(entry.slot)}>Confirmer</Button>
              <Button variant="ghost" onclick={() => (confirmDelete = null)}>Annuler</Button>
            {:else}
              <Button variant="ghost" onclick={() => (confirmDelete = entry.slot)}>Supprimer</Button>
            {/if}
          </div>
        {:else if entry.status === 'error'}
          <p class="texte-s erreur">{entry.error.message}</p>
          <Button variant="ghost" onclick={() => remove(entry.slot)}>Vider le vestiaire</Button>
        {:else if creatingSlot === entry.slot}
          <form onsubmit={create}>
            <label class="tampon" for="club-{entry.slot}">Nom de ton club</label>
            <input id="club-{entry.slot}" bind:value={clubName} maxlength="40" placeholder="Laisse vide, on t'en trouve un" />
            <fieldset class="difficulte">
              <legend class="tampon">Difficulté</legend>
              {#each DIFFICULTY_IDS as id (id)}
                <label class="choix" class:actif={difficulty === id}>
                  <input type="radio" name="difficulte-{entry.slot}" value={id} bind:group={difficulty} />
                  <span class="texte-fort">{DIFFICULTIES[id].label}</span>
                  <span class="texte-s meta">{DIFFICULTIES[id].description}</span>
                </label>
              {/each}
            </fieldset>
            <div class="row">
              <Button variant="primary" type="submit">Signer</Button>
              <Button variant="ghost" onclick={() => (creatingSlot = null)}>Annuler</Button>
            </div>
          </form>
        {:else}
          <p class="texte-s meta">Vestiaire vide. Ça sent encore le camphre.</p>
          <Button onclick={() => (creatingSlot = entry.slot)}>Nouvelle partie</Button>
        {/if}
      </Card>
    {/each}
  </div>
  {/if}
</div>

<style>
  .title {
    position: relative;
    display: grid;
    gap: var(--space-10);
    padding: var(--marge-page);
    max-width: 1100px;
    margin: 0 auto;
  }
  .compte {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .compte img {
    border-radius: 50%;
    border: var(--trait-fin) solid var(--encre);
  }
  header {
    display: grid;
    gap: var(--space-4);
    justify-items: start;
  }
  .accroche {
    margin: 0;
    max-width: 32ch;
  }
  .modes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-6);
  }
  .rejoindre {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--space-6);
    align-items: start;
  }
  .slots {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-6);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }
  .meta {
    color: var(--encre-pale);
    margin: var(--space-1) 0 0;
  }
  .erreur {
    color: var(--carton);
  }
  form {
    display: grid;
    gap: var(--space-2);
  }
  .difficulte {
    display: grid;
    gap: var(--space-1);
    border: none;
    padding: 0;
    margin: var(--space-2) 0 0;
  }
  .choix {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: var(--space-2);
    align-items: center;
    padding: var(--space-1) var(--space-2);
    border: var(--trait-fin) solid var(--encre-pale);
    border-radius: var(--radius-xs);
    cursor: pointer;
  }
  .choix.actif {
    border-color: var(--encre);
    background: var(--craie);
  }
  .choix .meta {
    grid-column: 2;
    margin: 0;
  }
  input:not([type='radio']) {
    font: inherit;
    padding: var(--space-2);
    border: var(--trait-fin) solid var(--encre);
    border-radius: var(--radius-xs);
    background: var(--craie);
    color: var(--encre);
  }
</style>
