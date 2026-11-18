<script lang="ts">
  import { t, td } from '../../i18n/t';
  import { tick } from 'svelte';
  import PlayerAvatar from '../kit/PlayerAvatar.svelte';
  import { RARITY_LABEL } from '../../domain/abilities/progression';
  import { FX_DURATION_MS, type ActivationFx, type MatchController } from './controller.svelte';

  /** Mise en scène d'une capacité : annonce centrale, flèches vers les cibles, zone touchée, textes qui s'envolent. */
  interface Props {
    controller: MatchController;
    root: HTMLElement | undefined;
  }

  let { controller, root }: Props = $props();

  interface Point {
    x: number;
    y: number;
  }

  interface Staging {
    key: number;
    width: number;
    height: number;
    arrows: { from: Point; to: Point }[];
    zone: { x: number; y: number; width: number; height: number } | null;
    floats: { id: number; at: Point; text: string; tone: 'bonus' | 'malus'; delay: number }[];
    /** Boucliers qui éclatent, au centre du jeton protégé. */
    shields: { id: number; at: Point }[];
  }

  /** Roue du pari : 8 cases, vertes (gagné) et rouges (perdu) en alternance, pointeur en haut. */
  const WHEEL_SEGMENTS = 8;
  const WHEEL_TURNS = 4;
  const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS;
  /** Rotation finale : la case visée (paire = verte, impaire = rouge) s'arrête sous le pointeur. */
  const wheelStop = (won: boolean) => WHEEL_TURNS * 360 - (won ? 2 : 3) * SEGMENT_ANGLE - SEGMENT_ANGLE / 2;
  function segmentPath(index: number): string {
    const point = (angle: number) => {
      const radians = ((angle - 90) * Math.PI) / 180;
      return `${(50 + 46 * Math.cos(radians)).toFixed(2)} ${(50 + 46 * Math.sin(radians)).toFixed(2)}`;
    };
    return `M50 50 L${point(index * SEGMENT_ANGLE)} A46 46 0 0 1 ${point((index + 1) * SEGMENT_ANGLE)} Z`;
  }
  /** Éclats du bouclier : six morceaux qui partent chacun dans sa direction. */
  const SHARDS = Array.from({ length: 6 }, (_, index) => {
    const angle = (index * 60 * Math.PI) / 180;
    return { dx: Math.round(Math.cos(angle) * 46), dy: Math.round(Math.sin(angle) * 46), turn: index % 2 === 0 ? 140 : -160 };
  });

  const ZONE_MARGIN = 8;
  const FLOAT_LINE_HEIGHT = 22;
  const FLOAT_STAGGER_MS = 40;

  let staging = $state.raw<Staging | null>(null);

  function tokenRect(container: HTMLElement, origin: DOMRect, playerId: string): DOMRect | null {
    const element = container.querySelector(`[data-player-id="${CSS.escape(playerId)}"]`);
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return new DOMRect(box.x - origin.x, box.y - origin.y, box.width, box.height);
  }

  const centerOf = (box: DOMRect): Point => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

  function stage(fx: ActivationFx, container: HTMLElement): Staging {
    const origin = container.getBoundingClientRect();
    const { record } = fx;
    const rectOf = (id: string) => tokenRect(container, origin, id);
    const source = rectOf(record.playerId);
    const arrows = source
      ? record.targetIds.flatMap((id) => {
          const target = rectOf(id);
          return target ? [{ from: centerOf(source), to: centerOf(target) }] : [];
        })
      : [];
    const stackHeight = new Map<string, number>();
    const floats = record.floats.flatMap((entry, id) => {
      const box = rectOf(entry.playerId);
      if (!box) return [];
      const stacked = stackHeight.get(entry.playerId) ?? 0;
      stackHeight.set(entry.playerId, stacked + 1);
      return [{ id, at: { x: centerOf(box).x, y: box.y - stacked * FLOAT_LINE_HEIGHT }, text: entry.text, tone: entry.tone, delay: id * FLOAT_STAGGER_MS }];
    });
    const shields = record.floats.flatMap((entry, id) => {
      const box = entry.kind === 'shield' ? rectOf(entry.playerId) : null;
      return box ? [{ id, at: centerOf(box) }] : [];
    });
    return { key: record.id, width: origin.width, height: origin.height, arrows, floats, shields, zone: record.zone ? zoneBox(record.floats.map((entry) => rectOf(entry.playerId))) : null };
  }

  function zoneBox(boxes: (DOMRect | null)[]): Staging['zone'] {
    const found = boxes.filter((box): box is DOMRect => box !== null);
    if (found.length === 0) return null;
    const left = Math.min(...found.map((box) => box.left));
    const top = Math.min(...found.map((box) => box.top));
    const right = Math.max(...found.map((box) => box.right));
    const bottom = Math.max(...found.map((box) => box.bottom));
    return { x: left - ZONE_MARGIN, y: top - ZONE_MARGIN, width: right - left + 2 * ZONE_MARGIN, height: bottom - top + 2 * ZONE_MARGIN };
  }

  // Les jetons sont mesurés après le rendu de la minute où la capacité part.
  $effect(() => {
    const fx = controller.fx;
    if (!fx || !root) {
      staging = null;
      return;
    }
    const container = root;
    void tick().then(() => {
      if (controller.fx === fx) staging = stage(fx, container);
    });
  });
</script>

{#if controller.fx}
  {@const fx = controller.fx}
  <div class="scene">
    {#if staging && staging.key === fx.record.id}
      <svg class="traits" viewBox="0 0 {staging.width} {staging.height}" preserveAspectRatio="none">
        <defs>
          <marker id="pointe-fx" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill={fx.own ? 'var(--scotch)' : 'var(--fumigene)'} />
          </marker>
        </defs>
        {#if staging.zone}
          <rect class="zone" class:leur={!fx.own} x={staging.zone.x} y={staging.zone.y} width={staging.zone.width} height={staging.zone.height} />
        {/if}
        {#each staging.arrows as arrow, index (index)}
          <line class="fleche" class:leur={!fx.own} x1={arrow.from.x} y1={arrow.from.y} x2={arrow.to.x} y2={arrow.to.y} marker-end="url(#pointe-fx)" />
        {/each}
      </svg>
      {#each staging.shields as shield (shield.id)}
        <svg class="bouclier" viewBox="-60 -60 120 120" style:left="{shield.at.x}px" style:top="{shield.at.y}px" aria-hidden="true">
          <path class="bulle" d="M0 -40 L35 -20 L35 20 L0 40 L-35 20 L-35 -20 Z" />
          {#each SHARDS as shard, index (index)}
            <path class="eclat" d="M-6 -4 L6 -6 L2 7 Z" style="--dx: {shard.dx}px; --dy: {shard.dy}px; --tourne: {shard.turn}deg" />
          {/each}
        </svg>
      {/each}
      {#each staging.floats as entry (entry.id)}
        <span class="flottant tampon {entry.tone}" style:left="{entry.at.x}px" style:top="{entry.at.y}px" style:animation-delay="{entry.delay}ms">{td(entry.text)}</span>
      {/each}
    {/if}

    {#key fx.record.id}
      <button type="button" class="annonce {fx.record.rarity}" class:leur={!fx.own} style:--duree="{FX_DURATION_MS}ms" onclick={() => controller.skipFx()} aria-label={t('fx.skip')}>
        <span class="haut">
          <PlayerAvatar player={fx.avatar} size={96} />
          <span class="texte">
            <span class="tampon qui">{fx.own ? t('live.tag.mine') : t('live.tag.theirs')} · {td(RARITY_LABEL[fx.record.rarity])} · {fx.playerName}</span>
            <span class="capacite">{td(fx.record.abilityName)}</span>
          </span>
        </span>
        {#if fx.gamble}
          <span class="pari">
            <svg class="roue" viewBox="0 -14 100 114" aria-hidden="true">
              <g class="disque" style="--arret: {wheelStop(fx.gamble === 'won')}deg">
                {#each Array.from({ length: WHEEL_SEGMENTS }, (_, index) => index) as index (index)}
                  <path d={segmentPath(index)} class:gagne={index % 2 === 0} class:perdu={index % 2 === 1} />
                {/each}
                <circle cx="50" cy="50" r="8" />
              </g>
              <path class="pointeur" d="M38 -13 L62 -13 L50 10 Z" />
            </svg>
            <span class="verdict-pari tampon {fx.gamble}">{fx.gamble === 'won' ? t('fx.gambleWon') : t('fx.gambleLost')}</span>
          </span>
        {/if}
        <span class="description">{td(fx.description)}</span>
        <span class="effets texte-fort">
          {#each fx.effects as line, index (index)}<span>{line}</span>{/each}
        </span>
        <span class="temps" aria-hidden="true"><span></span></span>
      </button>
    {/key}
  </div>
{/if}

<style>
  .scene {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    overflow: visible;
  }
  .traits {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .fleche {
    stroke: var(--scotch);
    stroke-width: 5;
    stroke-dasharray: 12 8;
  }
  .fleche.leur {
    stroke: var(--fumigene);
  }
  .zone {
    fill: color-mix(in srgb, var(--scotch) 35%, transparent);
    stroke: var(--scotch);
    stroke-width: 3;
    stroke-dasharray: 10 6;
  }
  .zone.leur {
    fill: color-mix(in srgb, var(--fumigene) 35%, transparent);
    stroke: var(--fumigene);
  }
  .flottant {
    position: absolute;
    transform: translate(-50%, -100%);
    padding: 1px var(--space-1);
    white-space: nowrap;
    font-size: 13px;
    border: var(--trait-fin) solid var(--encre-fixe);
    box-shadow: 2px 2px 0 var(--encre-fixe);
  }
  .bonus {
    background: var(--victoire);
    color: var(--craie-fixe);
  }
  .malus {
    background: var(--carton);
    color: var(--craie-fixe);
  }
  .bouclier {
    position: absolute;
    width: 120px;
    height: 120px;
    translate: -50% -50%;
    overflow: visible;
  }
  .bulle {
    fill: color-mix(in srgb, var(--victoire) 25%, transparent);
    stroke: var(--victoire);
    stroke-width: 5;
    stroke-linejoin: round;
  }
  .eclat {
    fill: var(--victoire);
    stroke: var(--encre-fixe);
    stroke-width: 1.5;
    opacity: 0;
  }
  .pari {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  .roue {
    width: 110px;
    height: 110px;
    flex: none;
    overflow: visible;
  }
  .disque path {
    stroke: var(--encre-fixe);
    stroke-width: 1.5;
  }
  .disque .gagne {
    fill: var(--victoire);
  }
  .disque .perdu {
    fill: var(--carton);
  }
  .disque circle {
    fill: var(--craie-fixe);
    stroke: var(--encre-fixe);
    stroke-width: 2;
  }
  .disque {
    transform-box: view-box;
    transform-origin: 50px 50px;
    transform: rotate(var(--arret));
  }
  .pointeur {
    fill: var(--encre-fixe);
    stroke: var(--craie-fixe);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .verdict-pari {
    font-size: 22px;
    padding: 2px var(--space-2);
    color: var(--craie-fixe);
    border: var(--trait-fin) solid var(--encre-fixe);
  }
  .verdict-pari.won {
    background: var(--victoire);
  }
  .verdict-pari.lost {
    background: var(--carton);
  }
  .annonce {
    position: fixed;
    z-index: 7;
    inset: 0;
    margin: auto;
    height: fit-content;
    transform: rotate(var(--rotation-sticker));
    display: grid;
    gap: var(--space-2);
    width: min(92vw, 620px);
    padding: var(--space-4) var(--space-6);
    background: var(--craie-fixe);
    color: var(--encre-fixe);
    border: var(--trait-epais) solid var(--encre-fixe);
    box-shadow: 8px 8px 0 var(--encre-fixe);
    text-align: left;
    pointer-events: auto;
    cursor: pointer;
  }
  .annonce.rare {
    background: var(--scotch);
  }
  .annonce.legendary {
    background: var(--fumigene);
  }
  .annonce.mythic {
    background: var(--mythique);
    color: var(--scotch);
    border-color: var(--scotch);
    box-shadow: 0 0 0 4px var(--encre-fixe), 12px 12px 0 var(--encre-fixe);
  }
  .annonce.mythic .capacite {
    font-size: 56px;
  }
  .annonce.mythic .temps span {
    background: var(--scotch);
  }
  .annonce.leur {
    border-style: dashed;
  }
  .haut {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  .texte {
    display: grid;
    min-width: 0;
  }
  .capacite {
    font-family: var(--font-display);
    font-size: 44px;
    line-height: 1.05;
    text-transform: uppercase;
  }
  .description {
    font-size: 18px;
    line-height: 24px;
  }
  .effets {
    display: grid;
    gap: 2px;
  }
  .temps {
    display: block;
    height: 6px;
    background: color-mix(in srgb, var(--encre-fixe) 20%, transparent);
  }
  .temps span {
    display: block;
    height: 100%;
    background: var(--encre-fixe);
  }
  @media (max-width: 600px) {
    .capacite {
      font-size: 28px;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .annonce {
      animation: tampon 220ms ease-out;
    }
    .temps span {
      animation: ecoule var(--duree) linear both;
      transform-origin: left;
    }
    .flottant {
      animation: envol 3500ms ease-out both;
    }
    .fleche {
      animation: avance 500ms linear infinite;
    }
    .disque {
      animation: roue 1600ms cubic-bezier(0.15, 0.6, 0.2, 1) both;
    }
    .verdict-pari {
      animation: tampon 220ms 1600ms ease-out both;
    }
    .bulle {
      transform-box: fill-box;
      transform-origin: center;
      animation: bulle 700ms ease-out both;
    }
    .eclat {
      animation: eclat 900ms 450ms ease-out both;
    }
  }
  @keyframes roue {
    from {
      transform: rotate(0deg);
    }
  }
  @keyframes bulle {
    0% {
      scale: 0.3;
      opacity: 0;
    }
    35% {
      scale: 1.1;
      opacity: 1;
    }
    60% {
      scale: 1;
      opacity: 1;
    }
    100% {
      scale: 1.35;
      opacity: 0;
    }
  }
  @keyframes eclat {
    0% {
      opacity: 1;
      transform: translate(0, 0) rotate(0deg);
    }
    100% {
      opacity: 0;
      transform: translate(var(--dx), var(--dy)) rotate(var(--tourne));
    }
  }
  @keyframes ecoule {
    to {
      transform: scaleX(0);
    }
  }
  @keyframes tampon {
    from {
      scale: 1.5;
      opacity: 0;
    }
  }
  @keyframes envol {
    from {
      translate: 0 12px;
      opacity: 0;
    }
    15% {
      translate: 0 0;
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    to {
      translate: 0 -28px;
      opacity: 0;
    }
  }
  @keyframes avance {
    to {
      stroke-dashoffset: -20;
    }
  }
</style>
