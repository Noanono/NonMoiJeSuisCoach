<script lang="ts">
  /** Évolution de la note depuis le début de la saison : vert si elle monte, rouge si elle baisse. */
  interface Props {
    value: number;
  }

  let { value }: Props = $props();
  const label = $derived(value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '=');
  const title = $derived(value === 0 ? 'Note stable depuis le début de la saison' : `${label} depuis le début de la saison`);
</script>

<span class="delta tampon" class:hausse={value > 0} class:baisse={value < 0} {title}>{label}</span>

<style>
  .delta {
    display: inline-block;
    min-width: 2.2em;
    padding: 0 3px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    border: var(--trait-fin) solid var(--encre);
    color: var(--encre-pale);
  }
  .hausse {
    background: var(--victoire);
    color: var(--craie);
  }
  .baisse {
    background: var(--carton);
    color: var(--craie);
  }
</style>
