<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tone?: 'scotch' | 'fumigene' | 'craie' | 'mythique';
    tilted?: boolean;
    children: Snippet;
  }

  let { tone = 'scotch', tilted = false, children }: Props = $props();
</script>

<span class="sticker tampon {tone}" class:tilted>{@render children()}</span>

<style>
  .sticker {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
    border: var(--trait-fin) solid var(--encre-fixe);
    color: var(--encre-fixe);
    white-space: nowrap;
  }
  .scotch { background: var(--scotch); }
  .fumigene { background: var(--fumigene); }
  .craie { background: var(--craie); color: var(--encre); border-color: var(--encre); }
  .mythique { background: var(--mythique); color: var(--scotch); border-color: var(--scotch); }
  .tilted {
    transform: rotate(var(--rotation-sticker));
    box-shadow: var(--ombre-sticker);
  }
</style>
