<script lang="ts">
  import { store } from '../store.svelte';

  const TOAST_DURATION_MS = 4000;

  $effect(() => {
    if (!store.toast) return;
    const timer = setTimeout(() => (store.toast = null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  });
</script>

{#if store.toast}
  <div class="toast" role="status">{store.toast}</div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%) rotate(var(--rotation-sticker));
    max-width: min(90vw, 520px);
    background: var(--scotch);
    color: var(--encre-fixe);
    border: var(--trait-epais) solid var(--encre-fixe);
    box-shadow: var(--ombre-sticker);
    padding: var(--space-2) var(--space-4);
    font-weight: 700;
    z-index: 10;
  }
</style>
