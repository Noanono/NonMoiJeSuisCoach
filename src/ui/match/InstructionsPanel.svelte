<script lang="ts">
  import type { Mentality } from '../../domain/types';
  import Card from '../kit/Card.svelte';
  import type { MatchController } from './controller.svelte';

  /** Consignes tactiques pendant les pauses (MATCH-05). */
  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  const MENTALITIES: { value: Mentality; label: string }[] = [
    { value: 'defensive', label: 'Défensif' },
    { value: 'balanced', label: 'Équilibré' },
    { value: 'offensive', label: 'Offensif' },
  ];

  const instructions = $derived.by(() => {
    void controller.version;
    return { ...controller.match[controller.coachSide].instructions };
  });

  const editable = $derived(!controller.running && !controller.finished);
</script>

<Card title="Consignes" tone="craie-2">
  {#if !editable && !controller.finished}
    <p class="texte-s aide">Mets pause pour changer les consignes : on ne crie pas des schémas en pleine action.</p>
  {/if}
  <fieldset disabled={!editable}>
    <legend class="tampon">Mentalité</legend>
    <div class="choix" role="group" aria-label="Mentalité">
      {#each MENTALITIES as option (option.value)}
        <button
          class="tampon option"
          aria-pressed={instructions.mentality === option.value}
          disabled={!editable}
          onclick={() => controller.updateInstructions({ mentality: option.value })}
        >
          {option.label}
        </button>
      {/each}
    </div>
    <label class="bascule texte-s">
      <input
        type="checkbox"
        checked={instructions.highPress}
        disabled={!editable}
        onchange={(event) => controller.updateInstructions({ highPress: event.currentTarget.checked })}
      />
      Pressing haut <span class="aide">(fatigue plus vite)</span>
    </label>
    <label class="bascule texte-s">
      <input
        type="checkbox"
        checked={instructions.longBall}
        disabled={!editable}
        onchange={(event) => controller.updateInstructions({ longBall: event.currentTarget.checked })}
      />
      Jeu long
    </label>
  </fieldset>
</Card>

<style>
  fieldset {
    border: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  fieldset:disabled {
    opacity: 0.6;
  }
  legend {
    padding: 0;
    margin-bottom: var(--space-1);
  }
  .choix {
    display: flex;
  }
  .option {
    flex: 1;
    min-height: 36px;
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-fin) solid var(--encre);
    cursor: pointer;
  }
  .option + .option {
    border-left: none;
  }
  .option[aria-pressed='true'] {
    background: var(--encre);
    color: var(--craie);
  }
  .option:disabled {
    cursor: not-allowed;
  }
  .bascule {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }
  .bascule input {
    width: 20px;
    height: 20px;
    accent-color: var(--encre);
  }
  .aide {
    color: var(--encre-pale);
    margin: 0 0 var(--space-2);
  }
</style>
