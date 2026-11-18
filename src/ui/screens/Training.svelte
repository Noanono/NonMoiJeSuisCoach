<script lang="ts">
  import { t, td } from '../../i18n/t';
  import './parts/screens.css';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import DeltaBadge from '../kit/DeltaBadge.svelte';
  import Gauge from '../kit/Gauge.svelte';
  import PlayerAvatar from '../kit/PlayerAvatar.svelte';
  import RatingBadge from '../kit/RatingBadge.svelte';
  import { store } from '../store.svelte';
  import { getAbility } from '../../domain/abilities/catalog';
  import { abilityTrainingXp, passiveAbilityXp, trainingMatchBonus, trainingRate } from '../../domain/club/training';
  import { facilitiesOf, facilityBonus } from '../../domain/club/facilities';
  import { XP_THRESHOLDS } from '../../domain/abilities/progression';
  import { humanClub, humanSquad } from '../../domain/game';
  import { focusRaisesOverall, overall } from '../../domain/player/rating';
  import type { AttributeName, TrainingFocus } from '../../domain/types';
  import { ATTRIBUTE_LABEL, fullName, percent, POSITION_ORDER, POSITION_SHORT } from './describe';

  /** Programme d'entraînement de chaque joueur (TRAIN-01 à TRAIN-05). */
  const ATTRIBUTES = Object.keys(ATTRIBUTE_LABEL) as AttributeName[];
  const ABILITY_FOCUS: TrainingFocus = 'ability';

  const rows = $derived(
    store.select((game) =>
      humanSquad(game)
        .map((player) => {
          const focus = player.training.focus;
          const rate = trainingRate(player);
          const weeklyXp = abilityTrainingXp(player, facilityBonus.trainingRate(facilitiesOf(humanClub(game))));
          const nextThreshold = XP_THRESHOLDS[player.ability.level];
          const bonus = trainingMatchBonus(focus);
          return {
            id: player.id,
            name: fullName(player),
            avatar: { id: player.id, age: player.age, clubId: player.clubId, position: player.position, nationality: player.nationality },
            position: player.position,
            age: player.age,
            overall: overall(player),
            potential: player.potential,
            evolution: overall(player) - player.overallAtSeasonStart,
            focus,
            progress: Math.round(player.training.progress * 100),
            pace: rate === 0 ? t('training.capped') : rate >= 0.2 ? t('training.fast') : rate >= 0.1 ? t('training.medium') : t('training.slow'),
            bonus: bonus ? t('training.nextMatchBonus', { value: `+${percent(bonus.value)}` }) : t('training.abilityXp'),
            injured: player.injuryWeeks > 0,
            abilityName: player.ability.revealed ? td(getAbility(player.ability.abilityId).name) : '???',
            abilityXp:
              nextThreshold === undefined
                ? t('training.maxLevel')
                : t('training.xpPerWeek', { xp: focus === 'ability' ? weeklyXp : Math.round(passiveAbilityXp(player) * facilityBonus.trainingRate(facilitiesOf(humanClub(game)))), level: player.ability.level }),
            abilityGauge:
              nextThreshold === undefined
                ? null
                : { value: player.ability.xp - XP_THRESHOLDS[player.ability.level - 1]!, max: nextThreshold - XP_THRESHOLDS[player.ability.level - 1]!, label: t('training.xpToLevel', { xp: player.ability.xp, target: nextThreshold, level: player.ability.level + 1 }) },
            abilityPace: focus === 'ability' ? (weeklyXp === 0 ? t('training.maxLevel') : weeklyXp >= 50 ? t('training.fast') : weeklyXp >= 40 ? t('training.medium') : t('training.slow')) : null,
          };
        })
        .sort((a, b) => POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || b.overall - a.overall),
    ),
  );

  function change(playerId: string, event: Event & { currentTarget: HTMLSelectElement }): void {
    const focus = event.currentTarget.value as TrainingFocus;
    store.command('setTrainingFocus', playerId, focus);
  }

  function reset(): void {
    store.command('resetTrainingFocus');
    store.notify(t('training.reset'));
  }

  /** « ↑ » : le programme fait monter la note générale à ce poste. */
  function optionLabel(position: (typeof rows)[number]['position'], attribute: AttributeName): string {
    return `${ATTRIBUTE_LABEL[attribute]}${focusRaisesOverall(position, attribute) ? t('training.raisesRating') : ''}`;
  }
</script>

<div class="ecran">
  <Card title={t('shell.tabs.training')} scotch>
    {#snippet actions()}
      <Button size="s" onclick={reset}>{t('training.assistantPlan')}</Button>
    {/snippet}
    <p class="texte-s discret intro">
      {t('training.intro')}
    </p>
    <div class="defilant">
      <table class="tableau">
        <caption class="sr-only">{t('training.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('squad.col.name')}</th>
            <th scope="col">{t('squad.col.position')}</th>
            <th scope="col" class="num">{t('squad.col.age')}</th>
            <th scope="col" class="num">{t('squad.col.overall')}</th>
            <th scope="col" class="num">{t('training.potShort')}</th>
            <th scope="col">{t('squad.col.evolution')}</th>
            <th scope="col">{t('training.plan')}</th>
            <th scope="col">{t('training.progress')}</th>
            <th scope="col">{t('training.pace')}</th>
            <th scope="col">{t('training.bonus')}</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr>
              <td><span class="identite"><PlayerAvatar player={row.avatar} size={32} /><span class="texte-fort">{row.name}</span></span></td>
              <td>{POSITION_SHORT[row.position]}</td>
              <td class="num">{row.age}</td>
              <td class="num"><RatingBadge value={row.overall} size="s" /></td>
              <td class="num">{row.potential}</td>
              <td><DeltaBadge value={row.evolution} /></td>
              <td>
                <select class="select" aria-label={t('training.planOf', { name: row.name })} value={row.focus} onchange={(event) => change(row.id, event)}>
                  {#each ATTRIBUTES as attribute (attribute)}<option value={attribute}>{optionLabel(row.position, attribute)}</option>{/each}
                  <option value={ABILITY_FOCUS}>{t('training.abilityOption', { ability: row.abilityName })}</option>
                </select>
              </td>
              <td class="avancement">
                {#if row.focus === ABILITY_FOCUS}
                  {#if row.abilityGauge}<Gauge value={row.abilityGauge.value} max={row.abilityGauge.max} label={row.abilityGauge.label} tone="scotch" />{/if}
                  <span class="discret texte-s" title={row.abilityGauge?.label}>{row.abilityXp}</span>
                {:else}
                  <Gauge value={row.progress} max={100} label={t('training.progressLabel')} tone="scotch" />
                {/if}
              </td>
              <td>{#if row.injured}<span class="malus">{t('training.injured')}</span>{:else}{row.abilityPace ?? row.pace}{/if}</td>
              <td class="texte-s">{row.bonus}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>
</div>

<style>
  .intro {
    margin: 0 0 var(--space-4);
  }
  .identite {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    white-space: nowrap;
  }
  .avancement {
    min-width: 110px;
  }
</style>
