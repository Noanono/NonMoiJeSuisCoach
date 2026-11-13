<script lang="ts">
  import './parts/screens.css';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import DeltaBadge from '../kit/DeltaBadge.svelte';
  import Gauge from '../kit/Gauge.svelte';
  import PlayerAvatar from '../kit/PlayerAvatar.svelte';
  import RatingBadge from '../kit/RatingBadge.svelte';
  import { store } from '../store.svelte';
  import { getAbility } from '../../domain/abilities/catalog';
  import { abilityTrainingXp, trainingMatchBonus, trainingRate } from '../../domain/club/training';
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
            avatar: { id: player.id, age: player.age, clubId: player.clubId, position: player.position },
            position: player.position,
            age: player.age,
            overall: overall(player),
            potential: player.potential,
            evolution: overall(player) - player.overallAtSeasonStart,
            focus,
            progress: Math.round(player.training.progress * 100),
            pace: rate === 0 ? 'Plafond atteint' : rate >= 0.2 ? 'Rapide' : rate >= 0.1 ? 'Moyen' : 'Lent',
            bonus: bonus ? `+${percent(bonus.value)} au prochain match` : 'XP de capacité',
            injured: player.injuryWeeks > 0,
            abilityName: player.ability.revealed ? getAbility(player.ability.abilityId).name : '???',
            abilityXp: nextThreshold === undefined ? 'Niveau max' : `+${weeklyXp} XP/sem. · niv. ${player.ability.level}`,
            abilityGauge:
              nextThreshold === undefined
                ? null
                : { value: player.ability.xp - XP_THRESHOLDS[player.ability.level - 1]!, max: nextThreshold - XP_THRESHOLDS[player.ability.level - 1]!, label: `${player.ability.xp} / ${nextThreshold} XP vers le niveau ${player.ability.level + 1}` },
            abilityPace: focus === 'ability' ? (weeklyXp === 0 ? 'Niveau max' : weeklyXp >= 50 ? 'Rapide' : weeklyXp >= 40 ? 'Moyen' : 'Lent') : null,
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
    store.notify('L’adjoint a remis chacun sur le programme de son poste.');
  }

  /** « ↑ » : le programme fait monter la note générale à ce poste. */
  function optionLabel(position: (typeof rows)[number]['position'], attribute: AttributeName): string {
    return `${ATTRIBUTE_LABEL[attribute]}${focusRaisesOverall(position, attribute) ? ' (monte la note)' : ''}`;
  }
</script>

<div class="ecran">
  <Card title="Entraînement" scotch>
    {#snippet actions()}
      <Button size="s" onclick={reset}>Programme de l'adjoint</Button>
    {/snippet}
    <p class="texte-s discret intro">
      Chaque joueur travaille un axe toutes les semaines. Les jeunes progressent vite, les vétérans peu. Passé son potentiel, un joueur progresse encore, plus lentement et de 5 points au maximum. Travailler sa capacité la fait monter bien plus vite qu’en match, à tout âge, mais le joueur ne progresse alors sur aucun attribut.
    </p>
    <div class="defilant">
      <table class="tableau">
        <caption class="sr-only">Programme d'entraînement de chaque joueur</caption>
        <thead>
          <tr>
            <th scope="col">Nom</th>
            <th scope="col">Poste</th>
            <th scope="col" class="num">Âge</th>
            <th scope="col" class="num">Note</th>
            <th scope="col" class="num">Pot.</th>
            <th scope="col">Évol.</th>
            <th scope="col">Programme</th>
            <th scope="col">Avancement</th>
            <th scope="col">Rythme</th>
            <th scope="col">Bonus</th>
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
                <select class="select" aria-label="Programme de {row.name}" value={row.focus} onchange={(event) => change(row.id, event)}>
                  {#each ATTRIBUTES as attribute (attribute)}<option value={attribute}>{optionLabel(row.position, attribute)}</option>{/each}
                  <option value={ABILITY_FOCUS}>Capacité : {row.abilityName}</option>
                </select>
              </td>
              <td class="avancement">
                {#if row.focus === ABILITY_FOCUS}
                  {#if row.abilityGauge}<Gauge value={row.abilityGauge.value} max={row.abilityGauge.max} label={row.abilityGauge.label} tone="scotch" />{/if}
                  <span class="discret texte-s" title={row.abilityGauge?.label}>{row.abilityXp}</span>
                {:else}
                  <Gauge value={row.progress} max={100} label="Avancement vers le prochain point" tone="scotch" />
                {/if}
              </td>
              <td>{#if row.injured}<span class="malus">Blessé</span>{:else}{row.abilityPace ?? row.pace}{/if}</td>
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
