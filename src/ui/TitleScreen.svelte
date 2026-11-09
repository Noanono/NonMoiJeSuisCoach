<script lang="ts">
  import Button from './kit/Button.svelte';
  import Card from './kit/Card.svelte';
  import Sticker from './kit/Sticker.svelte';
  import { store } from './store.svelte';
  import type { SaveSlot } from '../domain/save/saveSlots';

  let slots = $state(store.listSlots());
  let creatingSlot = $state<SaveSlot | null>(null);
  let confirmDelete = $state<SaveSlot | null>(null);
  let clubName = $state('');

  function create(event: SubmitEvent): void {
    event.preventDefault();
    if (creatingSlot) store.startNewGame(creatingSlot, clubName);
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
  input {
    font: inherit;
    padding: var(--space-2);
    border: var(--trait-fin) solid var(--encre);
    border-radius: var(--radius-xs);
    background: var(--craie);
    color: var(--encre);
  }
</style>
