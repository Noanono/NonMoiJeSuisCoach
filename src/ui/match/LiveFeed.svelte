<script lang="ts">
  import Card from '../kit/Card.svelte';
  import type { MatchController } from './controller.svelte';
  import { lastGoalText, LIVE_LIMIT, liveLines } from './live';

  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  let showAll = $state(false);

  const total = $derived.by(() => {
    void controller.version;
    return controller.match.events.length;
  });

  // Les lignes gardent leur clé (index dans le live) : seules les nouvelles sont rendues.
  const lines = $derived.by(() => {
    void total;
    return liveLines(controller.match.events, controller.coachSide, showAll ? 0 : LIVE_LIMIT);
  });

  // Région `aria-live` limitée aux buts : recalculée seulement quand le nombre de buts change.
  const goalCount = $derived.by(() => {
    void controller.version;
    return controller.match.goals.length;
  });
  const goalAnnouncement = $derived(goalCount > 0 ? lastGoalText(controller.match.events) : '');
</script>

<Card title="Live">
  {#snippet actions()}
    {#if total > LIVE_LIMIT}
      <button class="tampon voir" onclick={() => (showAll = !showAll)}>
        {showAll ? 'Réduire' : `Tout voir (${total})`}
      </button>
    {/if}
  {/snippet}

  <p class="annonce" aria-live="polite">{goalAnnouncement}</p>

  <ol class="fil" aria-label="Live texte, le plus récent en haut">
    {#each lines as line (line.key)}
      <li class="ligne {line.tone}">
        <span class="minute tampon">{line.minute}</span>
        <span class="texte texte-s">
          {#if line.tag}<span class="tag tampon">{line.tag}</span>{/if}
          {line.text}
        </span>
      </li>
    {/each}
  </ol>
</Card>

<style>
  .annonce {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .voir {
    background: none;
    border: var(--trait-fin) solid var(--encre);
    padding: 0 var(--space-2);
    cursor: pointer;
  }
  .fil {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 52vh;
    overflow-y: auto;
    border-top: var(--trait-fin) solid var(--encre);
  }
  .ligne {
    display: grid;
    grid-template-columns: 3.5em minmax(0, 1fr);
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-bottom: var(--trait-fin) solid var(--craie-2);
    border-left: var(--trait-epais) solid transparent;
  }
  .ligne:nth-child(even) {
    background: var(--craie-2);
  }
  .minute {
    font-variant-numeric: tabular-nums;
    padding-top: 2px;
  }
  .tag {
    display: inline-block;
    margin-right: var(--space-1);
    padding: 0 var(--space-1);
    border: var(--trait-fin) solid currentColor;
    font-size: 10px;
    line-height: 14px;
  }
  .goal {
    border-left-color: var(--fumigene);
  }
  .goal .texte {
    font-weight: 700;
  }
  .goal .tag {
    background: var(--fumigene);
    color: var(--encre-fixe);
    border-color: var(--encre-fixe);
  }
  .mine {
    border-left-color: var(--victoire);
  }
  .theirs {
    border-left-color: var(--carton);
  }
  .theirs .texte {
    font-weight: 700;
  }
  .theirs .tag {
    background: var(--carton);
    color: var(--craie);
    border-color: var(--carton);
  }
  .ligne.combo {
    background: repeating-linear-gradient(
      45deg,
      var(--scotch) 0 12px,
      color-mix(in srgb, var(--scotch) 85%, var(--encre-fixe)) 12px 14px
    );
    color: var(--encre-fixe);
    border-left-color: var(--encre-fixe);
  }
  .ligne.card .tag {
    background: var(--scotch);
    color: var(--encre-fixe);
  }
  .window .tag {
    background: var(--encre);
    color: var(--craie);
  }
  @media (prefers-reduced-motion: no-preference) {
    .ligne:first-child {
      animation: arrivee 160ms ease-out;
    }
  }
  @keyframes arrivee {
    from {
      transform: translateY(-4px);
      opacity: 0.4;
    }
  }
</style>
