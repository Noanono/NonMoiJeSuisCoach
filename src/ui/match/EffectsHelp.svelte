<script lang="ts">
  import type { ActiveStat } from '../../domain/match';
  import StatIcon from '../kit/StatIcon.svelte';
  import type { MatchController } from './controller.svelte';

  /** Rappel des effets, ouvert depuis un bouton en coin : le match se met en pause le temps de lire. */
  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  const EFFECTS: { stat: ActiveStat; name: string; impact: string }[] = [
    { stat: 'shooting', name: 'Tir', impact: 'Plus de chances de marquer, et le joueur reçoit plus de ballons.' },
    { stat: 'defense', name: 'Défense', impact: 'Moins d’occasions adverses.' },
    { stat: 'goalkeeping', name: 'Arrêts', impact: 'Le gardien encaisse moins de tirs.' },
    { stat: 'speed', name: 'Vitesse', impact: 'Pèse sur toutes les lignes, et à moitié sur le tir et les arrêts.' },
    { stat: 'technique', name: 'Technique', impact: 'Comme la vitesse : pèse sur toutes les lignes.' },
    { stat: 'physical', name: 'Physique', impact: 'Comme la vitesse : pèse sur toutes les lignes.' },
    { stat: 'concentration', name: 'Concentration', impact: 'Comme la vitesse : pèse sur toutes les lignes.' },
    { stat: 'all', name: 'Tout', impact: 'Toutes les stats à la fois, tir et arrêts compris.' },
    { stat: 'knockout', name: 'Hors jeu', impact: 'Le joueur ne compte plus pendant le compte à rebours.' },
    { stat: 'swap', name: 'Niveaux inversés', impact: 'Les deux équipes échangent leur niveau.' },
  ];

  function closeOnEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && controller.helpOpen) controller.helpOpen = false;
  }
</script>

<svelte:window onkeydown={closeOnEscape} />

<button class="ouvrir tampon" aria-expanded={controller.helpOpen} onclick={() => (controller.helpOpen = !controller.helpOpen)}>
  ? Effets
</button>

{#if controller.helpOpen}
  <div class="aide" role="dialog" aria-label="Rappel des effets">
    <div class="titre">
      <h2 class="banderole-m">Les effets</h2>
      <button class="tampon fermer" onclick={() => (controller.helpOpen = false)}>Fermer</button>
    </div>
    <p class="texte-s">Halo <span class="vert">vert</span> : bonus. Halo <span class="rouge">rouge</span> : malus. Le chiffre : minutes restantes.</p>
    <ul>
      {#each EFFECTS as effect (effect.stat)}
        <li class="texte-s">
          <span class="picto"><StatIcon stat={effect.stat} size={14} /></span>
          <span><span class="texte-fort">{effect.name}.</span> {effect.impact}</span>
        </li>
      {/each}
    </ul>
    <p class="texte-s">La barre sous le nom montre l'énergie restante : un joueur à bout joue moins bien et se blesse plus. Le carré indique le coût de sa capacité quand elle est prête.</p>
  </div>
{/if}

<style>
  .ouvrir {
    position: fixed;
    z-index: 6;
    left: var(--space-4);
    bottom: var(--space-4);
    padding: var(--space-1) var(--space-2);
    background: var(--scotch);
    color: var(--encre-fixe);
    border: var(--trait-epais) solid var(--encre-fixe);
    box-shadow: var(--ombre-sticker);
    cursor: pointer;
  }
  .aide {
    position: fixed;
    z-index: 6;
    left: var(--space-4);
    bottom: calc(var(--space-10) + var(--space-6));
    width: min(92vw, 400px);
    max-height: 75vh;
    overflow-y: auto;
    padding: var(--space-4);
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    box-shadow: var(--ombre-sticker);
  }
  .titre {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .fermer {
    background: none;
    color: inherit;
    border: var(--trait-fin) solid var(--encre);
    padding: 0 var(--space-2);
    cursor: pointer;
  }
  p {
    margin: var(--space-2) 0;
  }
  .vert {
    color: var(--victoire);
    font-weight: 700;
  }
  .rouge {
    color: var(--carton);
    font-weight: 700;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-1);
  }
  li {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr);
    gap: var(--space-1);
    align-items: start;
  }
  .picto {
    padding-top: 3px;
  }
</style>
