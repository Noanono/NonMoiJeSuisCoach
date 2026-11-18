<script lang="ts">
  import { t, td, type MessageKey } from '../../../i18n/t';
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

  const GOAL_LABEL: Record<LeagueGoal, MessageKey> = {
    survival: 'president.goal.survival',
    midTable: 'president.goal.midTable',
    promotion: 'president.goal.promotion',
    title: 'president.goal.title',
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
    <dt>{t('president.league')}</dt>
    <dd>
      {t('president.leagueGoal', { goal: t(GOAL_LABEL[president.objective.league]), target: t('common.rank', { position: president.objective.targetPosition }) })}
      {t('president.currently', { position: t('common.rank', { position: president.position }) })}
      <span class={onTrack ? 'bonus' : 'malus'}>{onTrack ? t('president.onTrack') : t('president.behind')}</span>
    </dd>
    <dt>{t('president.cup')}</dt>
    <dd>
      {t('president.cupGoal', { rounds: president.objective.cupRoundsToWin })}
      {t('president.cupDone', { rounds: president.cupRoundsWon })}
      <span class={cupDone ? 'bonus' : 'discret'}>{cupDone ? t('president.done') : ''}</span>
    </dd>
    <dt>{t('president.confidence')}</dt>
    <dd class="jauge">
      <Gauge value={president.confidence} max={100} label={t('shell.presidentConfidence')} tone={president.confidence < DANGER_CONFIDENCE ? 'carton' : 'victoire'} />
      <span class="mono">{president.confidence} / 100</span>
    </dd>
    <dt>{t('president.sponsors')}</dt>
    <dd class="jauge">
      <Gauge value={president.sponsorMood} max={100} label={t('president.sponsorMood')} tone="scotch" />
      <span class="mono">{president.sponsorMood} / 100</span>
    </dd>
  </dl>
  {#if president.confidence < DANGER_CONFIDENCE}
    <p class="texte-s malus">{t('president.danger')}</p>
  {/if}
  {#if speech && president.objective.speech}
    <blockquote class="texte-s">{t('president.quote', { speech: td(president.objective.speech) })}</blockquote>
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
