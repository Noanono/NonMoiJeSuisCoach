<script lang="ts">
  import { t } from '../../i18n/t';
  import type { MatchController } from './controller.svelte';
  import { frozenMinutes, minuteLabel, periodLabel, SPEEDS } from './live';

  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  // Match en direct contre un autre coach (MULTI-07) : comptes à rebours envoyés par le serveur, décomptés par le contrôleur.
  const duel = $derived(controller.duel);
  function seconds(ms: number): string {
    return t('match.seconds', { seconds: Math.ceil(controller.remaining(ms) / 1000) });
  }
  const duelStatus = $derived.by(() => {
    void controller.version;
    if (!duel) return '';
    const match = controller.match;
    const mine = controller.coachSide;
    if (duel.pausedBy) return duel.pausedBy === mine ? t('scoreboard.yourPause') : t('scoreboard.theirPause');
    if (match.status === 'halftime') return t('scoreboard.halftimeResume', { time: seconds(duel.halftimeRemaining) });
    const deciding = match.pending?.side ?? match.awaiting?.side;
    if (deciding) return `${deciding === mine ? t('scoreboard.yourDecision') : t('scoreboard.theirDecision')} · ${seconds(duel.decisionRemaining)}`;
    return t('scoreboard.inProgress');
  });
  const halftime = $derived.by(() => {
    void controller.version;
    return controller.match.status === 'halftime';
  });

  const board = $derived.by(() => {
    void controller.version;
    const match = controller.match;
    const coachIsHome = controller.coachSide === 'home';
    const [own, other] = coachIsHome ? [match.home, match.away] : [match.away, match.home];
    return {
      ownName: own.name,
      otherName: other.name,
      ownGoals: own.goals,
      otherGoals: other.goals,
      minute: minuteLabel(match.minute, match.addedMinute),
      period: periodLabel(match),
      derby: match.derby,
      frozen: frozenMinutes(match),
      shootout: match.shootout && (coachIsHome ? `${match.shootout.home}-${match.shootout.away}` : `${match.shootout.away}-${match.shootout.home}`),
    };
  });

  const status = $derived(
    controller.finished
      ? t('live.period.finished')
      : controller.engineWaiting
        ? t('scoreboard.waitingForYou')
        : controller.running
          ? t('scoreboard.inProgress')
          : t('scoreboard.pause'),
  );
</script>

<header class="banderole" aria-label={t('scoreboard.label')}>
  <div class="equipe domicile">
    <span class="nom banderole-m">{board.ownName}</span>
    <span class="tampon toi">{t('scoreboard.yourTeam')}</span>
  </div>

  <div class="centre">
    <p class="score" aria-label={t('scoreboard.scoreLabel', { own: board.ownGoals, other: board.otherGoals })}>
      <span>{board.ownGoals}</span><span aria-hidden="true">-</span><span>{board.otherGoals}</span>
    </p>
    <p class="horloge tampon" class:gele={board.frozen > 0}>
      <span class="minute">{#if board.frozen > 0}<span class="flocon" aria-hidden="true">❄</span>{/if}{board.minute}</span>
      {#if board.frozen > 0}<span class="glace">{t('scoreboard.frozen', { n: board.frozen })}</span>{/if}
      <span>{board.period}</span>
      {#if board.shootout}<span>{t('scoreboard.shootout', { score: board.shootout })}</span>{/if}
    </p>
    {#if board.derby}<p class="tampon derby">Derby</p>{/if}
  </div>

  <div class="equipe exterieur">
    <span class="nom banderole-m">{board.otherName}</span>
  </div>

  {#if !controller.finished && controller.remote}
    <div class="commandes">
      <span class="tampon vitesse" aria-pressed="true">{t('scoreboard.forcedSpeed')}</span>
      {#if duel?.pausedBy}
        <button class="tampon pause" disabled={duel.pausedBy !== controller.coachSide} onclick={() => controller.togglePause()}>
          {duel.pausedBy === controller.coachSide ? t('scoreboard.resume') : t('scoreboard.theirPause')} · {seconds(duel.pauseRemaining)}
        </button>
      {:else}
        <button class="tampon pause" disabled={!duel || duel.pausesLeft[controller.coachSide] === 0} onclick={() => controller.togglePause()}>
          {t('scoreboard.pausesLeft', { left: duel?.pausesLeft[controller.coachSide] ?? 0 })}
        </button>
      {/if}
      {#if halftime && duel}
        <button class="tampon pause" disabled={duel.halftimeReady.includes(controller.coachSide)} onclick={() => controller.halftimeReady()}>
          {duel.halftimeReady.includes(controller.coachSide) ? t('scoreboard.readyWaiting') : t('scoreboard.readyResume')}
        </button>
      {/if}
      <span class="tampon etat" aria-live="off">{duelStatus}</span>
    </div>
  {:else if !controller.finished}
    <div class="commandes">
      <div class="vitesses" role="group" aria-label={t('scoreboard.speed')}>
        {#each SPEEDS as speed (speed)}
          <button
            class="tampon vitesse"
            aria-pressed={controller.speed === speed}
            onclick={() => controller.setSpeed(speed)}
          >
            ×{speed}
          </button>
        {/each}
      </div>
      <button class="tampon pause" disabled={controller.engineWaiting} onclick={() => controller.togglePause()}>
        {controller.paused ? t('scoreboard.resume') : t('scoreboard.pause')}
      </button>
      <span class="tampon etat" aria-live="off">{status}</span>
    </div>
  {/if}
</header>

<style>
  .banderole {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-2) var(--space-4);
    background: var(--fumigene);
    color: var(--encre-fixe);
    border: var(--trait-epais) solid var(--encre-fixe);
    box-shadow: var(--ombre-sticker);
    padding: var(--space-2) var(--space-4);
  }
  .equipe {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .domicile {
    align-items: flex-end;
    text-align: right;
  }
  .exterieur {
    align-items: flex-start;
  }
  .nom {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    text-transform: uppercase;
  }
  .toi {
    background: var(--encre-fixe);
    color: var(--craie-fixe);
    padding: 0 var(--space-1);
  }
  .centre {
    text-align: center;
  }
  .score {
    margin: 0;
    display: flex;
    gap: var(--space-2);
    justify-content: center;
    font-family: var(--font-display);
    font-size: 56px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .horloge {
    margin: 0;
    display: flex;
    gap: var(--space-2);
    justify-content: center;
    flex-wrap: wrap;
  }
  .minute {
    background: var(--encre-fixe);
    color: var(--craie-fixe);
    padding: 0 var(--space-1);
    font-variant-numeric: tabular-nums;
  }
  /* Chrono figé (M5) : l'horloge prend la glace le temps des minutes mortes. */
  .gele .minute {
    background: #bfe6f5;
    color: #0b3b52;
    outline: var(--trait-fin) solid #0b3b52;
    box-shadow: inset 0 0 6px #ffffff, 0 0 10px #7fd0ef;
  }
  .flocon {
    display: inline-block;
    margin-right: 2px;
  }
  .glace {
    padding: 0 var(--space-1);
    background: #0b3b52;
    color: #e6f7fd;
  }
  @media (prefers-reduced-motion: no-preference) {
    .gele .minute {
      animation: frisson 1600ms ease-in-out infinite;
    }
    .flocon {
      animation: flocon 4s linear infinite;
    }
  }
  @keyframes frisson {
    0%,
    86%,
    100% {
      translate: 0 0;
    }
    90% {
      translate: -1px 0;
    }
    94% {
      translate: 1px 0;
    }
  }
  @keyframes flocon {
    to {
      rotate: 360deg;
    }
  }
  .commandes {
    grid-column: 1 / -1;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .vitesses {
    display: flex;
  }
  .vitesse,
  .pause {
    min-width: 44px;
    min-height: 36px;
    padding: var(--space-1) var(--space-2);
    background: var(--craie-fixe);
    color: var(--encre-fixe);
    border: var(--trait-fin) solid var(--encre-fixe);
    cursor: pointer;
  }
  .vitesse + .vitesse {
    border-left: none;
  }
  .vitesse[aria-pressed='true'] {
    background: var(--encre-fixe);
    color: var(--craie-fixe);
  }
  .pause {
    border-width: var(--trait-epais);
    min-width: 110px;
  }
  .pause:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .etat {
    min-width: 9em;
  }
  @media (max-width: 600px) {
    .banderole {
      padding: var(--space-2);
    }
    .nom {
      font-size: 20px;
    }
    .score {
      font-size: 40px;
    }
  }
  .derby {
    margin: 0;
    justify-self: center;
    padding: 0 var(--space-1);
    background: var(--carton);
    color: var(--craie-fixe);
    border: var(--trait-fin) solid var(--encre-fixe);
  }
</style>
