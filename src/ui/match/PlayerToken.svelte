<script lang="ts">
  import EnergyBar from '../kit/EnergyBar.svelte';
  import PlayerAvatar from '../kit/PlayerAvatar.svelte';
  import RatingBadge from '../kit/RatingBadge.svelte';
  import StatIcon from '../kit/StatIcon.svelte';
  import type { TokenView } from './pitch';

  interface Props {
    token: TokenView;
    onactivate: (playerId: string) => void;
    ondragstart?: (event: PointerEvent, playerId: string) => void;
    /** Pendant un glisser : ce jeton accepte le changement. */
    dropTarget?: boolean;
    /** Pendant un glisser : le pointeur est dessus. */
    hovered?: boolean;
    /** Ce jeton est celui qu'on déplace. */
    lifted?: boolean;
  }

  let { token, onactivate, ondragstart, dropTarget = false, hovered = false, lifted = false }: Props = $props();

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
  class:halo-bonus={token.halo === 'bonus'}
  class:halo-malus={token.halo === 'malus'}
  class:a-glisser={token.draggable}
  class:cible-changement={dropTarget}
  class:survol-changement={hovered && dropTarget}
  class:souleve={lifted}
  data-player-id={token.id}
  disabled={!token.focus.interactive}
  aria-label={token.label}
  title={token.label}
  onclick={() => onactivate(token.id)}
  onpointerdown={(event) => token.draggable && ondragstart?.(event, token.id)}
>
  {#if token.readyCost !== null}<span class="pret tampon {token.readyRarity}" aria-hidden="true">{token.readyCost}</span>{/if}
  <span class="portrait">
    <PlayerAvatar player={token.avatar} size={30} />
    <span class="note" aria-hidden="true"><RatingBadge value={token.rating} size="s" /></span>
  </span>
  <span class="nom texte-fort">{token.name}</span>
  <span class="poste tampon" class:deplace={token.displaced} aria-hidden="true">{token.position}</span>
  <EnergyBar energy={token.energy} />
  {#if token.reason}<span class="raison tampon" aria-hidden="true">{token.reason}</span>{/if}
  {#if token.chips.length > 0}
    <span class="effets" aria-hidden="true">
      {#each shownChips as chip, index (index)}
        <span class="effet tampon {chip.tone}"><StatIcon stat={chip.stat} size={10} />{chip.countdown}</span>
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
    max-width: 72px;
    min-height: 62px;
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
  /* Halo : le joueur est sous l'effet d'une capacité (bonus en vert, malus en rouge). */
  .halo-bonus {
    box-shadow: 0 0 0 4px var(--victoire);
  }
  .halo-malus {
    box-shadow: 0 0 0 4px var(--carton);
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
  .a-glisser {
    touch-action: none;
    user-select: none;
  }
  .cible-changement {
    outline: var(--trait-epais) dashed var(--scotch);
    outline-offset: 1px;
  }
  .survol-changement {
    outline: 5px solid var(--scotch);
    background: var(--scotch);
    color: var(--encre-fixe);
  }
  .souleve {
    opacity: 0.3;
  }
  .jeton:focus-visible {
    outline: var(--trait-epais) dashed var(--fumigene);
    outline-offset: 3px;
  }
  .portrait {
    position: relative;
    display: block;
  }
  .note {
    position: absolute;
    right: -14px;
    bottom: -3px;
  }
  .poste {
    font-size: 10px;
    line-height: 12px;
    letter-spacing: 0;
    padding: 0 2px;
    color: var(--encre-pale);
  }
  .deplace {
    background: var(--scotch);
    color: var(--encre-fixe);
  }
  .nom {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    line-height: 14px;
  }
  .raison {
    font-size: 10px;
    line-height: 12px;
    padding: 0 2px;
    border: var(--trait-fin) solid currentColor;
  }
  .pret {
    position: absolute;
    z-index: 1;
    top: -8px;
    right: -8px;
    min-width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    background: var(--craie-fixe);
    color: var(--encre-fixe);
    border: var(--trait-fin) solid var(--encre-fixe);
    letter-spacing: 0;
  }
  .pret.rare {
    background: var(--scotch);
  }
  .pret.legendary {
    background: var(--fumigene);
  }
  .effets {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px;
  }
  .effet {
    display: inline-flex;
    align-items: center;
    gap: 1px;
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
      min-height: 64px;
    }
    .nom {
      font-size: 11px;
      line-height: 14px;
    }
  }
</style>
