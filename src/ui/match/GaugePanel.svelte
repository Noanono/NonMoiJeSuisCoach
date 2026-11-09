<script lang="ts">
  import { GAUGE_MAX } from '../../domain/match';
  import Gauge from '../kit/Gauge.svelte';
  import type { MatchController } from './controller.svelte';
  import { opposite } from './pitch';

  /** Jauge de Gueulante du coach (CAP-05), et celle d'en face pour sentir venir le coup (MATCH-07). */
  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  const gauges = $derived.by(() => {
    void controller.version;
    return {
      own: controller.match[controller.coachSide].gauge,
      other: controller.match[opposite(controller.coachSide)].gauge,
    };
  });
</script>

<section class="jauge" aria-labelledby="jauge-titre">
  <div class="entete">
    <h2 id="jauge-titre" class="banderole-m">Gueulante</h2>
    <span class="stat valeur">{gauges.own}<span class="max">/{GAUGE_MAX}</span></span>
  </div>
  <div class="barre">
    <Gauge value={gauges.own} max={GAUGE_MAX} segments={GAUGE_MAX} label="Jauge de Gueulante" />
  </div>
  <p class="texte-s aide">+1 toutes les 10 min, +1 quand tu encaisses. En face : <span class="tampon">{gauges.other}/{GAUGE_MAX}</span></p>
</section>

<style>
  .jauge {
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    box-shadow: var(--ombre-sticker);
    padding: var(--space-2) var(--space-4) var(--space-4);
  }
  .entete {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .valeur {
    font-size: 28px;
  }
  .max {
    font-size: 16px;
    color: var(--encre-pale);
  }
  /* Segments plus hauts que la jauge par défaut : c'est la ressource centrale du match. */
  .barre :global(.seg) {
    height: 22px;
  }
  .aide {
    margin: var(--space-2) 0 0;
    color: var(--encre-pale);
  }
</style>
