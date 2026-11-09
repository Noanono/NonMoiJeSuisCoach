<script lang="ts" module>
  import type { Position, Rarity } from '../../../domain/types';
  import type { AvatarPlayer } from '../../kit/avatar';

  export interface CardPlayer {
    id: string;
    name: string;
    lastName: string;
    position: Position;
    overall: number;
    available: boolean;
    availability: string | null;
    fatigue: number;
    avatar: AvatarPlayer;
    abilityName: string;
    rarity: Rarity | null;
    /** Note effective à chaque poste (poste, fatigue : EFF-02, EFF-04). */
    ratingAt: Record<Position, number>;
  }
</script>

<script lang="ts">
  import PlayerAvatar from '../../kit/PlayerAvatar.svelte';
  import RatingBadge from '../../kit/RatingBadge.svelte';
  import { POSITION_SHORT } from '../describe';

  /** Carte d'un joueur à glisser sur l'écran Tactique. */
  interface Props {
    player: CardPlayer;
    /** Note au poste occupé, sinon la note générale. */
    rating?: number;
    /** Points perdus hors de son poste (EFF-02), 0 s'il y est. */
    positionPenalty?: number;
    selected?: boolean;
    dragging?: boolean;
    onpointerdown?: (event: PointerEvent) => void;
    onclick?: () => void;
    ghost?: boolean;
  }

  let { player, rating, positionPenalty = 0, selected = false, dragging = false, onpointerdown, onclick, ghost = false }: Props = $props();
  const shownRating = $derived(rating ?? player.overall);
  const label = $derived(
    `${player.name}, ${POSITION_SHORT[player.position]}, note ${shownRating}${positionPenalty > 0 ? `, hors poste, moins ${positionPenalty}` : ''}${player.availability ? `, ${player.availability}` : ''}${selected ? ', sélectionné' : ''}`,
  );
</script>

{#snippet face()}
  <span class="bandeau {player.rarity ?? 'inconnue'}" aria-hidden="true"></span>
  <span class="tete">
    <PlayerAvatar player={player.avatar} size={46} />
    <span class="chiffres">
      <RatingBadge value={shownRating} />
      <span class="poste tampon">{POSITION_SHORT[player.position]}</span>
    </span>
  </span>
  <span class="nom">{player.lastName}</span>
  <span class="capacite">{player.abilityName}</span>
  <span class="fatigue" aria-hidden="true"><span style:width="{player.fatigue}%"></span></span>
  {#if positionPenalty > 0}<span class="tampon alerte">Hors poste −{positionPenalty}</span>{/if}
  {#if player.availability}<span class="tampon indispo">{player.availability}</span>{/if}
{/snippet}

{#if ghost}
  <div class="carte fantome" aria-hidden="true">{@render face()}</div>
{:else}
  <button
    type="button"
    class="carte"
    class:choisie={selected}
    class:absente={dragging}
    class:hors-service={!player.available}
    aria-label={label}
    aria-pressed={selected}
    title={label}
    {onpointerdown}
    {onclick}
  >
    {@render face()}
  </button>
{/if}

<style>
  .carte {
    position: relative;
    display: grid;
    gap: 2px;
    align-content: start;
    width: 104px;
    padding: 0 var(--space-1) var(--space-1);
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre-fixe);
    box-shadow: var(--ombre-sticker);
    cursor: grab;
    text-align: left;
    touch-action: none;
    user-select: none;
    font-size: 13px;
    line-height: 16px;
  }
  .carte:focus-visible {
    outline: var(--trait-epais) dashed var(--fumigene);
    outline-offset: 3px;
  }
  .fantome {
    cursor: grabbing;
    transform: rotate(var(--rotation-sticker));
    box-shadow: 8px 8px 0 color-mix(in srgb, var(--encre-fixe) 50%, transparent);
  }
  .absente {
    opacity: 0.25;
  }
  .choisie {
    outline: 5px solid var(--scotch);
    outline-offset: 1px;
  }
  .hors-service .tete {
    filter: grayscale(1);
  }
  .bandeau {
    display: block;
    height: 6px;
    margin: 0 calc(var(--space-1) * -1) var(--space-1);
    background: var(--craie-2);
    border-bottom: var(--trait-fin) solid var(--encre-fixe);
  }
  .bandeau.rare {
    background: var(--scotch);
  }
  .bandeau.legendary {
    background: var(--fumigene);
  }
  .tete {
    display: flex;
    gap: var(--space-1);
    align-items: flex-start;
  }
  .chiffres {
    display: grid;
    justify-items: end;
    flex: 1;
  }
  .poste {
    color: var(--encre-pale);
    font-size: 11px;
  }
  .nom {
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .capacite {
    font-size: 11px;
    line-height: 13px;
    color: var(--encre-pale);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fatigue {
    display: block;
    height: 4px;
    background: var(--craie-2);
    border: 1px solid var(--encre);
  }
  .fatigue span {
    display: block;
    height: 100%;
    background: var(--carton);
  }
  .alerte,
  .indispo {
    font-size: 10px;
    line-height: 13px;
    padding: 0 2px;
    text-align: center;
  }
  .alerte {
    background: var(--scotch);
    color: var(--encre-fixe);
  }
  .indispo {
    background: var(--carton);
    color: var(--craie);
  }
  @media (max-width: 600px) {
    .carte {
      width: 84px;
      font-size: 12px;
    }
  }
</style>
