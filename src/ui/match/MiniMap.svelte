<script lang="ts">
  import type { MatchController } from './controller.svelte';
  import { minuteIntervalMs } from './live';
  import { MAP_HEIGHT, MAP_PHASES, MAP_WIDTH, minimapFrame } from './minimap';

  /** Petite carte animée : les joueurs et le ballon, pour suivre les actions d'un coup d'œil. */
  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  let phase = $state(0);
  const stepMs = $derived(minuteIntervalMs(controller.speed) / MAP_PHASES);

  // Trois déplacements par minute de jeu ; un seul minuteur, coupé dès que le match s'arrête (green code).
  $effect(() => {
    void controller.version;
    phase = 0;
    if (!controller.running) {
      if (controller.engineWaiting || controller.paused) phase = MAP_PHASES - 1;
      return;
    }
    const timer = setInterval(() => (phase = Math.min(phase + 1, MAP_PHASES - 1)), stepMs);
    return () => clearInterval(timer);
  });

  const frame = $derived.by(() => {
    void controller.version;
    return minimapFrame(controller.match, controller.coachSide, phase);
  });
</script>

<section class="carte" style:--pas="{stepMs}ms" aria-label="Carte du match : ton équipe attaque vers la droite">
  <svg viewBox="-3 -1 {MAP_WIDTH + 6} {MAP_HEIGHT + 2}" aria-hidden="true" focusable="false">
    <rect class="herbe" x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} />
    <g class="traces">
      <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} />
      <line x1={MAP_WIDTH / 2} y1="0" x2={MAP_WIDTH / 2} y2={MAP_HEIGHT} />
      <circle cx={MAP_WIDTH / 2} cy={MAP_HEIGHT / 2} r="9" />
      <rect x="0" y={MAP_HEIGHT / 2 - 18} width="16" height="36" />
      <rect x={MAP_WIDTH - 16} y={MAP_HEIGHT / 2 - 18} width="16" height="36" />
      <rect x="-2" y={MAP_HEIGHT / 2 - 4} width="2" height="8" />
      <rect x={MAP_WIDTH} y={MAP_HEIGHT / 2 - 4} width="2" height="8" />
    </g>
    {#each frame.dots as dot (dot.id)}
      <g class="pion" style:transform="translate({dot.x}px, {dot.y}px)">
        <circle class:toi={dot.own} class:eux={!dot.own} class:sol={dot.down} class:tireur={dot.shooter} r={dot.shooter ? 2.6 : 2} />
      </g>
    {/each}
    <g class="pion" style:transform="translate({frame.ball.x}px, {frame.ball.y}px)">
      <circle class="ballon" r="1.4" />
    </g>
    {#if frame.goal}<text class="but" x={MAP_WIDTH / 2} y={MAP_HEIGHT / 2 + 6}>BUT !</text>{/if}
  </svg>
  <p class="legende tampon"><span class="pastille toi"></span>Toi <span class="pastille eux"></span>En face <span class="pastille ballon"></span>Ballon</p>
</section>

<style>
  .carte {
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    box-shadow: var(--ombre-sticker);
    padding: var(--space-1);
  }
  svg {
    display: block;
    width: 100%;
  }
  .herbe {
    fill: var(--terrain);
  }
  .traces * {
    fill: none;
    stroke: var(--ligne);
    stroke-width: 0.6;
  }
  .pion {
    transition: transform var(--pas) linear;
  }
  circle {
    stroke: var(--encre-fixe);
    stroke-width: 0.5;
  }
  .toi {
    fill: var(--scotch);
    background: var(--scotch);
  }
  .eux {
    fill: var(--fumigene);
    background: var(--fumigene);
  }
  .sol {
    opacity: 0.35;
  }
  .tireur {
    stroke: var(--craie-fixe);
    stroke-width: 0.8;
  }
  .ballon {
    fill: var(--craie-fixe);
    background: var(--craie-fixe);
  }
  .but {
    font-family: var(--font-display);
    font-size: 16px;
    text-anchor: middle;
    fill: var(--craie-fixe);
    stroke: var(--encre-fixe);
    stroke-width: 0.6;
  }
  .legende {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin: var(--space-1) 0 0;
    font-size: 11px;
  }
  .pastille {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-left: var(--space-2);
    border: 1px solid var(--encre-fixe);
    border-radius: var(--radius-pill);
  }
  @media (prefers-reduced-motion: reduce) {
    .pion {
      transition: none;
    }
  }
</style>
