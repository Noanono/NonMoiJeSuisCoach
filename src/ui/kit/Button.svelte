<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'm' | 's';
    children: Snippet;
  }

  let { variant = 'secondary', size = 'm', children, type = 'button', ...rest }: Props = $props();
</script>

<button class="btn {variant} {size}" {type} {...rest}>
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: var(--trait-epais) solid var(--encre-fixe);
    border-radius: var(--radius-none);
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: var(--ombre-sticker);
    transition: transform 80ms ease-out, box-shadow 80ms ease-out;
  }
  .btn:active:not(:disabled) {
    transform: translate(3px, 3px);
    box-shadow: var(--ombre-presse);
  }
  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    box-shadow: none;
  }
  .primary {
    background: var(--fumigene);
    color: var(--encre-fixe);
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 22px;
    letter-spacing: 0.02em;
    padding: var(--space-2) var(--space-6);
  }
  .secondary {
    background: var(--craie);
    color: var(--encre);
    border-color: var(--encre);
  }
  .ghost {
    background: transparent;
    color: var(--encre);
    border-color: var(--encre);
    box-shadow: none;
  }
  .s {
    padding: var(--space-1) var(--space-2);
    font-size: 12px;
  }
</style>
