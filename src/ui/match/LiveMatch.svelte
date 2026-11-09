<script lang="ts">
  import type { MatchState, Side } from '../../domain/match';
  import Button from '../kit/Button.svelte';
  import { MatchController } from './controller.svelte';
  import { minuteIntervalMs } from './live';
  import Pitch from './Pitch.svelte';
  import Scoreboard from './Scoreboard.svelte';

  interface Props {
    match: MatchState;
    coachSide: Side;
  }

  let { match, coachSide }: Props = $props();

  // Le contrôleur vit le temps du composant : `{#key}` dans MatchScreen en recrée un par match.
  // svelte-ignore state_referenced_locally
  const controller = new MatchController(match, coachSide);

  // Horloge (MATCH-02) : un seul intervalle, recréé seulement quand la vitesse change,
  // coupé dès la pause, l'attente du coach, la fin du match ou le démontage (green code).
  $effect(() => {
    if (!controller.running) return;
    const timer = setInterval(() => controller.step(), minuteIntervalMs(controller.speed));
    return () => clearInterval(timer);
  });

  /** Onglet caché : on met en pause plutôt que de simuler pour personne. */
  function pauseWhenHidden(): void {
    if (document.hidden && controller.running) controller.paused = true;
  }
</script>

<svelte:document onvisibilitychange={pauseWhenHidden} />

<main class="match">
  <Scoreboard {controller} />

  {#if controller.finished}
    <div class="sifflet">
      <Button variant="primary" onclick={() => controller.whistle()}>Coup de sifflet final</Button>
    </div>
  {/if}

  <div class="disposition">
    <Pitch {controller} />
    <aside class="cote"></aside>
  </div>
</main>

<style>
  .match {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4) var(--marge-page) var(--space-10);
    max-width: 1440px;
    margin: 0 auto;
  }
  .sifflet {
    display: flex;
    justify-content: center;
  }
  .disposition {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
    gap: var(--space-6);
    align-items: start;
  }
  .cote {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }
  @media (max-width: 900px) {
    .disposition {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
