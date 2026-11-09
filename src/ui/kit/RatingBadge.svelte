<script lang="ts">
  import { ratingColors } from './rating';

  /** Note générale, sur un fond qui va du rouge (faible) au vert (fort). */
  interface Props {
    value: number;
    size?: 's' | 'm' | 'l';
  }

  let { value, size = 'm' }: Props = $props();
  const colors = $derived(ratingColors(value));
</script>

<span class="note {size}" style:background={colors.background} style:color={colors.color}>{value}</span>

<style>
  .note {
    display: inline-block;
    min-width: 1.9em;
    padding: 0 3px;
    text-align: center;
    font-family: var(--font-mono);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    border: var(--trait-fin) solid var(--encre-fixe);
  }
  .s {
    font-size: 12px;
    line-height: 15px;
  }
  .m {
    font-size: 16px;
    line-height: 22px;
  }
  .l {
    font-size: 26px;
    line-height: 34px;
  }
</style>
