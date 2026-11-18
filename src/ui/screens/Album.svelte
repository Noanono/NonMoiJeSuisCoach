<script lang="ts">
  import { t, td, type MessageKey } from '../../i18n/t';
  import './parts/screens.css';
  import Gauge from '../kit/Gauge.svelte';
  import Sticker from '../kit/Sticker.svelte';
  import { store } from '../store.svelte';
  import { discoveredAbilityIds } from '../../domain/game';
  import { ABILITIES } from '../../domain/abilities/catalog';
  import { level5Bonus, MAX_LEVEL, RARITY_LABEL, statsAtLevel } from '../../domain/abilities/progression';
  import type { AbilityPosition, Rarity } from '../../domain/types';
  import { ABILITY_POSITION_LABEL, describeEffect, describeLevel5, describeTargeting, describeTrigger } from './describe';

  /**
   * Encyclopédie des capacités (ENC-01) : les 77 capacités du jeu, filtrées par rareté et par poste,
   * avec leurs effets du niveau 1 au niveau 5. Celles déjà croisées en match (ou portées par un de tes
   * joueurs) sont découvertes ; les autres restent grisées, comme les cases vides d'un album.
   */
  const RARITIES: Rarity[] = ['common', 'rare', 'legendary', 'mythic', 'foreign'];
  const POSITIONS: AbilityPosition[] = ['GK', 'DEF', 'MID', 'ATT', 'ANY', 'BENCH'];
  const RARITY_TONE: Record<Rarity, 'craie' | 'scotch' | 'fumigene' | 'mythique' | 'etranger'> = { common: 'craie', rare: 'scotch', legendary: 'fumigene', mythic: 'mythique', foreign: 'etranger' };
  const LEVELS = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1);

  const known = $derived(store.select((game) => discoveredAbilityIds(game)));

  let rarity = $state<Rarity | 'all'>('all');
  let position = $state<AbilityPosition | 'all'>('all');
  let onlyKnown = $state(false);
  let level = $state(1);

  // Tri par rareté, puis par nom dans la langue affichée.
  const sorted = $derived([...ABILITIES].sort((a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || td(a.name).localeCompare(td(b.name))));

  const shown = $derived(
    sorted.filter((ability) => (rarity === 'all' || ability.rarity === rarity) && (position === 'all' || ability.position === position) && (!onlyKnown || known.has(ability.id))),
  );

  const progress = $derived.by(() => {
    const byRarity = RARITIES.map((id) => {
      const all = ABILITIES.filter((ability) => ability.rarity === id);
      return { id, total: all.length, found: all.filter((ability) => known.has(ability.id)).length };
    });
    return { found: byRarity.reduce((sum, row) => sum + row.found, 0), total: ABILITIES.length, byRarity };
  });

  const POSITION_FILTER: Record<AbilityPosition, MessageKey> = {
    GK: 'album.position.GK',
    DEF: 'album.position.DEF',
    MID: 'album.position.MID',
    ATT: 'album.position.ATT',
    ANY: 'album.position.ANY',
    BENCH: 'album.position.BENCH',
  };
</script>

<div class="ecran">
  <section class="avancee" aria-label={t('album.progressLabel')}>
    <div class="titre">
      <h2 class="banderole-m">{t('album.title')}</h2>
      <span class="mono texte-fort compte">{t('album.count', { found: progress.found, total: progress.total })}</span>
    </div>
    <Gauge value={progress.found} max={progress.total} label={t('album.progressLabel')} tone="scotch" />
    <ul class="liste-nue raretes">
      {#each progress.byRarity as row (row.id)}
        <li><Sticker tone={RARITY_TONE[row.id]}>{td(RARITY_LABEL[row.id])} · {row.found}/{row.total}</Sticker></li>
      {/each}
    </ul>
    <p class="texte-s discret">{t('album.hint')}</p>
  </section>

  <section class="filtres" aria-label={t('album.filters')}>
    <div class="groupe" role="radiogroup" aria-label={t('album.rarity')}>
      <span class="tampon">{t('album.rarity')}</span>
      <button class="puce tampon" role="radio" aria-checked={rarity === 'all'} onclick={() => (rarity = 'all')}>{t('album.all')}</button>
      {#each RARITIES as id (id)}
        <button class="puce tampon {id}" role="radio" aria-checked={rarity === id} onclick={() => (rarity = id)}>{td(RARITY_LABEL[id])}</button>
      {/each}
    </div>
    <div class="groupe" role="radiogroup" aria-label={t('album.position.label')}>
      <span class="tampon">{t('album.position.label')}</span>
      <button class="puce tampon" role="radio" aria-checked={position === 'all'} onclick={() => (position = 'all')}>{t('album.all')}</button>
      {#each POSITIONS as id (id)}
        <button class="puce tampon" role="radio" aria-checked={position === id} onclick={() => (position = id)}>{t(POSITION_FILTER[id])}</button>
      {/each}
    </div>
    <div class="groupe" role="radiogroup" aria-label={t('album.level')}>
      <span class="tampon">{t('album.level')}</span>
      {#each LEVELS as value (value)}
        <button class="puce tampon niveau" role="radio" aria-checked={level === value} onclick={() => (level = value)}>{value}</button>
      {/each}
    </div>
    <label class="coche texte-s">
      <input type="checkbox" bind:checked={onlyKnown} />
      {t('album.onlyKnown')}
    </label>
  </section>

  {#if shown.length === 0}
    <p class="vide">{t('album.empty')}</p>
  {:else}
    <ul class="liste-nue album">
      {#each shown as ability (ability.id)}
        {@const found = known.has(ability.id)}
        <li class="fiche {ability.rarity}" class:inconnue={!found}>
          <header>
            <h3 class="nom">{found ? td(ability.name) : t('album.unknownName')}</h3>
            <Sticker tone={RARITY_TONE[ability.rarity]}>{td(RARITY_LABEL[ability.rarity])}</Sticker>
          </header>
          {#if found}
            {@const stats = statsAtLevel(ability, level)}
            <p class="description texte-s">{td(ability.description)}</p>
            <dl class="paire texte-s">
              <dt>{t('ability.position')}</dt>
              <dd>{ABILITY_POSITION_LABEL[ability.position]}</dd>
              <dt>{t('ability.when')}</dt>
              <dd>{describeTrigger(ability.trigger)}</dd>
              <dt>{t('ability.targeting')}</dt>
              <dd>{describeTargeting(stats.targeting)}</dd>
              <dt>{t('ability.cost')}</dt>
              <dd class="mono">{t('ability.costValue', { cost: stats.cost })}</dd>
            </dl>
            <div class="effets">
              <span class="tampon">{t('ability.level', { level })}</span>
              <ul>
                {#each stats.effects as effect, index (index)}<li>{describeEffect(effect)}</li>{/each}
              </ul>
              {#if level === MAX_LEVEL}<p class="texte-s"><span class="tampon">{t('ability.level5')}</span> {describeLevel5(level5Bonus(ability))}</p>{/if}
            </div>
          {:else}
            <p class="silhouette" aria-hidden="true">?</p>
            <p class="texte-s">{ABILITY_POSITION_LABEL[ability.position]} · {t('album.unknownHint')}</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .avancee {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--craie);
    border: var(--trait-epais) solid var(--encre);
    box-shadow: var(--ombre-sticker);
  }
  .avancee p {
    margin: 0;
  }
  .titre {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .titre h2 {
    margin: 0;
  }
  .compte {
    font-size: 22px;
  }
  .raretes {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .filtres {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-fin) solid var(--encre);
  }
  .groupe {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1);
  }
  .groupe > .tampon:first-child {
    min-width: 6.5em;
  }
  .puce {
    min-height: 36px;
    padding: var(--space-1) var(--space-2);
    font: inherit;
    color: var(--encre);
    background: var(--craie);
    border: var(--trait-fin) solid var(--encre);
    cursor: pointer;
  }
  .puce.niveau {
    min-width: 40px;
  }
  .puce[aria-checked='true'] {
    background: var(--encre);
    color: var(--craie);
    box-shadow: var(--ombre-presse);
  }
  .coche {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }
  .coche input {
    width: 20px;
    height: 20px;
    accent-color: var(--encre);
  }
  .album {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
    gap: var(--space-4);
  }
  .fiche {
    display: grid;
    align-content: start;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    box-shadow: var(--ombre-sticker);
    border-top-width: 10px;
  }
  .fiche.rare {
    border-top-color: var(--scotch);
  }
  .fiche.legendary {
    border-top-color: var(--fumigene);
  }
  .fiche.mythic {
    border-top-color: var(--mythique);
  }
  .fiche.foreign {
    border-top-color: var(--etranger);
  }
  /* Case vide de l'album : grisée, en pointillés. */
  .fiche.inconnue {
    background: var(--craie-2);
    color: var(--encre-pale);
    border-style: dashed;
    box-shadow: none;
    border-top-color: var(--encre-pale);
  }
  .fiche.inconnue :global(.sticker) {
    filter: grayscale(1);
    opacity: 0.7;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .nom {
    margin: 0;
    font-family: var(--font-display);
    font-size: 22px;
    line-height: 1.1;
  }
  .description,
  .fiche p {
    margin: 0;
  }
  .effets {
    display: grid;
    gap: var(--space-1);
    padding-top: var(--space-2);
    border-top: var(--trait-fin) dashed var(--encre);
  }
  .effets ul {
    margin: 0;
    padding-left: 1.2em;
  }
  .silhouette {
    font-family: var(--font-display);
    font-size: 64px;
    line-height: 1;
    text-align: center;
  }
</style>
