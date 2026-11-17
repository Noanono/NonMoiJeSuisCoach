<script lang="ts">
  import Gauge from '../../kit/Gauge.svelte';
  import { store } from '../../store.svelte';
  import type { LeagueGoal } from '../../../domain/club/president';
  import { cupRoundsWon, divisionStandings, humanDivision } from '../../../domain/game';

  /** Objectifs du président (CLUB-04) et confiance (CLUB-05). */
  interface Props {
    /** Affiche le discours de début de saison. */
    speech?: boolean;
  }

  let { speech = false }: Props = $props();

  const GOAL_LABEL: Record<LeagueGoal, string> = {
    survival: 'Maintien',
    midTable: 'Milieu de tableau',
    promotion: 'Montée',
    title: 'Titre',
  };
  /** Sous ce seuil, la jauge passe au rouge : le licenciement n'est pas loin. */
  const DANGER_CONFIDENCE = 30;

  const president = $derived(
    store.select((game) => {
      const division = humanDivision(game);
      const position = divisionStandings(game, division.id).findIndex((row) => row.clubId === game.humanClubId) + 1;
      return {
        objective: { ...game.objective },
        divisionName: division.name,
        position,
        cupRoundsWon: cupRoundsWon(game, game.humanClubId),
        confidence: game.outlook.presidentConfidence,
        sponsorMood: game.outlook.sponsorMood,
      };
    }),
  );

  const onTrack = $derived(president.position <= president.objective.targetPosition);
  const cupDone = $derived(president.cupRoundsWon >= president.objective.cupRoundsToWin);
</script>

<div class="president">
  <dl class="paire texte-s">
    <dt>Championnat</dt>
    <dd>
      {GOAL_LABEL[president.objective.league]} : finir <span class="mono">{president.objective.targetPosition}e</span> ou mieux.
      Actuellement <span class="mono">{president.position}e</span>
      <span class={onTrack ? 'bonus' : 'malus'}>{onTrack ? '(dans les clous)' : '(en retard)'}</span>
    </dd>
    <dt>Coupe</dt>
    <dd>
      Passer <span class="mono">{president.objective.cupRoundsToWin}</span> tour(s).
      Déjà <span class="mono">{president.cupRoundsWon}</span>
      <span class={cupDone ? 'bonus' : 'discret'}>{cupDone ? '(fait)' : ''}</span>
    </dd>
    <dt>Confiance</dt>
    <dd class="jauge">
      <Gauge value={president.confidence} max={100} label="Confiance du président" tone={president.confidence < DANGER_CONFIDENCE ? 'carton' : 'victoire'} />
      <span class="mono">{president.confidence} / 100</span>
    </dd>
    <dt>Sponsors</dt>
    <dd class="jauge">
      <Gauge value={president.sponsorMood} max={100} label="Humeur des sponsors" tone="scotch" />
      <span class="mono">{president.sponsorMood} / 100</span>
    </dd>
  </dl>
  {#if president.confidence < DANGER_CONFIDENCE}
    <p class="texte-s malus">Confiance dans le rouge : à zéro, tu es licencié.</p>
  {/if}
  {#if speech && president.objective.speech}
    <blockquote class="texte-s">« {president.objective.speech} »</blockquote>
  {/if}
</div>

<style>
  .president {
    display: grid;
    gap: var(--space-2);
  }
  .jauge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .jauge :global(.gauge) {
    width: 140px;
  }
  blockquote {
    margin: 0;
    padding-left: var(--space-4);
    border-left: var(--trait-epais) solid var(--encre);
    font-style: italic;
  }
  p {
    margin: 0;
  }
</style>
