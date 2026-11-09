<script lang="ts">
  import type { TokenView } from './pitch';

  interface Props {
    token: TokenView;
    onactivate: (playerId: string) => void;
  }

  let { token, onactivate }: Props = $props();

  /** Au-delà, un « +n » : le détail complet est dans le panneau du joueur. */
  const VISIBLE_CHIPS = 2;
  const shownChips = $derived(token.chips.slice(0, VISIBLE_CHIPS));
  const hiddenChips = $derived(token.chips.length - shownChips.length);
</script>

<button
  class="jeton"
  class:adverse={!token.own}
  class:hors-jeu={token.status !== 'active'}
  class:surligne={token.focus.highlighted}
  class:choisi={token.focus.chosen}
  class:grise={token.focus.dimmed}
  disabled={!token.focus.interactive}
  aria-label={token.label}
  title={token.label}
  onclick={() => onactivate(token.id)}
>
  {#if token.readyCost !== null}<span class="pret tampon" aria-hidden="true">{token.readyCost}</span>{/if}
  <span class="nom texte-fort">{token.name}</span>
  <span class="note tampon" aria-hidden="true">{token.rating}</span>
  {#if token.reason}<span class="raison tampon" aria-hidden="true">{token.reason}</span>{/if}
  {#if token.chips.length > 0}
    <span class="effets" aria-hidden="true">
      {#each shownChips as chip, index (index)}
        <span class="effet tampon {chip.tone}">{chip.sign}{chip.countdown}</span>
      {/each}
      {#if hiddenChips > 0}<span class="effet tampon plus">+{hiddenChips}</span>{/if}
    </span>
  {/if}
</button>

<style>
  .jeton {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 100%;
    max-width: 92px;
    aspect-ratio: 1;
    min-height: 64px;
    padding: var(--space-1);
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    border-radius: var(--radius-none);
    box-shadow: var(--ombre-sticker);
    cursor: pointer;
    text-align: center;
    transition: transform 80ms ease-out, box-shadow 80ms ease-out;
  }
  .jeton:active:not(:disabled) {
    transform: translate(3px, 3px);
    box-shadow: var(--ombre-presse);
  }
  .jeton:disabled {
    cursor: default;
  }
  .adverse {
    background: var(--craie-2);
    border-width: var(--trait-fin);
    box-shadow: none;
  }
  .hors-jeu {
    filter: grayscale(1);
    opacity: 0.6;
  }
  .grise {
    opacity: 0.3;
  }
  .surligne {
    outline: 5px solid var(--scotch);
    outline-offset: 1px;
    opacity: 1;
  }
  .choisi {
    background: var(--scotch);
    color: var(--encre-fixe);
    border-color: var(--encre-fixe);
  }
  .jeton:focus-visible {
    outline: var(--trait-epais) dashed var(--fumigene);
    outline-offset: 3px;
  }
  .nom {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    line-height: 16px;
  }
  .note {
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  .raison {
    font-size: 10px;
    line-height: 12px;
    padding: 0 2px;
    border: var(--trait-fin) solid currentColor;
  }
  .pret {
    position: absolute;
    top: -8px;
    right: -8px;
    min-width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    background: var(--scotch);
    color: var(--encre-fixe);
    border: var(--trait-fin) solid var(--encre-fixe);
    letter-spacing: 0;
  }
  .effets {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px;
  }
  .effet {
    padding: 0 2px;
    font-size: 10px;
    line-height: 14px;
    letter-spacing: 0;
    border: 1px solid var(--encre);
    font-variant-numeric: tabular-nums;
  }
  .bonus {
    background: var(--victoire);
    color: var(--craie);
  }
  .malus {
    background: var(--carton);
    color: var(--craie);
  }
  .plus {
    background: var(--craie-2);
    color: var(--encre);
  }
  @media (max-width: 600px) {
    .jeton {
      min-height: 56px;
    }
    .nom {
      font-size: 11px;
      line-height: 14px;
    }
  }
</style>
