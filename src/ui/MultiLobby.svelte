<script lang="ts">
  import Button from './kit/Button.svelte';
  import Card from './kit/Card.svelte';
  import Sticker from './kit/Sticker.svelte';
  import { store } from './store.svelte';
  import { savedProfile } from './multiClient.svelte';

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
    feedback = reply.ok ? (playing ? 'Bienvenue dans la ligue !' : 'Inscrit. On attend les copains.') : (reply.message ?? 'Inscription refusée.');
  }

  async function start(): Promise<void> {
    if (!client) return;
    busy = true;
    const reply = await client.start();
    busy = false;
    if (!reply.ok) feedback = reply.message ?? 'Impossible de lancer la ligue.';
  }

  const STATUS_LABEL = { idle: 'Déconnecté', connecting: 'Connexion au serveur…', online: 'Connecté au serveur', offline: 'Serveur injoignable' } as const;
</script>

<div class="salle">
  <header>
    <h1 class="banderole-xl">LIGUE ENTRE<br />AMIS</h1>
    <Sticker tilted>{client ? STATUS_LABEL[client.status] : 'Déconnecté'}</Sticker>
  </header>

  <div class="colonnes">
    <Card title={playing ? 'Rejoindre la ligue en cours' : me ? 'Ton club' : 'Crée ton club'}>
      {#if playing}
        <p class="texte-s">
          La ligue a déjà commencé. Tu reprends le <span class="texte-fort">club le plus faible</span> du monde, et tu le renommes. Ensuite, à toi de le faire monter.
        </p>
      {:else if me}
        <p class="texte-fort">{me.name} · {me.clubName}</p>
        <p class="texte-s discret">Tu peux encore changer tes noms tant que la ligue n'a pas commencé.</p>
      {:else}
        <p class="texte-s">Tout le monde commence au District, chacun avec son club. Choisis tes noms.</p>
      {/if}
      <form onsubmit={join}>
        <label class="tampon" for="coach-nom">Nom de coach</label>
        <input id="coach-nom" bind:value={name} maxlength="24" placeholder="Coach Raymond" required />
        <label class="tampon" for="coach-club">Nom du club</label>
        <input id="coach-club" bind:value={clubName} maxlength="40" placeholder="Les Gros Mollets" required />
        <div class="row">
          <Button variant={me ? 'ghost' : 'primary'} type="submit" disabled={busy}>
            {playing ? 'Rejoindre la ligue' : me ? 'Mettre à jour' : 'S’inscrire'}
          </Button>
        </div>
      </form>
      <p class="texte-s texte-fort" role="status">{feedback ?? ''}</p>
    </Card>

    <Card title={playing ? 'Coachs de la ligue' : 'Salle d’attente'}>
      {#if !client || client.coaches.length === 0}
        <p class="texte-s discret">Personne pour l'instant. Donne l'adresse du serveur à tes amis.</p>
      {:else}
        <ul class="coachs">
          {#each client.coaches as coach (coach.id)}
            <li>
              <span class="pastille" class:en-ligne={coach.online} aria-label={coach.online ? 'en ligne' : 'hors ligne'}></span>
              <span class="texte-fort">{coach.name}</span>
              <span class="texte-s discret">{coach.clubName}</span>
              {#if coach.id === client.id}<Sticker>toi</Sticker>{/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if !playing}
        <p class="texte-s">La ligue démarre avec les coachs <span class="texte-fort">inscrits et connectés</span> au moment du lancement. Les retardataires reprendront le club le plus faible.</p>
        <div class="row">
          <Button variant="primary" disabled={!me || busy} onclick={start}>Lancer la ligue ({online.length} coach{online.length > 1 ? 's' : ''})</Button>
        </div>
      {/if}
    </Card>
  </div>

  <div class="row">
    <Button variant="ghost" onclick={() => store.quitToTitle()}>Retour</Button>
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
</style>
