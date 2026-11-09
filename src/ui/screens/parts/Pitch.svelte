<script lang="ts" module>
  import type { Position } from '../../../domain/types';

  export interface PitchSlot {
    index: number;
    position: Position;
    playerName: string | null;
    rating: number | null;
    outOfPosition: boolean;
  }
</script>

<script lang="ts">
  import { POSITION_SHORT } from '../describe';

  /** Mini-terrain de la tactique : une carte craie par poste, posée sur l'herbe (EFF-03). */

  interface Props {
    slots: PitchSlot[];
    /** Clic sur une carte : le parent donne le focus au menu du poste. */
    onpick: (index: number) => void;
  }

  let { slots, onpick }: Props = $props();

  /** De l'attaque (en haut) aux cages (en bas). */
  const LINES: Position[] = ['ATT', 'MID', 'DEF', 'GK'];
  const rows = $derived(LINES.map((position) => ({ position, slots: slots.filter((slot) => slot.position === position) })));
</script>

<div class="pelouse" role="group" aria-label="Disposition sur le terrain">
  <span class="rond" aria-hidden="true"></span>
  <span class="surface" aria-hidden="true"></span>
  {#each rows as row (row.position)}
    <div class="ligne">
      {#each row.slots as slot (slot.index)}
        <button class="carte" class:vide={!slot.playerName} onclick={() => onpick(slot.index)}>
          <span class="tampon poste">{POSITION_SHORT[slot.position]}</span>
          <span class="nom">{slot.playerName ?? 'Personne'}</span>
          {#if slot.rating !== null}<span class="tampon note">{slot.rating}</span>{/if}
          {#if slot.outOfPosition}<span class="tampon alerte">Hors poste</span>{/if}
        </button>
      {/each}
    </div>
  {/each}
</div>

<style>
  .pelouse {
    position: relative;
    display: grid;
    gap: var(--space-4);
    padding: var(--space-6) var(--space-4);
    border: var(--trait-epais) solid var(--ligne);
    min-height: 420px;
    align-content: space-between;
  }
  .rond {
    position: absolute;
    top: -60px;
    left: 50%;
    width: 120px;
    height: 120px;
    margin-left: -60px;
    border: var(--trait-epais) solid var(--ligne);
    border-radius: var(--radius-pill);
    clip-path: inset(60px 0 0 0);
  }
  .surface {
    position: absolute;
    bottom: -3px;
    left: 25%;
    right: 25%;
    height: 72px;
    border: var(--trait-epais) solid var(--ligne);
  }
  .ligne {
    position: relative;
    display: flex;
    justify-content: space-around;
    gap: var(--space-2);
  }
  .carte {
    display: grid;
    justify-items: center;
    gap: 2px;
    width: 96px;
    padding: var(--space-1);
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre-fixe);
    box-shadow: var(--ombre-sticker);
    cursor: pointer;
    font-size: 13px;
    line-height: 16px;
  }
  .carte:active {
    transform: translate(3px, 3px);
    box-shadow: var(--ombre-presse);
  }
  .vide {
    background: var(--craie-2);
    border-style: dashed;
  }
  .nom {
    font-weight: 700;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .poste {
    color: var(--encre-pale);
  }
  .alerte {
    background: var(--scotch);
    color: var(--encre-fixe);
    padding: 0 var(--space-1);
  }
  @media (max-width: 600px) {
    .carte {
      width: 72px;
      font-size: 12px;
    }
  }
</style>
