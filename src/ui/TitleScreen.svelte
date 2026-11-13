<script lang="ts">
  import Button from './kit/Button.svelte';
  import Card from './kit/Card.svelte';
  import Sticker from './kit/Sticker.svelte';
  import { store } from './store.svelte';
  import type { SaveSlot } from '../domain/save/saveSlots';
  import { DIFFICULTIES, type Difficulty } from '../domain/game/difficulty';
  import { localCoachId, MultiClient } from './multiClient.svelte';
  import type { ServerInfo, SlotInfo } from '../server/hub';

  const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[];

  let slots = $state(store.listSlots());
  let creatingSlot = $state<SaveSlot | null>(null);
  let confirmDelete = $state<SaveSlot | null>(null);
  let clubName = $state('');
  let difficulty = $state<Difficulty>('normal');
  /** Écran d'entrée : solo, héberger une ligue (sur le PC du serveur) ou rejoindre celle qui est ouverte (MULTI-09). */
  let mode = $state<'choice' | 'solo'>('choice');
  /** `undefined` = on cherche encore ; `null` = pas de serveur de ligue à cette adresse. */
  let server = $state<ServerInfo | null | undefined>(undefined);
  let hostSlots = $state<SlotInfo[]>([]);
  let confirmLeagueDelete = $state<number | null>(null);
  let hostFeedback = $state<string | null>(null);

  async function refreshServer(): Promise<void> {
    server = await MultiClient.serverInfo();
    hostSlots = server?.host ? await MultiClient.hostSlots() : [];
  }

  // La ligue ouverte peut changer (l'hôte en choisit une) : on relit le serveur régulièrement.
  $effect(() => {
    void refreshServer();
    const timer = setInterval(() => void refreshServer(), 3000);
    return () => clearInterval(timer);
  });

  /** Ce navigateur a déjà joué dans la ligue ouverte : « Continuer », sinon « Rejoindre ». */
  const known = $derived(server?.league?.coaches.some((coach) => coach.id === localCoachId()) ?? false);

  async function hostAction(action: 'open' | 'delete', slot: number): Promise<void> {
    confirmLeagueDelete = null;
    const reply = await MultiClient.hostAction(action, slot);
    hostFeedback = reply.message ?? (reply.ok ? null : 'Refusé.');
    await refreshServer();
  }

  function leagueLine(league: NonNullable<SlotInfo['league']>): string {
    const when = league.phase === 'lobby' ? 'salle d’attente' : `saison ${league.season}, semaine ${league.week}`;
    return `${when} · ${league.coaches.map((coach) => coach.name).join(', ') || 'aucun coach'}`;
  }

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
  <header>
    <h1 class="banderole-xl">NON, MOI JE<br />SUIS COACH</h1>
    <p class="accroche texte-fort">Le jeu de gestion pour tous ceux qui savaient mieux que le sélectionneur.</p>
    <Sticker tilted>District · saison 1</Sticker>
  </header>

  {#if mode === 'choice'}
  <div class="modes">
    <Card title="Solo">
      <p class="texte-s meta">Ton club, ta carrière, trois vestiaires de sauvegarde sur ce PC.</p>
      <div class="row"><Button variant="primary" onclick={() => (mode = 'solo')}>Jouer en solo</Button></div>
    </Card>
    {#if server?.host}
      <Card title="Héberger une partie">
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
              <div class="row serre">
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
        <p class="texte-s texte-fort" role="status">{hostFeedback ?? ''}</p>
      </Card>
    {/if}
    <Card title="Rejoindre une partie">
      {#if server === undefined}
        <p class="texte-s meta">Recherche du serveur…</p>
      {:else if server === null}
        <p class="texte-s meta">Une ligue entre amis sur le réseau local : chacun son club, la semaine avance quand tout le monde est prêt.</p>
        <div class="aide texte-s">
          <p class="texte-fort">Pas de serveur de ligue à cette adresse.</p>
          <p>L'hôte lance <code>npm run serveur</code> sur son PC, puis chacun ouvre l'adresse affichée (par exemple <code>http://192.168.1.20:5300</code>) dans son navigateur.</p>
        </div>
      {:else if !server.league}
        <p class="texte-s meta">{server.host ? 'Ouvre une ligue à gauche : elle apparaîtra ici.' : 'L’hôte n’a pas encore ouvert de ligue. Patience…'}</p>
      {:else}
        <p class="texte-fort">Ligue {server.league.slot}</p>
        <p class="texte-s meta">{leagueLine(server.league)}</p>
        <div class="row">
          <Button variant="primary" onclick={() => store.openMultiplayer()}>{known ? 'Continuer' : 'Rejoindre'}</Button>
        </div>
        {#if !known}
          <p class="texte-s meta">
            {server.league.phase === 'lobby' ? 'Tu choisiras ton nom de coach et ton nom de club.' : 'La ligue a commencé : tu reprendras le club le plus faible, que tu renommeras.'}
          </p>
        {/if}
      {/if}
    </Card>
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
    display: grid;
    gap: var(--space-10);
    padding: var(--marge-page);
    max-width: 1100px;
    margin: 0 auto;
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
  .ligues p {
    margin: 0;
  }
  .row.serre {
    margin-top: var(--space-1);
  }
  .aide {
    margin-top: var(--space-4);
    display: grid;
    gap: var(--space-1);
  }
  .aide p {
    margin: 0;
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
