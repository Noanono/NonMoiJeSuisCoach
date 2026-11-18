<script lang="ts">
  import { t, type MessageKey } from '../../i18n/t';
  import type { ActiveStat } from '../../domain/match';
  import StatIcon from '../kit/StatIcon.svelte';
  import type { MatchController } from './controller.svelte';

  /** Rappel des effets, ouvert depuis un bouton en coin : le match se met en pause le temps de lire. */
  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  const EFFECTS: { stat: ActiveStat & string; name: MessageKey; impact: MessageKey }[] = [
    { stat: 'shooting', name: 'help.shooting.name', impact: 'help.shooting.impact' },
    { stat: 'defense', name: 'help.defense.name', impact: 'help.defense.impact' },
    { stat: 'goalkeeping', name: 'help.goalkeeping.name', impact: 'help.goalkeeping.impact' },
    { stat: 'speed', name: 'help.speed.name', impact: 'help.speed.impact' },
    { stat: 'technique', name: 'help.technique.name', impact: 'help.likeSpeed' },
    { stat: 'physical', name: 'help.physical.name', impact: 'help.likeSpeed' },
    { stat: 'concentration', name: 'help.concentration.name', impact: 'help.likeSpeed' },
    { stat: 'all', name: 'help.all.name', impact: 'help.all.impact' },
    { stat: 'knockout', name: 'help.knockout.name', impact: 'help.knockout.impact' },
    { stat: 'swap', name: 'help.swap.name', impact: 'help.swap.impact' },
  ];

  function closeOnEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && controller.helpOpen) controller.helpOpen = false;
  }
</script>

<svelte:window onkeydown={closeOnEscape} />

<button class="ouvrir tampon" aria-expanded={controller.helpOpen} onclick={() => (controller.helpOpen = !controller.helpOpen)}>
  ? {t('help.button')}
</button>

{#if controller.helpOpen}
  <div class="aide" role="dialog" aria-label={t('help.label')}>
    <div class="titre">
      <h2 class="banderole-m">{t('help.title')}</h2>
      <button class="tampon fermer" onclick={() => (controller.helpOpen = false)}>{t('common.close')}</button>
    </div>
    <p class="texte-s">{t('help.halo')} <span class="vert">{t('help.green')}</span>{t('help.bonus')} {t('help.halo')} <span class="rouge">{t('help.red')}</span>{t('help.malus')}</p>
    <ul>
      {#each EFFECTS as effect (effect.stat)}
        <li class="texte-s">
          <span class="picto"><StatIcon stat={effect.stat} size={14} /></span>
          <span><span class="texte-fort">{t(effect.name)}.</span> {t(effect.impact)}</span>
        </li>
      {/each}
    </ul>
    <p class="texte-s">{t('help.footer')}</p>
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
