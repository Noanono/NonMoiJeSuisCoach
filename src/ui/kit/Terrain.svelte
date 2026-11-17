<script lang="ts">
  import { onMount } from 'svelte';
  import { drawTerrain } from './terrain';

  interface Props {
    lignes?: boolean;
    densite?: number;
    graine?: number;
  }

  let { lignes = false, densite = 0.5, graine = 7 }: Props = $props();
  let canvas: HTMLCanvasElement;
  let paintedWidth = 0;
  let paintedHeight = 0;

  function paint(): void {
    paintedWidth = canvas.clientWidth;
    paintedHeight = canvas.clientHeight;
    drawTerrain(canvas, { lignes, densite, graine });
  }

  // Redessine quand les options changent (écran de jeu ↔ écran de gestion).
  $effect(paint);

  onMount(() => {
    let frame = 0;
    const schedule = (force: boolean) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const resized = canvas.clientWidth !== paintedWidth || canvas.clientHeight !== paintedHeight;
        if (force || resized) paint();
      });
    };
    const resizeObserver = new ResizeObserver(() => schedule(false));
    resizeObserver.observe(canvas);
    const themeObserver = new MutationObserver(() => schedule(true));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  });
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    display: block;
    z-index: -1;
  }
</style>
