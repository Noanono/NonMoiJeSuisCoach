<script lang="ts">
  import type { ActiveStat } from '../../domain/match';

  /** Picto d'un effet : trait épais, coins carrés, monochrome (design system). */
  interface Props {
    stat: ActiveStat;
    size?: number;
  }

  let { stat, size = 12 }: Props = $props();
</script>

<svg viewBox="0 0 12 12" width={size} height={size} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true" focusable="false">
  {#if stat === 'speed'}
    <path d="M2 2l4 4-4 4M6 2l4 4-4 4" />
  {:else if stat === 'technique'}
    <path d="M6 1l4 5-4 5-4-5z" />
  {:else if stat === 'physical'}
    <path d="M1 3v6M3.5 2v8M8.5 2v8M11 3v6M3.5 6h5" />
  {:else if stat === 'shooting'}
    <rect x="2" y="2" width="8" height="8" /><path d="M6 5.5v1" />
  {:else if stat === 'defense'}
    <path d="M2 2h8v5l-4 3.5L2 7z" />
  {:else if stat === 'goalkeeping'}
    <path d="M1 11V2h10v9" />
  {:else if stat === 'concentration'}
    <path d="M1 6c2-4 8-4 10 0-2 4-8 4-10 0z" /><path d="M6 5.5v1" />
  {:else if stat === 'knockout'}
    <path d="M2 2l8 8M10 2l-8 8" />
  {:else if stat === 'swap'}
    <path d="M1 4h9M7 1l3 3-3 3M11 8H2M5 5L2 8l3 3" stroke-width="1.5" />
  {:else}
    <path d="M6 1v10M1 6h10" />
  {/if}
</svg>
