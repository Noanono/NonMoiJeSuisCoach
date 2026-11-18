<script lang="ts">
  /**
   * État de la liaison pendant la ligue entre amis (MULTI-11) :
   * - côté coach, la liaison avec l'hôte a lâché : on le dit, on se reconnecte, et les actions attendent ;
   * - côté hôte, son onglet est resté en arrière-plan : le navigateur l'a ralenti, ses amis ont pu ramer.
   */
  import Button from '../kit/Button.svelte';
  import { store } from '../store.svelte';
  import { peerHost } from '../net/peerHost.svelte';

  /** `false` : seulement l'avis à l'hôte (la salle d'attente montre déjà l'état de la liaison). */
  let { coach = true }: { coach?: boolean } = $props();

  const client = $derived(store.multi);
  const lost = $derived(coach && client !== null && !client.host && client.synced && !client.connected);

  const MESSAGE = {
    idle: 'Déconnecté de l’hôte.',
    connecting: 'Liaison avec l’hôte perdue : reconnexion en cours…',
    offline: 'L’hôte ne répond plus : il a peut-être fermé son onglet ou perdu sa connexion. On réessaie régulièrement.',
    blocked: 'Vos réseaux refusent de se relier directement (box stricte, 4G, réseau d’école ou d’entreprise). On réessaie ; un autre réseau peut débloquer.',
    online: '',
  } as const;

  function duration(ms: number): string {
    const minutes = Math.round(ms / 60_000);
    return minutes >= 1 ? `${minutes} min` : `${Math.round(ms / 1000)} s`;
  }
</script>

{#if lost && client}
  <div class="bandeau-liaison alerte" role="alert">
    <p class="texte-s texte-fort">{MESSAGE[client.status]} Tes actions attendent le retour de la liaison.</p>
    <Button size="s" onclick={() => client.reconnect()}>Réessayer maintenant</Button>
  </div>
{/if}

{#if peerHost.status === 'online' && peerHost.hiddenFor > 0}
  <div class="bandeau-liaison" role="status">
    <p class="texte-s">
      <span class="texte-fort">Ton onglet est resté en arrière-plan {duration(peerHost.hiddenFor)}.</span>
      Il fait tourner la ligue : caché, le navigateur le ralentit et tes amis rament. Garde-le au premier plan, dans sa propre fenêtre si besoin.
    </p>
    <Button size="s" variant="ghost" onclick={() => peerHost.dismissHiddenNotice()}>Compris</Button>
  </div>
{/if}

<style>
  .bandeau-liaison {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: var(--trait-epais) solid var(--encre);
    background: var(--scotch);
    color: var(--encre-fixe);
    box-shadow: var(--ombre-sticker);
  }
  .bandeau-liaison.alerte {
    position: sticky;
    top: var(--space-2);
    z-index: 10;
    background: var(--carton);
    color: var(--craie-fixe);
  }
  p {
    margin: 0;
    flex: 1 1 280px;
  }
</style>
