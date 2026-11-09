<script lang="ts">
  /** Barre segmentée (Jauge de Gueulante, fatigue, moral, confiance). */
  interface Props {
    value: number;
    max: number;
    label: string;
    segments?: number;
    tone?: 'fumigene' | 'scotch' | 'victoire' | 'carton';
  }

  let { value, max, label, segments = 10, tone = 'fumigene' }: Props = $props();
  const filled = $derived(Math.round((Math.max(0, Math.min(value, max)) / max) * segments));
</script>

<div class="gauge" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
  {#each { length: segments } as _, i (i)}
    <span class="seg" class:on={i < filled} style:--tone="var(--{tone})"></span>
  {/each}
</div>

<style>
  .gauge {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 2px;
    min-width: 80px;
  }
  .seg {
    height: 12px;
    border: var(--trait-fin) solid var(--encre);
    background: var(--craie-2);
  }
  .on {
    background: var(--tone);
  }
</style>
