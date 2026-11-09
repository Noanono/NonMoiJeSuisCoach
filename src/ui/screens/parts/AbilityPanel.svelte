<script lang="ts">
  import Gauge from '../../kit/Gauge.svelte';
  import Sticker from '../../kit/Sticker.svelte';
  import { MAX_LEVEL, RARITY_LABEL, statsAtLevel, XP_THRESHOLDS } from '../../../domain/abilities/progression';
  import type { Ability, AbilityProgress, AbilityStats, Rarity } from '../../../domain/types';
  import { ABILITY_POSITION_LABEL, describeCooldown, describeEffect, describeRisk, describeTargeting, describeTrigger, percent } from '../describe';

  /** Capacité complète d'un joueur (CAP-04, CAP-08, CAP-10 à CAP-12) : stats au niveau actuel et au suivant. */
  interface Props {
    ability: Ability;
    progress: AbilityProgress;
  }

  let { ability, progress }: Props = $props();

  const RARITY_TONE: Record<Rarity, 'craie' | 'scotch' | 'fumigene'> = { common: 'craie', rare: 'scotch', legendary: 'fumigene' };
  const TAG_LABEL = { alcohol: 'alcool', vice: 'vice', family: 'famille' } as const;

  interface LevelColumn {
    level: number;
    caption: string;
    stats: AbilityStats;
  }

  const columns = $derived.by((): LevelColumn[] => {
    const current = { level: progress.level, caption: `Niv. ${progress.level} (actuel)`, stats: statsAtLevel(ability, progress.level) };
    if (progress.level >= MAX_LEVEL) return [current];
    const next = progress.level + 1;
    return [current, { level: next, caption: `Niv. ${next}`, stats: statsAtLevel(ability, next) }];
  });

  /** XP dans le niveau en cours, pour la jauge (CAP-10). */
  const xp = $derived.by(() => {
    if (progress.level >= MAX_LEVEL) return null;
    const floor = XP_THRESHOLDS[progress.level - 1] ?? 0;
    const ceiling = XP_THRESHOLDS[progress.level] ?? floor;
    return { current: progress.xp, target: ceiling, gained: progress.xp - floor, span: ceiling - floor };
  });
</script>

<section class="capacite" aria-label="Capacité spéciale">
  <header>
    <h3 class="banderole-m">{ability.name}</h3>
    <Sticker tone={RARITY_TONE[ability.rarity]}>{RARITY_LABEL[ability.rarity]}</Sticker>
    {#if ability.rarity === 'legendary'}<span class="tampon discret">Une fois par saison</span>{/if}
  </header>

  <p class="texte-fort description">{ability.description}</p>
  <p class="texte-s"><span class="tampon">Revers</span> {ability.downside}</p>

  <dl class="paire texte-s">
    <dt>Poste conseillé</dt>
    <dd>{ABILITY_POSITION_LABEL[ability.position]}</dd>
    <dt>Ciblage</dt>
    <dd>{describeTargeting(ability.targeting)}</dd>
    <dt>Quand</dt>
    <dd>
      {describeTrigger(ability.trigger)}{#if ability.condition?.minMinute}, dès la {ability.condition.minMinute}e{/if}{#if ability.condition?.whenLeading}, quand l'équipe mène{/if}
    </dd>
    {#if ability.tags.length > 0}
      <dt>Étiquettes</dt>
      <dd>{ability.tags.map((tag) => TAG_LABEL[tag]).join(', ')} <span class="discret">(règlement intérieur, soirées)</span></dd>
    {/if}
  </dl>

  <div class="defilant">
    <table class="tableau niveaux">
      <caption class="tampon">Stats chiffrées</caption>
      <thead>
        <tr>
          <th scope="col"><span class="sr-only">Stat</span></th>
          {#each columns as column (column.level)}
            <th scope="col">{column.caption}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Réussite</th>
          {#each columns as column (column.level)}<td class="mono">{percent(column.stats.successChance)}</td>{/each}
        </tr>
        <tr>
          <th scope="row">Effets</th>
          {#each columns as column (column.level)}
            <td>
              <ul class="effets">
                {#each column.stats.effects as effect, index (index)}<li>{describeEffect(effect)}</li>{/each}
              </ul>
            </td>
          {/each}
        </tr>
        <tr>
          <th scope="row">Risques</th>
          {#each columns as column (column.level)}
            <td>
              {#if column.stats.risks.length === 0}
                <span class="discret">Aucun</span>
              {:else}
                <ul class="effets">
                  {#each column.stats.risks as risk, index (index)}<li>{describeRisk(risk)}</li>{/each}
                </ul>
              {/if}
            </td>
          {/each}
        </tr>
        <tr>
          <th scope="row">Recharge</th>
          {#each columns as column (column.level)}<td class="mono">{describeCooldown(column.stats.cooldown)}</td>{/each}
        </tr>
        <tr>
          <th scope="row">Coût</th>
          {#each columns as column (column.level)}<td class="mono">{column.stats.cost} pt{column.stats.cost > 1 ? 's' : ''} de gueulante</td>{/each}
        </tr>
      </tbody>
    </table>
  </div>

  <p class="texte-s"><span class="tampon">Niveau 5</span> {ability.level5Text}</p>

  <div class="xp">
    <span class="tampon">Niveau {progress.level} / {MAX_LEVEL}</span>
    {#if xp}
      <Gauge value={xp.gained} max={xp.span} label="Expérience vers le niveau suivant" tone="scotch" />
      <span class="mono texte-s">{xp.current} / {xp.target} XP</span>
    {:else}
      <span class="texte-s">Niveau maximum atteint.</span>
    {/if}
  </div>
</section>

<style>
  .capacite {
    display: grid;
    gap: var(--space-2);
    border: var(--trait-fin) solid var(--encre);
    padding: var(--space-4);
    background: var(--craie);
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-4);
  }
  p {
    margin: 0;
  }
  .niveaux th[scope='row'] {
    border-bottom: var(--trait-fin) solid var(--craie-2);
    vertical-align: top;
  }
  .niveaux td {
    vertical-align: top;
  }
  .effets {
    margin: 0;
    padding-left: var(--space-4);
  }
  .xp {
    display: grid;
    grid-template-columns: max-content minmax(80px, 200px) max-content;
    align-items: center;
    gap: var(--space-2) var(--space-4);
  }
</style>
