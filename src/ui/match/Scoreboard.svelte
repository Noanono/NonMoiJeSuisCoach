<script lang="ts">
  import type { MatchController } from './controller.svelte';
  import { minuteLabel, periodLabel, SPEEDS } from './live';
  import { store } from '../store.svelte';

  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  // Match en direct contre un autre coach (MULTI-07) : comptes à rebours envoyés par le serveur, décomptés ici.
  let now = $state(Date.now());
  $effect(() => {
    if (!controller.remote) return;
    const timer = setInterval(() => (now = Date.now()), 250);
    return () => clearInterval(timer);
  });
  const duel = $derived(controller.remote ? (store.multi?.duel ?? null) : null);
  const sinceReceived = $derived(duel ? Math.max(0, now - (store.multi?.duelReceivedAt ?? now)) : 0);
  function seconds(ms: number): string {
    return `${Math.ceil(Math.max(0, ms - sinceReceived) / 1000)} s`;
  }
  const duelStatus = $derived.by(() => {
    void controller.version;
    if (!duel) return '';
    const match = controller.match;
    const mine = controller.coachSide;
    if (duel.pausedBy) return duel.pausedBy === mine ? 'Ta pause' : 'Pause adverse';
    if (match.status === 'halftime') return `Mi-temps · reprise dans ${seconds(duel.halftimeRemaining)}`;
    const deciding = match.pending?.side ?? match.awaiting?.side;
    if (deciding) return `${deciding === mine ? 'À toi de décider' : 'L’adversaire décide'} · ${seconds(duel.decisionRemaining)}`;
    return 'En cours';
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
      shootout: match.shootout && (coachIsHome ? `${match.shootout.home}-${match.shootout.away}` : `${match.shootout.away}-${match.shootout.home}`),
    };
  });

  const status = $derived(
    controller.finished
      ? 'Terminé'
      : controller.engineWaiting
        ? 'Le match t’attend'
        : controller.running
          ? 'En cours'
          : 'Pause',
  );
</script>

<header class="banderole" aria-label="Tableau de score">
  <div class="equipe domicile">
    <span class="nom banderole-m">{board.ownName}</span>
    <span class="tampon toi">Ton équipe</span>
  </div>

  <div class="centre">
    <p class="score" aria-label="Score {board.ownGoals} à {board.otherGoals}">
      <span>{board.ownGoals}</span><span aria-hidden="true">-</span><span>{board.otherGoals}</span>
    </p>
    <p class="horloge tampon">
      <span class="minute">{board.minute}</span>
      <span>{board.period}</span>
      {#if board.shootout}<span>TAB {board.shootout}</span>{/if}
    </p>
    {#if board.derby}<p class="tampon derby">Derby</p>{/if}
  </div>

  <div class="equipe exterieur">
    <span class="nom banderole-m">{board.otherName}</span>
  </div>

  {#if !controller.finished && controller.remote}
    <div class="commandes">
      <span class="tampon vitesse" aria-pressed="true">×1 imposé</span>
      {#if duel?.pausedBy}
        <button class="tampon pause" disabled={duel.pausedBy !== controller.coachSide} onclick={() => controller.togglePause()}>
          {duel.pausedBy === controller.coachSide ? 'Reprendre' : 'Pause adverse'} · {seconds(duel.pauseRemaining)}
        </button>
      {:else}
        <button class="tampon pause" disabled={!duel || duel.pausesLeft[controller.coachSide] === 0} onclick={() => controller.togglePause()}>
          Pause 10 s ({duel?.pausesLeft[controller.coachSide] ?? 0} restante{(duel?.pausesLeft[controller.coachSide] ?? 0) > 1 ? 's' : ''})
        </button>
      {/if}
      {#if halftime && duel}
        <button class="tampon pause" disabled={duel.halftimeReady.includes(controller.coachSide)} onclick={() => controller.halftimeReady()}>
          {duel.halftimeReady.includes(controller.coachSide) ? 'Prêt, on attend l’autre' : 'Prêt pour la reprise'}
        </button>
      {/if}
      <span class="tampon etat" aria-live="off">{duelStatus}</span>
    </div>
  {:else if !controller.finished}
    <div class="commandes">
      <div class="vitesses" role="group" aria-label="Vitesse du match">
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
        {controller.paused ? 'Reprendre' : 'Pause'}
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
