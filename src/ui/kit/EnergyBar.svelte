<script lang="ts">
  /** Énergie restante : verte tant que ça va, jaune quand ça tire, rouge quand il faut le sortir. */
  interface Props {
    /** De 0 (vidé) à 100 (frais). */
    energy: number;
  }

  let { energy }: Props = $props();

  const LOW = 35;
  const MEDIUM = 65;
  const level = $derived(energy < LOW ? 'bas' : energy < MEDIUM ? 'moyen' : 'haut');
</script>

<span class="barre" title="Énergie restante : {energy} %" aria-hidden="true"><span class={level} style:width="{energy}%"></span></span>

<style>
  .barre {
    display: block;
    width: 100%;
    height: 5px;
    background: var(--craie-2);
    border: 1px solid var(--encre);
  }
  .barre span {
    display: block;
    height: 100%;
  }
  .haut {
    background: var(--victoire);
  }
  .moyen {
    background: var(--scotch);
  }
  .bas {
    background: var(--carton);
  }
</style>
