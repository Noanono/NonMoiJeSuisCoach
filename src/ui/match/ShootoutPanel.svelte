<script lang="ts">
  import Button from '../kit/Button.svelte';
  import { defaultShootoutOrder, PENALTY_STYLE_LABEL, SHOOTOUT_ROUNDS, shootingValue } from '../../domain/match';
  import { POSITION_SHORT } from '../screens/describe';
  import type { MatchController } from './controller.svelte';
  import { inSuddenDeath, lastKick, shootoutRows } from './shootout';
  import { t, td, type MessageKey } from '../../i18n/t';
  import type { KickOutcome, ShootoutMark } from './shootout';

  /**
   * Tirs au but en direct (TAB-01) : le coach range ses tireurs, puis suit la séance tir par tir.
   * La cage rejoue chaque tir : course du ballon, plongeon du gardien, tampon du résultat.
   * Les choix de frappe et de plongeon restent dans le bandeau, comme pour un penalty en match.
   */
  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  const view = $derived.by(() => {
    void controller.version;
    const match = controller.match;
    const live = match.liveShootout;
    if (!live) return null;
    const window = match.awaiting;
    return {
      rows: shootoutRows(match, controller.coachSide) ?? [],
      kick: lastKick(match),
      suddenDeath: inSuddenDeath(match),
      first: match[live.first].name,
      ordering: window?.shootoutOrder === true && window.side === controller.coachSide,
      opponentOrdering: live.ordering.length > 0 && !live.ordering.includes(controller.coachSide),
      winner: match.status === 'finished' && match.shootout ? match[match.shootout.winner].name : null,
    };
  });

  // Ordre en cours de rangement, propre à ce coach jusqu'à validation.
  let draft = $state<string[]>([]);
  $effect(() => {
    if (view?.ordering && draft.length === 0) draft = defaultShootoutOrder(controller.match, controller.match[controller.coachSide]);
  });

  const takers = $derived.by(() => {
    const team = controller.match[controller.coachSide];
    return draft.map((id) => {
      const player = team.players.find((candidate) => candidate.id === id)!;
      return { id, name: player.name, position: POSITION_SHORT[player.line ?? player.profile.position], shooting: Math.round(shootingValue(player)) };
    });
  });

  function move(index: number, by: -1 | 1): void {
    const target = index + by;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target]!, next[index]!];
    draft = next;
  }

  function confirmOrder(): void {
    controller.setShootoutOrder([...draft]);
    draft = [];
  }

  const MARK_KEY: Record<ShootoutMark, MessageKey> = { goal: 'shootout.mark.goal', miss: 'shootout.mark.miss', next: 'shootout.mark.next', todo: 'shootout.mark.todo' };
  const OUTCOME_KEY: Record<KickOutcome, MessageKey> = { goal: 'shootout.outcome.goal', saved: 'shootout.outcome.saved', wide: 'shootout.outcome.wide' };

  /** Point d'arrivée du ballon dans la cage (viewBox 0 0 300 140). */
  const BALL_TARGET = { left: { x: 92, y: 62 }, right: { x: 208, y: 62 }, center: { x: 150, y: 44 } } as const;
  const WIDE_TARGET = { left: { x: 26, y: 30 }, right: { x: 274, y: 30 }, center: { x: 150, y: 4 } } as const;
</script>

{#if view}
  <section class="seance" aria-label={t('shootout.title')}>
    <header class="entete">
      <h2 class="banderole-titre">{t('shootout.title')}</h2>
      <span class="tampon">{view.winner ? t('shootout.winner', { team: view.winner }) : view.suddenDeath ? t('shootout.suddenDeath') : t('shootout.firstShooter', { team: view.first })}</span>
    </header>

    <div class="corps">
      <div class="tableau">
        {#each view.rows as row (row.side)}
          <div class="ligne" class:mienne={row.side === controller.coachSide}>
            <span class="nom texte-fort">{row.name}</span>
            <ol class="pastilles" aria-label={t('shootout.rowLabel', { team: row.name, score: row.score })}>
              {#each row.marks as mark, index (index)}
                <li class="pastille {mark}" class:mort-subite={index >= SHOOTOUT_ROUNDS} title={t(MARK_KEY[mark])}>
                  {#if mark === 'goal'}●{:else if mark === 'miss'}✕{/if}
                </li>
              {/each}
            </ol>
            <span class="score mono">{row.score}</span>
          </div>
        {/each}
      </div>

      <figure class="cage" aria-live="polite">
        {#if view.kick}
          {@const kick = view.kick}
          {@const target = kick.outcome === 'wide' ? WIDE_TARGET[kick.aim] : BALL_TARGET[kick.aim]}
          {#key kick.index}
            <svg viewBox="0 0 300 140" role="img" aria-label={t(OUTCOME_KEY[kick.outcome])}>
              <rect class="gazon" x="0" y="112" width="300" height="28" />
              <g class="filet">
                {#each [70, 100, 130, 160, 190, 220] as x (x)}<line x1={x} y1="22" x2={x} y2="112" />{/each}
                {#each [42, 62, 82, 102] as y (y)}<line x1="42" y1={y} x2="258" y2={y} />{/each}
              </g>
              <path class="poteaux" d="M42 112 V20 H258 V112" />
              <g class="gardien {kick.dive}" class:arret={kick.outcome === 'saved'}>
                <circle cx="150" cy="70" r="8" />
                <rect x="141" y="79" width="18" height="24" rx="3" />
                <path d="M141 84 L124 70 M159 84 L176 70 M144 103 L140 112 M156 103 L160 112" />
              </g>
              <circle class="ballon {kick.style}" cx="150" cy="128" r="7" style="--bx: {target.x - 150}px; --by: {target.y - 128}px" />
            </svg>
            <figcaption>
              <span class="texte-s">{kick.playerName} · {td(PENALTY_STYLE_LABEL[kick.style])}</span>
              <span class="resultat {kick.outcome}">{t(OUTCOME_KEY[kick.outcome])}</span>
            </figcaption>
          {/key}
        {:else}
          <p class="texte-s attente">{view.opponentOrdering ? t('shootout.opponentOrdering') : t('shootout.waiting')}</p>
        {/if}
      </figure>
    </div>

    {#if view.ordering}
      <div class="ordre">
        <p class="texte-s">{t('shootout.orderHint', { n: SHOOTOUT_ROUNDS })}</p>
        <ol class="tireurs">
          {#each takers as taker, index (taker.id)}
            <li class:titulaire={index < SHOOTOUT_ROUNDS}>
              <span class="rang mono">{index + 1}</span>
              <span class="texte-fort">{taker.name}</span>
              <span class="texte-s mono">{taker.position} · {t('shootout.shooting', { value: taker.shooting })}</span>
              <span class="fleches">
                <button type="button" disabled={index === 0} aria-label={t('shootout.up', { player: taker.name })} onclick={() => move(index, -1)}>▲</button>
                <button type="button" disabled={index === takers.length - 1} aria-label={t('shootout.down', { player: taker.name })} onclick={() => move(index, 1)}>▼</button>
              </span>
            </li>
          {/each}
        </ol>
        <div class="actions">
          <Button variant="primary" size="s" onclick={confirmOrder}>{t('shootout.confirm')}</Button>
          <Button variant="secondary" size="s" onclick={() => (draft = defaultShootoutOrder(controller.match, controller.match[controller.coachSide]))}>{t('shootout.reset')}</Button>
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  .seance {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4) var(--space-4);
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    box-shadow: var(--ombre-sticker);
  }
  .entete {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .banderole-titre {
    margin: 0;
    font-family: var(--font-display);
    font-size: 28px;
    line-height: 1.1;
  }
  .corps {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
    gap: var(--space-4);
    align-items: center;
  }
  .tableau {
    display: grid;
    gap: var(--space-2);
  }
  .ligne {
    display: grid;
    grid-template-columns: minmax(90px, 160px) minmax(0, 1fr) 2.5ch;
    gap: var(--space-2);
    align-items: center;
  }
  .nom {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mienne .nom {
    text-decoration: underline var(--scotch) 4px;
  }
  .score {
    font-size: 22px;
    text-align: right;
  }
  .pastilles {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .pastille {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border: var(--trait-fin) solid var(--encre);
    border-radius: 50%;
    font-size: 14px;
    line-height: 1;
    background: var(--craie-2);
  }
  .pastille.mort-subite {
    border-style: dashed;
  }
  .pastille.goal {
    background: var(--victoire);
    color: var(--craie-fixe);
    animation: tampon 260ms ease-out;
  }
  .pastille.miss {
    background: var(--carton);
    color: var(--craie-fixe);
    animation: tampon 260ms ease-out;
  }
  .pastille.next {
    background: var(--scotch);
    animation: clignote 900ms ease-in-out infinite alternate;
  }
  @keyframes tampon {
    from {
      transform: scale(1.8);
    }
  }
  @keyframes clignote {
    to {
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--scotch) 45%, transparent);
    }
  }

  .cage {
    margin: 0;
    display: grid;
    gap: var(--space-1);
  }
  .cage svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .gazon {
    fill: var(--terrain);
  }
  .filet line {
    stroke: var(--encre-pale);
    stroke-width: 1;
    opacity: 0.45;
  }
  .poteaux {
    fill: none;
    stroke: var(--encre);
    stroke-width: 5;
    stroke-linejoin: round;
  }
  .gardien {
    fill: var(--fumigene);
    stroke: var(--encre);
    stroke-width: 2;
    transform-box: view-box;
    transform-origin: 150px 104px;
    animation: 600ms 350ms cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
  }
  .gardien path {
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
  }
  .gardien.left {
    animation-name: plongeon-gauche;
  }
  .gardien.right {
    animation-name: plongeon-droite;
  }
  .gardien.center {
    animation-name: reste;
  }
  @keyframes plongeon-gauche {
    to {
      transform: translate(-52px, -6px) rotate(-62deg);
    }
  }
  @keyframes plongeon-droite {
    to {
      transform: translate(52px, -6px) rotate(62deg);
    }
  }
  @keyframes reste {
    50% {
      transform: translateY(-10px);
    }
    to {
      transform: none;
    }
  }
  .ballon {
    fill: var(--ligne);
    stroke: var(--encre);
    stroke-width: 2;
    transform-box: fill-box;
    transform-origin: center;
    animation: tir 650ms 300ms cubic-bezier(0.3, 0.1, 0.4, 1) forwards;
  }
  /* La Panenka monte en cloche avant de redescendre au centre. */
  .ballon.panenka {
    animation-name: cloche;
    animation-duration: 900ms;
  }
  @keyframes tir {
    to {
      transform: translate(var(--bx), var(--by)) scale(0.6);
    }
  }
  @keyframes cloche {
    55% {
      transform: translate(calc(var(--bx) * 0.6), calc(var(--by) - 40px)) scale(0.7);
    }
    to {
      transform: translate(var(--bx), var(--by)) scale(0.6);
    }
  }
  figcaption {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .resultat {
    font-family: var(--font-display);
    font-size: 22px;
    padding: 0 var(--space-2);
    color: var(--craie-fixe);
    transform: rotate(-3deg);
    opacity: 0;
    animation: resultat 300ms 950ms ease-out forwards;
  }
  .resultat.goal {
    background: var(--victoire);
  }
  .resultat.saved,
  .resultat.wide {
    background: var(--carton);
  }
  @keyframes resultat {
    from {
      opacity: 1;
      transform: rotate(-3deg) scale(1.8);
    }
    to {
      opacity: 1;
      transform: rotate(-3deg);
    }
  }
  .attente {
    margin: 0;
    text-align: center;
  }

  .ordre {
    display: grid;
    gap: var(--space-2);
    border-top: var(--trait-fin) dashed var(--encre);
    padding-top: var(--space-2);
  }
  .ordre p {
    margin: 0;
  }
  .tireurs {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
    gap: var(--space-1) var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tireurs li {
    display: grid;
    grid-template-columns: 2.5ch minmax(0, 1fr) auto auto;
    gap: var(--space-2);
    align-items: center;
    padding: 2px var(--space-2);
    border: var(--trait-fin) solid var(--encre);
    background: var(--craie-2);
  }
  .tireurs li.titulaire {
    background: color-mix(in srgb, var(--scotch) 40%, var(--craie));
  }
  .rang {
    font-weight: 700;
  }
  .fleches {
    display: flex;
    gap: 2px;
  }
  .fleches button {
    width: 30px;
    height: 30px;
    font: inherit;
    font-size: 12px;
    color: var(--encre);
    background: var(--craie);
    border: var(--trait-fin) solid var(--encre);
    cursor: pointer;
  }
  .fleches button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  @media (max-width: 700px) {
    .corps {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .gardien,
    .ballon,
    .resultat,
    .pastille {
      animation-duration: 1ms !important;
      animation-delay: 0ms !important;
    }
  }
</style>
