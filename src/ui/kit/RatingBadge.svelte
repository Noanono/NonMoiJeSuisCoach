<script lang="ts">
  import { ratingColors } from './rating';

  /** Note du joueur, sur un fond du rouge (faible) au vert (fort), avec en petit ce que lui coûte la fatigue. */
  interface Props {
    value: number;
    size?: 's' | 'm' | 'l';
    /** Points perdus à cause de la fatigue, 0 = rien à afficher. */
    malus?: number;
    /** Place le malus sous la note, là où la largeur manque. */
    stacked?: boolean;
  }

  let { value, size = 'm', malus = 0, stacked = false }: Props = $props();
  const colors = $derived(ratingColors(value));
</script>

<span class="bloc" class:empile={stacked}>
  <span class="note {size}" style:background={colors.background} style:color={colors.color}>{value}</span>
  {#if malus > 0}<span class="malus" title="Malus de fatigue : la note réelle est {value - malus}">−{malus}</span>{/if}
</span>

<style>
  .bloc {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
  .empile {
    flex-direction: column;
    gap: 0;
  }
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
  .malus {
    padding: 0 2px;
    font-family: var(--font-mono);
    font-size: 10px;
    line-height: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    background: var(--carton);
    color: var(--craie-fixe);
  }
</style>
