<script lang="ts">
  import { t } from '../../i18n/t';

  /** Pastille V/N/D : toujours une lettre, jamais la couleur seule (design system). En anglais : W/D/L. */
  interface Props {
    result: 'V' | 'N' | 'D';
  }

  let { result }: Props = $props();
  const KEY = { V: 'win', N: 'draw', D: 'loss' } as const;
</script>

<span class="badge tampon {result}" title={t(`form.${KEY[result]}`)} aria-label={t(`form.${KEY[result]}`)}>{t(`form.${KEY[result]}Letter`)}</span>

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
