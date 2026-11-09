<script lang="ts">
  import type { MatchController } from './controller.svelte';
  import { pitchView } from './pitch';
  import PlayerToken from './PlayerToken.svelte';

  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  const view = $derived.by(() => {
    void controller.version;
    return pitchView(controller.match, controller.coachSide);
  });

  /** Ciblage en cours : toucher choisit la cible ; sinon toucher ouvre le panneau (CAP-03, CAP-16). */
  function activate(playerId: string): void {
    if (controller.match.pending) controller.pickTarget(playerId);
    else controller.inspect(playerId);
  }
</script>

<section class="terrain" aria-label="Terrain : ton équipe face à l'adversaire">
  <div class="lignes">
    {#each view.columns as column (column.key)}
      <div class="ligne" role="group" aria-label={column.label}>
        {#each column.tokens as token (token.id)}
          <PlayerToken {token} onactivate={activate} />
        {/each}
      </div>
    {/each}
  </div>

  {#if view.bench.length > 0}
    <div class="banc" role="group" aria-label="Ton banc">
      <span class="tampon titre-banc">Banc</span>
      <div class="banc-jetons">
        {#each view.bench as token (token.id)}
          <PlayerToken {token} onactivate={activate} />
        {/each}
      </div>
    </div>
  {/if}
</section>

<style>
  .terrain {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }
  .lignes {
    position: relative;
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: var(--space-2);
    padding: var(--space-4) var(--space-2);
    border: var(--trait-epais) solid var(--ligne);
    min-height: 460px;
  }
  /* Ligne médiane à la craie entre les deux attaques. */
  .lignes::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    border-left: var(--trait-epais) solid var(--ligne);
    pointer-events: none;
  }
  .ligne {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    gap: var(--space-2);
  }
  .banc {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    background: var(--craie-2);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    padding: var(--space-2) var(--space-4);
  }
  .banc-jetons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    flex: 1;
  }
  .banc-jetons :global(.jeton) {
    width: 76px;
  }

  /* Mobile : le terrain pivote, l'adversaire en haut, ton équipe en bas. */
  @media (max-width: 900px) {
    .lignes {
      display: flex;
      flex-direction: column-reverse;
      min-height: 0;
      padding: var(--space-2);
    }
    .lignes::before {
      top: 50%;
      bottom: auto;
      left: 0;
      right: 0;
      border-left: none;
      border-top: var(--trait-epais) solid var(--ligne);
    }
    .ligne {
      flex-direction: row;
      justify-content: center;
      gap: var(--space-1);
    }
    .ligne :global(.jeton) {
      flex: 1 1 0;
      max-width: 76px;
    }
  }
</style>
