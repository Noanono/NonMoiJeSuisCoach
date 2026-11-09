<script lang="ts">
  import { tick } from 'svelte';
  import PlayerAvatar from '../kit/PlayerAvatar.svelte';
  import { RARITY_LABEL } from '../../domain/abilities/progression';
  import type { ActivationFx, MatchController } from './controller.svelte';

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
  }

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
    return { key: record.id, width: origin.width, height: origin.height, arrows, floats, zone: record.zone ? zoneBox(record.floats.map((entry) => rectOf(entry.playerId))) : null };
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
  <div class="scene" aria-hidden="true">
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
      {#each staging.floats as entry (entry.id)}
        <span class="flottant tampon {entry.tone}" style:left="{entry.at.x}px" style:top="{entry.at.y}px" style:animation-delay="{entry.delay}ms">{entry.text}</span>
      {/each}
    {/if}

    <div class="annonce {fx.record.rarity}" class:leur={!fx.own}>
      <PlayerAvatar player={fx.avatar} size={fx.record.rarity === 'legendary' ? 72 : 56} />
      <div class="texte">
        <p class="tampon">{fx.own ? 'Toi' : 'En face'} · {RARITY_LABEL[fx.record.rarity]} · {fx.playerName}</p>
        <p class="capacite">{fx.record.abilityName}</p>
      </div>
    </div>
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
  .annonce {
    position: absolute;
    top: var(--space-6);
    left: 50%;
    transform: translateX(-50%) rotate(var(--rotation-sticker));
    display: flex;
    align-items: center;
    gap: var(--space-2);
    max-width: 92%;
    padding: var(--space-2) var(--space-4);
    background: var(--craie-fixe);
    color: var(--encre-fixe);
    border: var(--trait-epais) solid var(--encre-fixe);
    box-shadow: 6px 6px 0 var(--encre-fixe);
  }
  .annonce.rare {
    background: var(--scotch);
  }
  .annonce.legendary {
    top: 30%;
    padding: var(--space-4) var(--space-6);
    background: var(--fumigene);
  }
  .annonce.leur {
    border-style: dashed;
  }
  .texte p {
    margin: 0;
  }
  .capacite {
    font-family: var(--font-display);
    font-size: 28px;
    line-height: 1.1;
    text-transform: uppercase;
  }
  .legendary .capacite {
    font-size: 44px;
  }
  @media (max-width: 600px) {
    .capacite {
      font-size: 20px;
    }
    .legendary .capacite {
      font-size: 28px;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .annonce {
      animation: tampon 180ms ease-out;
    }
    .flottant {
      animation: envol 1300ms ease-out both;
    }
    .fleche {
      animation: avance 500ms linear infinite;
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
