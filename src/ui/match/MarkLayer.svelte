<script lang="ts">
  import { tick } from 'svelte';
  import type { MatchController } from './controller.svelte';
  import { markLinks } from './pitch';
  import { t } from '../../i18n/t';

  /**
   * Marquage (M1) : tant qu'il dure, un trait relie le marqueur au joueur qu'il colle.
   * Les jetons sont mesurés après chaque minute et quand le terrain change de taille.
   */
  interface Props {
    controller: MatchController;
    root: HTMLElement | undefined;
  }

  let { controller, root }: Props = $props();

  interface Line {
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    own: boolean;
  }

  let size = $state({ width: 0, height: 0 });
  let lines = $state.raw<Line[]>([]);
  let resized = $state(0);

  const links = $derived.by(() => {
    void controller.version;
    return markLinks(controller.match, controller.coachSide);
  });

  $effect(() => {
    if (!root) return;
    const observer = new ResizeObserver(() => resized++);
    observer.observe(root);
    return () => observer.disconnect();
  });

  $effect(() => {
    void resized;
    const current = links;
    const container = root;
    if (!container || current.length === 0) {
      lines = [];
      return;
    }
    void tick().then(() => {
      const origin = container.getBoundingClientRect();
      const center = (id: string) => {
        const element = container.querySelector(`[data-player-id="${CSS.escape(id)}"]`);
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { x: box.x - origin.x + box.width / 2, y: box.y - origin.y + box.height / 2 };
      };
      size = { width: origin.width, height: origin.height };
      lines = current.flatMap((link) => {
        const from = center(link.markerId);
        const to = center(link.targetId);
        return from && to ? [{ key: `${link.markerId}>${link.targetId}`, x1: from.x, y1: from.y, x2: to.x, y2: to.y, own: link.own }] : [];
      });
    });
  });
</script>

{#if lines.length > 0}
  <svg class="marquages" viewBox="0 0 {size.width} {size.height}" preserveAspectRatio="none" aria-hidden="true">
    {#each lines as line (line.key)}
      <g class:leur={!line.own}>
        <line class="corde" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
        <circle cx={line.x1} cy={line.y1} r="5" />
        <circle cx={line.x2} cy={line.y2} r="5" />
        <text x={(line.x1 + line.x2) / 2} y={(line.y1 + line.y2) / 2 - 6}>{t('pitchView.marking')}</text>
      </g>
    {/each}
  </svg>
{/if}

<style>
  .marquages {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
    pointer-events: none;
    overflow: visible;
  }
  .corde {
    stroke: var(--scotch);
    stroke-width: 3;
    stroke-dasharray: 2 7;
    stroke-linecap: round;
  }
  circle {
    fill: var(--scotch);
    stroke: var(--encre-fixe);
    stroke-width: 1.5;
  }
  text {
    fill: var(--scotch);
    stroke: var(--encre-fixe);
    stroke-width: 3px;
    paint-order: stroke;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    text-anchor: middle;
    letter-spacing: 0.08em;
  }
  .leur .corde {
    stroke: var(--fumigene);
  }
  .leur circle,
  .leur text {
    fill: var(--fumigene);
  }
  @media (prefers-reduced-motion: no-preference) {
    .corde {
      animation: tire 1200ms linear infinite;
    }
  }
  @keyframes tire {
    to {
      stroke-dashoffset: -18;
    }
  }
</style>
