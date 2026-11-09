<script lang="ts">
  /** Pastille V/N/D : toujours une lettre, jamais la couleur seule (design system). */
  interface Props {
    result: 'V' | 'N' | 'D';
  }

  let { result }: Props = $props();
  const LABEL = { V: 'Victoire', N: 'Nul', D: 'Défaite' } as const;
</script>

<span class="badge tampon {result}" title={LABEL[result]} aria-label={LABEL[result]}>{result}</span>

<style>
  .badge {
    display: inline-grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-pill);
    border: var(--trait-fin) solid var(--encre);
    letter-spacing: 0;
  }
  .V { background: var(--victoire); color: var(--craie-fixe); }
  .N { background: var(--craie-2); color: var(--encre); }
  .D { background: var(--carton); color: var(--craie-fixe); }
</style>
