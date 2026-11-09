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
  import EnergyBar from '../../kit/EnergyBar.svelte';
  import PlayerAvatar from '../../kit/PlayerAvatar.svelte';
  import RarityTag from '../../kit/RarityTag.svelte';
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
    /** Version resserrée, pour le banc et la tribune. */
    compact?: boolean;
    onpointerdown?: (event: PointerEvent) => void;
    onclick?: () => void;
    /** Ouvre la fiche du joueur. */
    oninfo?: () => void;
    ghost?: boolean;
  }

  let { player, rating, positionPenalty = 0, selected = false, dragging = false, compact = false, onpointerdown, onclick, oninfo, ghost = false }: Props = $props();
  const shownRating = $derived(rating ?? player.overall);
  const label = $derived(
    `${player.name}, ${POSITION_SHORT[player.position]}, note ${shownRating}, énergie ${100 - player.fatigue} %${positionPenalty > 0 ? `, hors poste, moins ${positionPenalty}` : ''}${player.availability ? `, ${player.availability}` : ''}${selected ? ', sélectionné' : ''}`,
  );
</script>

{#snippet face()}
  <span class="tete">
    <PlayerAvatar player={player.avatar} size={compact ? 32 : 44} />
    <span class="chiffres">
      <RatingBadge value={shownRating} size={compact ? 's' : 'm'} />
      <span class="poste tampon">{POSITION_SHORT[player.position]}</span>
    </span>
  </span>
  <span class="nom">{player.lastName}</span>
  <span class="capacite"><RarityTag rarity={player.rarity} text={player.abilityName} /></span>
  <EnergyBar energy={100 - player.fatigue} />
  {#if positionPenalty > 0}<span class="tampon alerte">Hors poste −{positionPenalty}</span>{/if}
  {#if player.availability}<span class="tampon indispo">{player.availability}</span>{/if}
{/snippet}

{#if ghost}
  <div class="carte fantome" class:compacte={compact} aria-hidden="true">{@render face()}</div>
{:else}
  <div class="conteneur">
    <button
      type="button"
      class="carte"
      class:compacte={compact}
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
    {#if oninfo}
      <button type="button" class="info tampon" aria-label="Fiche de {player.name}" title="Voir la fiche" onclick={oninfo}>i</button>
    {/if}
  </div>
{/if}

<style>
  .conteneur {
    position: relative;
  }
  .carte {
    position: relative;
    display: grid;
    gap: 2px;
    align-content: start;
    width: var(--largeur-carte, 104px);
    padding: var(--space-1);
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
  .compacte {
    font-size: 11px;
    line-height: 13px;
    box-shadow: 2px 2px 0 var(--encre-fixe);
    border-width: var(--trait-fin);
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
  .info {
    position: absolute;
    z-index: 1;
    top: -7px;
    left: -7px;
    width: 18px;
    height: 18px;
    padding: 0;
    font-size: 11px;
    line-height: 14px;
    background: var(--encre-fixe);
    color: var(--craie-fixe);
    border: 1px solid var(--craie-fixe);
    cursor: pointer;
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
    display: block;
    font-size: 11px;
    line-height: 14px;
    min-width: 0;
  }
  .compacte .capacite {
    font-size: 10px;
    line-height: 12px;
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
</style>
