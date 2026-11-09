<script lang="ts">
  import type { Rarity } from '../../domain/types';

  /** Texte d'une capacité sur la couleur de sa rareté : gris commune, jaune rare, rouge légendaire. */
  interface Props {
    rarity: Rarity | null;
    text: string;
  }

  let { rarity, text }: Props = $props();
</script>

<span class="tag {rarity ?? 'inconnue'}" title={text}>{text}</span>

<style>
  .tag {
    display: inline-block;
    max-width: 100%;
    padding: 0 var(--space-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
    font-weight: 700;
    border: 1px solid var(--encre-fixe);
    color: var(--encre-fixe);
  }
  .common {
    background: #d5d1c4;
  }
  .rare {
    background: var(--scotch);
  }
  .legendary {
    background: var(--fumigene);
  }
  .inconnue {
    background: none;
    border-color: var(--encre-pale);
    color: var(--encre-pale);
  }
</style>
