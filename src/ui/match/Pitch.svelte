<script lang="ts">
  import type { MatchController } from './controller.svelte';
  import PlayerAvatar from '../kit/PlayerAvatar.svelte';
  import { substitutionFromDrag } from './activation';
  import { pitchView, type TokenView } from './pitch';
  import FxLayer from './FxLayer.svelte';
  import PlayerToken from './PlayerToken.svelte';

  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  const view = $derived.by(() => {
    void controller.version;
    return pitchView(controller.match, controller.coachSide);
  });

  let root = $state<HTMLElement>();

  /** Distance à parcourir avant qu'un appui devienne un glisser. */
  const DRAG_THRESHOLD_PX = 6;

  interface Drag {
    playerId: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    moving: boolean;
  }

  let drag = $state<Drag | null>(null);
  let hoveredId = $state<string | null>(null);
  /** Un glisser relâché sur son propre jeton se termine par un `click` : celui-là ne compte pas. */
  let ignoreNextClick = false;

  const allTokens = $derived([...view.columns.flatMap((column) => column.tokens), ...view.bench]);
  const liftedToken = $derived(drag?.moving ? allTokens.find((token) => token.id === drag!.playerId) : undefined);
  /** Jetons sur lesquels lâcher le joueur tenu : remplaçants s'il joue, titulaires s'il attend. */
  const dropIds = $derived.by(() => {
    if (!drag?.moving) return new Set<string>();
    const { playerId } = drag;
    return new Set(allTokens.filter((token) => substitutionFromDrag(controller.match, controller.coachSide, playerId, token.id)).map((token) => token.id));
  });

  function startDrag(event: PointerEvent, playerId: string): void {
    ignoreNextClick = false;
    if (event.button !== 0) return;
    drag = { playerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moving: false };
  }

  function moveDrag(event: PointerEvent): void {
    if (!drag) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.moving && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < DRAG_THRESHOLD_PX) return;
    drag.moving = true;
    controller.dragging = true;
    hoveredId = document.elementFromPoint(drag.x, drag.y)?.closest<HTMLElement>('[data-player-id]')?.dataset.playerId ?? null;
  }

  function endDrag(): void {
    if (!drag) return;
    const { playerId, moving } = drag;
    const targetId = hoveredId;
    drag = null;
    hoveredId = null;
    if (!moving) return;
    ignoreNextClick = true;
    controller.dropPlayer(playerId, targetId);
  }

  function cancelDrag(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !drag) return;
    drag = null;
    hoveredId = null;
    controller.dragging = false;
  }

  /** Ciblage en cours : toucher choisit la cible ; sinon toucher ouvre le panneau (CAP-03, CAP-16). */
  function activate(playerId: string): void {
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }
    if (controller.match.pending) controller.pickTarget(playerId);
    else controller.inspect(playerId);
  }
</script>

{#snippet tokenOf(token: TokenView)}
  <PlayerToken
    {token}
    onactivate={activate}
    ondragstart={startDrag}
    dropTarget={dropIds.has(token.id)}
    hovered={hoveredId === token.id}
    lifted={drag?.moving === true && drag.playerId === token.id}
  />
{/snippet}

<svelte:window onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={endDrag} onkeydown={cancelDrag} />

<section class="terrain" bind:this={root} aria-label="Terrain : ton équipe face à l'adversaire">
  <div class="lignes">
    {#each view.columns as column (column.key)}
      <div class="ligne" role="group" aria-label={column.label}>
        {#each column.tokens as token (token.id)}
          {@render tokenOf(token)}
        {/each}
      </div>
    {/each}
  </div>

  {#if view.bench.length > 0}
    <div class="banc" role="group" aria-label="Ton banc">
      <span class="tampon titre-banc">Banc<br /><span class="aide-banc">glisse pour changer</span></span>
      <div class="banc-jetons">
        {#each view.bench as token (token.id)}
          {@render tokenOf(token)}
        {/each}
      </div>
    </div>
  {/if}

  <FxLayer {controller} {root} />
</section>

{#if drag?.moving && liftedToken}
  <div class="porte" style:transform="translate({drag.x - 24}px, {drag.y - 24}px)" aria-hidden="true">
    <PlayerAvatar player={liftedToken.avatar} size={48} />
    <span class="tampon">{liftedToken.name}</span>
  </div>
{/if}

<style>
  .terrain {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }
  .lignes {
    position: relative;
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: var(--space-2);
    padding: var(--space-4) var(--space-2);
    border: var(--trait-epais) solid var(--ligne);
    min-height: 380px;
  }
  /* Ligne médiane à la craie entre les deux attaques. */
  .lignes::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    border-left: var(--trait-epais) solid var(--ligne);
    pointer-events: none;
  }
  .ligne {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    gap: var(--space-2);
  }
  .aide-banc {
    font-size: 10px;
    text-transform: none;
    letter-spacing: 0;
  }
  .porte {
    position: fixed;
    z-index: 20;
    top: 0;
    left: 0;
    display: grid;
    justify-items: center;
    pointer-events: none;
    background: var(--scotch);
    color: var(--encre-fixe);
    border: var(--trait-epais) solid var(--encre-fixe);
    padding: 2px var(--space-1);
  }
  .banc {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    background: var(--craie-2);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    padding: var(--space-2) var(--space-4);
  }
  .banc-jetons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    flex: 1;
  }
  .banc-jetons :global(.jeton) {
    width: 64px;
  }

  /* Mobile : le terrain pivote, l'adversaire en haut, ton équipe en bas. */
  @media (max-width: 900px) {
    .lignes {
      display: flex;
      flex-direction: column-reverse;
      min-height: 0;
      padding: var(--space-2);
    }
    .lignes::before {
      top: 50%;
      bottom: auto;
      left: 0;
      right: 0;
      border-left: none;
      border-top: var(--trait-epais) solid var(--ligne);
    }
    .ligne {
      flex-direction: row;
      justify-content: center;
      gap: var(--space-1);
    }
    .ligne :global(.jeton) {
      flex: 1 1 0;
      max-width: 76px;
    }
  }
</style>
