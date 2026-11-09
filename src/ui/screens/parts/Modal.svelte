<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Fenêtre modale sur `<dialog>` : focus piégé et touche Échap fournis par la plateforme.
   * Le parent l'affiche avec un `{#if}` et la retire dans `onclose`.
   */
  interface Props {
    title: string;
    /** Sur-titre en tampon (ex. « Fiche joueur »). */
    kicker?: string;
    onclose: () => void;
    children: Snippet;
    actions?: Snippet;
  }

  let { title, kicker, onclose, children, actions }: Props = $props();
  let dialog: HTMLDialogElement;
  const titleId = $props.id();

  $effect(() => {
    dialog.showModal();
    return () => dialog.close();
  });

  function cancel(event: Event): void {
    event.preventDefault();
    onclose();
  }
</script>

<dialog bind:this={dialog} aria-labelledby={titleId} oncancel={cancel}>
  <header>
    <div>
      {#if kicker}<p class="tampon kicker">{kicker}</p>{/if}
      <h2 id={titleId} class="banderole-m">{title}</h2>
    </div>
    <button class="fermer tampon" onclick={onclose} aria-label="Fermer la fenêtre">Fermer</button>
  </header>
  <div class="contenu">
    {@render children()}
  </div>
  {#if actions}
    <footer>{@render actions()}</footer>
  {/if}
</dialog>

<style>
  dialog {
    width: min(760px, 94vw);
    max-height: 90vh;
    padding: 0;
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    border-radius: var(--radius-none);
    box-shadow: var(--ombre-sticker);
    overflow: auto;
  }
  dialog::backdrop {
    background: rgb(20 19 15 / 0.6);
  }
  header {
    position: sticky;
    top: 0;
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--craie);
    border-bottom: var(--trait-fin) solid var(--encre);
    z-index: 1;
  }
  .kicker {
    margin: 0 0 var(--space-1);
    color: var(--encre-pale);
  }
  .fermer {
    background: none;
    border: var(--trait-fin) solid var(--encre);
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
  }
  .contenu {
    padding: var(--space-4);
    display: grid;
    gap: var(--space-4);
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-4);
    border-top: var(--trait-fin) solid var(--encre);
  }
</style>
