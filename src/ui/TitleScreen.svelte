<script lang="ts">
  import Button from './kit/Button.svelte';
  import Card from './kit/Card.svelte';
  import Sticker from './kit/Sticker.svelte';
  import { store } from './store.svelte';
  import type { SaveSlot } from '../domain/save/saveSlots';
  import { DIFFICULTIES, type Difficulty } from '../domain/game/difficulty';
  import { MultiClient } from './multiClient.svelte';

  const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[];

  let slots = $state(store.listSlots());
  let creatingSlot = $state<SaveSlot | null>(null);
  let confirmDelete = $state<SaveSlot | null>(null);
  let clubName = $state('');
  let difficulty = $state<Difficulty>('normal');
  /** Écran d'entrée : choisir entre solo et ligue entre amis. */
  let mode = $state<'choice' | 'solo'>('choice');
  let multiHelp = $state(false);
  let checking = $state(false);

  async function openMulti(): Promise<void> {
    checking = true;
    const available = await MultiClient.available();
    checking = false;
    if (available) store.openMultiplayer();
    else multiHelp = true;
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
    <Card title="Multijoueur">
      <p class="texte-s meta">Une ligue entre amis sur le réseau local : chacun son club, la semaine avance quand tout le monde est prêt.</p>
      <div class="row"><Button variant="primary" disabled={checking} onclick={openMulti}>{checking ? 'Recherche du serveur…' : 'Ligue entre amis'}</Button></div>
      {#if multiHelp}
        <div class="aide texte-s" role="alert">
          <p class="texte-fort">Pas de serveur de ligue à cette adresse.</p>
          <p>L'hôte lance <code>npm run serveur</code> sur son PC, puis chacun ouvre l'adresse affichée (par exemple <code>http://192.168.1.20:5300</code>) dans son navigateur.</p>
        </div>
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
