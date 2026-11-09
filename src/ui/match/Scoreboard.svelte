<script lang="ts">
  import type { MatchController } from './controller.svelte';
  import { minuteLabel, periodLabel, SPEEDS } from './live';

  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  const board = $derived.by(() => {
    void controller.version;
    const match = controller.match;
    return {
      homeGoals: match.home.goals,
      awayGoals: match.away.goals,
      minute: minuteLabel(match.minute, match.addedMinute),
      period: periodLabel(match),
      shootout: match.shootout,
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
    <span class="nom banderole-m">{controller.match.home.name}</span>
    {#if controller.coachSide === 'home'}<span class="tampon toi">Ton équipe</span>{/if}
  </div>

  <div class="centre">
    <p class="score" aria-label="Score {board.homeGoals} à {board.awayGoals}">
      <span>{board.homeGoals}</span><span aria-hidden="true">-</span><span>{board.awayGoals}</span>
    </p>
    <p class="horloge tampon">
      <span class="minute">{board.minute}</span>
      <span>{board.period}</span>
      {#if board.shootout}<span>TAB {board.shootout.home}-{board.shootout.away}</span>{/if}
    </p>
  </div>

  <div class="equipe exterieur">
    <span class="nom banderole-m">{controller.match.away.name}</span>
    {#if controller.coachSide === 'away'}<span class="tampon toi">Ton équipe</span>{/if}
  </div>

  {#if !controller.finished}
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
</style>
