<script lang="ts">
  import { DUEL_DECISION_MS } from '../../server/duel';
  import type { MatchController } from './controller.svelte';

  /**
   * Match en direct contre un autre coach (MULTI-07) : temps restant pour décider, en barre qui se vide.
   * Quand c'est l'adversaire qui choisit, un bandeau central le dit clairement : qui, quoi, combien de temps.
   */
  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  const decision = $derived.by(() => {
    void controller.version;
    const duel = controller.duel;
    if (!duel) return null;
    const match = controller.match;
    const deciding = match.pending?.side ?? match.awaiting?.side;
    if (!deciding) return null;
    const remaining = controller.remaining(duel.decisionRemaining);
    return {
      mine: deciding === controller.coachSide,
      name: duel.names[deciding],
      what: whatIsChosen(deciding),
      remaining,
      share: Math.min(1, remaining / DUEL_DECISION_MS),
    };
  });

  /** Ce que le coach en train de décider est en train de choisir. */
  function whatIsChosen(side: 'home' | 'away'): string {
    const match = controller.match;
    const pending = match.pending;
    if (pending && pending.side === side) {
      const source = match[side].players.find((player) => player.id === pending.playerId);
      return `choisit la cible de « ${source?.ability?.name ?? 'sa capacité'} »`;
    }
    const window = match.awaiting;
    if (window?.penalty) return window.penalty === 'attack' ? 'choisit sa frappe de penalty' : 'choisit où plonge son gardien';
    if (window?.freeKick) return window.freeKick === 'attack' ? 'choisit son coup franc' : 'place son mur';
    return 'hésite à lancer une capacité';
  }

  const seconds = (ms: number) => Math.ceil(ms / 1000);
</script>

{#if decision}
  {#if decision.mine}
    <div class="chrono" role="timer" aria-label="Temps pour décider">
      <span class="tampon">À toi de décider · {seconds(decision.remaining)} s</span>
      <div class="barre" class:urgent={decision.share < 0.3}><div class="reste" style:width="{decision.share * 100}%"></div></div>
    </div>
  {:else}
    <div class="adverse" role="status" aria-live="polite">
      <p class="banderole-titre">⏳ {decision.name} {decision.what}…</p>
      <div class="barre" class:urgent={decision.share < 0.3}><div class="reste" style:width="{decision.share * 100}%"></div></div>
      <p class="texte-s">Le match reprend dès qu'il a choisi, au plus tard dans {seconds(decision.remaining)} s.</p>
    </div>
  {/if}
{/if}

<style>
  .chrono,
  .adverse {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-4);
    border: var(--trait-epais) solid var(--encre-fixe);
    box-shadow: var(--ombre-sticker);
    color: var(--encre-fixe);
  }
  .chrono {
    background: var(--scotch);
  }
  .adverse {
    background: var(--craie-fixe);
    justify-items: center;
    text-align: center;
    padding: var(--space-4);
  }
  .adverse p {
    margin: 0;
  }
  .barre {
    width: 100%;
    height: 10px;
    border: var(--trait-fin) solid var(--encre-fixe);
    background: var(--craie-fixe);
    overflow: hidden;
  }
  .reste {
    height: 100%;
    background: var(--victoire);
    transition: width 250ms linear;
  }
  .barre.urgent .reste {
    background: var(--carton);
  }
</style>
