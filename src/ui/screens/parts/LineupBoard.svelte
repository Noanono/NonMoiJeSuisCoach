<script lang="ts">
  import type { Snippet } from 'svelte';
  import Card from '../../kit/Card.svelte';
  import { EMPTY_SLOT, MAX_BENCH_SIZE } from '../../../domain/league/lineup';
  import { FORMATION_SLOTS } from '../../../domain/player/rating';
  import type { Formation, Position } from '../../../domain/types';
  import { POSITION_LABEL, POSITION_SHORT } from '../describe';
  import type { LineupDrop } from '../lineupEdit';
  import PlayerCard, { type CardPlayer } from './PlayerCard.svelte';

  /**
   * Plateau de composition (EFF-03) : les joueurs sont des cartes qu'on glisse entre
   * le terrain, le banc et la tribune. Sans souris, on touche une carte puis sa destination.
   */
  interface Props {
    formation: Formation;
    starters: readonly string[];
    bench: readonly string[];
    squad: readonly CardPlayer[];
    onmove: (playerId: string, drop: LineupDrop) => void;
    /** Réglages affichés à côté du terrain. */
    aside: Snippet;
  }

  let { formation, starters, bench, squad, onmove, aside }: Props = $props();

  /** Distance à parcourir avant qu'un appui devienne un glisser. */
  const DRAG_THRESHOLD_PX = 6;
  /** De l'attaque (en haut) aux cages (en bas). */
  const LINES: Position[] = ['ATT', 'MID', 'DEF', 'GK'];

  const byId = $derived(new Map(squad.map((player) => [player.id, player])));
  const fieldIds = $derived(new Set(starters.filter((id) => id !== EMPTY_SLOT)));
  const benchIds = $derived(new Set(bench));
  const standing = $derived(squad.filter((player) => !fieldIds.has(player.id) && !benchIds.has(player.id)));
  const rows = $derived(
    LINES.map((line) => ({
      line,
      slots: FORMATION_SLOTS[formation]
        .map((position, index) => {
          const id = starters[index] ?? EMPTY_SLOT;
          return { index, position, player: id === EMPTY_SLOT ? undefined : byId.get(id) };
        })
        .filter((slot) => slot.position === line),
    })),
  );

  interface Drag {
    playerId: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    moving: boolean;
  }

  let drag = $state<Drag | null>(null);
  let hovered = $state<string | null>(null);
  let selectedId = $state<string | null>(null);
  /** Un glisser se termine par un `click` du navigateur : celui-là ne compte pas. */
  let ignoreNextClick = false;

  const dragged = $derived(drag?.moving ? byId.get(drag.playerId) : undefined);
  /** Note qu'aurait le joueur tenu à chaque poste : affichée sur la cible survolée. */
  const previewPlayer = $derived(dragged ?? (selectedId ? byId.get(selectedId) : undefined));

  function parseDrop(code: string): LineupDrop | null {
    const [kind, rest] = code.split(':', 2);
    if (kind === 'slot') return { kind, index: Number(rest) };
    if (kind === 'bench' || kind === 'stand') return rest ? { kind, occupantId: rest } : { kind };
    return null;
  }

  function dropCodeAt(x: number, y: number): string | null {
    const zone = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]');
    return zone?.dataset.drop ?? null;
  }

  function startDrag(event: PointerEvent, playerId: string): void {
    if (event.button !== 0) return;
    drag = { playerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moving: false };
  }

  function moveDrag(event: PointerEvent): void {
    if (!drag) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.moving && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < DRAG_THRESHOLD_PX) return;
    drag.moving = true;
    selectedId = null;
    hovered = dropCodeAt(drag.x, drag.y);
  }

  function endDrag(): void {
    if (!drag) return;
    const { playerId, moving } = drag;
    const drop = moving && hovered ? parseDrop(hovered) : null;
    if (moving) ignoreNextClick = true;
    drag = null;
    hovered = null;
    if (drop) onmove(playerId, drop);
  }

  /** Échap annule ce qu'on tient. */
  function cancelOnEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    drag = null;
    hovered = null;
    selectedId = null;
  }

  /** Toucher une carte : la prendre, ou poser celle qu'on tient à sa place. */
  function touchCard(playerId: string, drop: LineupDrop): void {
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }
    if (selectedId === playerId) selectedId = null;
    else if (selectedId) place(drop);
    else selectedId = playerId;
  }

  function place(drop: LineupDrop): void {
    if (!selectedId) return;
    const playerId = selectedId;
    selectedId = null;
    onmove(playerId, drop);
  }
</script>

<svelte:window onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={endDrag} onkeydown={cancelOnEscape} />

<div class="plateau" class:en-glisse={drag?.moving}>
  <div class="pelouse" role="group" aria-label="Terrain : glisse une carte sur un poste">
    <span class="rond" aria-hidden="true"></span>
    <span class="surface" aria-hidden="true"></span>
    {#each rows as row (row.line)}
      <div class="ligne">
        {#each row.slots as slot (slot.index)}
          {@const code = `slot:${slot.index}`}
          {@const target = hovered === code}
          <div class="poste" class:survole={target} data-drop={code}>
            {#if slot.player}
              {@const player = slot.player}
              <PlayerCard
                {player}
                rating={player.ratingAt[slot.position]}
                outOfPosition={player.position !== slot.position}
                selected={selectedId === player.id}
                dragging={drag?.moving === true && drag.playerId === player.id}
                onpointerdown={(event) => startDrag(event, player.id)}
                onclick={() => touchCard(player.id, { kind: 'slot', index: slot.index })}
              />
            {:else}
              <button
                type="button"
                class="vide-poste"
                aria-label="Poste libre : {POSITION_LABEL[slot.position]}"
                onclick={() => place({ kind: 'slot', index: slot.index })}
              >
                <span class="tampon">{POSITION_SHORT[slot.position]}</span>
                <span class="texte-s">Libre</span>
              </button>
            {/if}
            {#if target && previewPlayer}
              <span class="apercu tampon">Note ici {previewPlayer.ratingAt[slot.position]}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <div class="cote">
    {@render aside()}

    <Card title="Le banc">
      {#snippet actions()}
        <span class="tampon">{bench.length} / {MAX_BENCH_SIZE}</span>
      {/snippet}
      <div class="zone" class:survole={hovered === 'bench'} data-drop="bench" role="group" aria-label="Banc : glisse une carte ici">
        {#each bench as id (id)}
          {@const player = byId.get(id)}
          {#if player}
            <div class:survole={hovered === `bench:${id}`} data-drop="bench:{id}">
              <PlayerCard
                {player}
                selected={selectedId === id}
                dragging={drag?.moving === true && drag.playerId === id}
                onpointerdown={(event) => startDrag(event, id)}
                onclick={() => touchCard(id, { kind: 'bench', occupantId: id })}
              />
            </div>
          {/if}
        {/each}
        {#if bench.length === 0}<p class="vide">Personne sur le banc. Glisse des cartes ici.</p>{/if}
      </div>
      {#if selectedId && !benchIds.has(selectedId)}
        <button type="button" class="poser tampon" onclick={() => place({ kind: 'bench' })}>Poser sur le banc</button>
      {/if}
    </Card>
  </div>

  <div class="tribune">
    <Card title="La tribune">
      {#snippet actions()}
        <span class="tampon">{standing.length} joueurs</span>
      {/snippet}
      <div class="zone" class:survole={hovered === 'stand'} data-drop="stand" role="group" aria-label="Tribune : glisse une carte ici">
        {#each standing as player (player.id)}
          <div class:survole={hovered === `stand:${player.id}`} data-drop="stand:{player.id}">
            <PlayerCard
              {player}
              selected={selectedId === player.id}
              dragging={drag?.moving === true && drag.playerId === player.id}
              onpointerdown={(event) => startDrag(event, player.id)}
              onclick={() => touchCard(player.id, { kind: 'stand', occupantId: player.id })}
            />
          </div>
        {/each}
        {#if standing.length === 0}<p class="vide">Tout le monde est dans le groupe. Même le kiné.</p>{/if}
      </div>
      {#if selectedId && (fieldIds.has(selectedId) || benchIds.has(selectedId))}
        <button type="button" class="poser tampon" onclick={() => place({ kind: 'stand' })}>Envoyer en tribune</button>
      {/if}
    </Card>
  </div>
</div>

{#if drag?.moving && dragged}
  <div class="porte" style:transform="translate({drag.x - 52}px, {drag.y - 40}px)">
    <PlayerCard player={dragged} ghost />
  </div>
{/if}

<style>
  .plateau {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(280px, 2fr);
    gap: var(--space-6);
    align-items: start;
  }
  .en-glisse {
    cursor: grabbing;
  }
  .pelouse {
    position: relative;
    display: grid;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-2);
    border: var(--trait-epais) solid var(--ligne);
    min-height: 560px;
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
    gap: var(--space-1);
  }
  .poste {
    position: relative;
  }
  .survole > :global(.carte),
  .survole > .vide-poste {
    outline: 5px solid var(--scotch);
    outline-offset: 2px;
  }
  .vide-poste {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--space-1);
    width: 104px;
    height: 108px;
    background: color-mix(in srgb, var(--craie) 35%, transparent);
    color: var(--encre-fixe);
    border: var(--trait-epais) dashed var(--ligne);
    cursor: pointer;
  }
  .apercu {
    position: absolute;
    z-index: 3;
    left: 50%;
    bottom: -10px;
    transform: translateX(-50%);
    padding: 0 var(--space-1);
    white-space: nowrap;
    background: var(--encre-fixe);
    color: var(--scotch);
  }
  .cote {
    display: grid;
    gap: var(--space-6);
    min-width: 0;
  }
  .tribune {
    grid-column: 1 / -1;
  }
  .zone {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    min-height: 124px;
    padding: var(--space-1);
    border: var(--trait-fin) dashed transparent;
  }
  .zone.survole {
    border-color: var(--encre);
    background: var(--craie-2);
  }
  .poser {
    margin-top: var(--space-2);
    background: var(--scotch);
    color: var(--encre-fixe);
    border: var(--trait-fin) solid var(--encre-fixe);
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
  }
  .porte {
    position: fixed;
    z-index: 20;
    top: 0;
    left: 0;
    pointer-events: none;
  }
  @media (max-width: 900px) {
    .plateau {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 600px) {
    .vide-poste {
      width: 84px;
    }
    .pelouse {
      min-height: 480px;
    }
  }
</style>
