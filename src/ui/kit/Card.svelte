<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    /** Bande de scotch décorative en haut de la carte (un ou deux par écran maximum). */
    scotch?: boolean;
    tone?: 'craie' | 'craie-2';
    children: Snippet;
    actions?: Snippet;
  }

  let { title, scotch = false, tone = 'craie', children, actions }: Props = $props();
</script>

<section class="card {tone}">
  {#if scotch}<span class="scotch" aria-hidden="true"></span>{/if}
  {#if title || actions}
    <header>
      {#if title}<h2 class="banderole-m">{title}</h2>{/if}
      {#if actions}<div class="actions">{@render actions()}</div>{/if}
    </header>
  {/if}
  {@render children()}
</section>

<style>
  .card {
    position: relative;
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    border-radius: var(--radius-none);
    box-shadow: var(--ombre-sticker);
    padding: var(--space-4);
    min-width: 0;
  }
  .craie-2 {
    background: var(--craie-2);
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
  }
  .actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .scotch {
    position: absolute;
    top: -14px;
    left: 50%;
    width: 120px;
    height: 26px;
    margin-left: -60px;
    background: repeating-linear-gradient(45deg, var(--scotch) 0 12px, color-mix(in srgb, var(--scotch) 80%, var(--encre-fixe)) 12px 14px);
    border: var(--trait-fin) solid var(--encre-fixe);
    transform: rotate(var(--rotation-scotch));
  }
</style>
