<script lang="ts">
  import './parts/screens.css';
  import Card from '../kit/Card.svelte';
  import PresidentPanel from './parts/PresidentPanel.svelte';
  import { store } from '../store.svelte';
  import { getAbility } from '../../domain/abilities/catalog';
  import { HOUSE_RULES, isConcernedByRule, TEAM_NIGHT_OPTIONS } from '../../domain/club/discipline';
  import { NEWSPAPER_NAME } from '../../domain/club/press';
  import { chooseTeamNight, humanSquad, toggleHouseRule } from '../../domain/game';
  import type { HouseRule, TeamNight } from '../../domain/types';
  import { signed } from './describe';

  /** Vie du club : règlement intérieur (FRAS-01), soirée (FRAS-06), presse (FRAS-03, FRAS-04), président et historique. */
  const RULE_IDS = Object.keys(HOUSE_RULES) as HouseRule[];
  const NIGHT_IDS = Object.keys(TEAM_NIGHT_OPTIONS) as TeamNight[];

  const club = $derived(
    store.select((game) => {
      const tags = humanSquad(game).map((player) => getAbility(player.ability.abilityId).tags);
      return {
        rules: RULE_IDS.map((id) => ({
          ...HOUSE_RULES[id],
          active: game.houseRules.includes(id),
          concerned: tags.filter((playerTags) => isConcernedByRule(id, playerTags)).length,
        })),
        teamNight: game.teamNight,
        press: game.press.map((article) => ({ ...article })),
        history: game.history.map((record) => ({ ...record })),
      };
    }),
  );

  function toggle(rule: HouseRule): void {
    store.run((game) => toggleHouseRule(game, rule));
  }

  function chooseNight(night: TeamNight): void {
    store.run((game) => chooseTeamNight(game, night));
    store.notify(`Soirée de la semaine : ${TEAM_NIGHT_OPTIONS[night].label.toLowerCase()}.`);
  }

  function deltaClass(value: number): string {
    if (value > 0) return 'bonus';
    return value < 0 ? 'malus' : 'discret';
  }
</script>

<div class="ecran">
  <div class="colonnes">
    <Card title="Règlement intérieur">
      <p class="texte-s discret intro">Chaque règle bride les bonus et les malus des capacités concernées, et le moral de leurs porteurs.</p>
      <ul class="liste-nue">
        {#each club.rules as rule (rule.id)}
          <li class="regle">
            <button class="interrupteur tampon" aria-pressed={rule.active} onclick={() => toggle(rule.id)}>
              {rule.active ? 'Signée' : 'Non signée'}
            </button>
            <div class="texte-s">
              <p class="texte-fort">{rule.label}</p>
              <p>{rule.description}</p>
              <p class="discret">{rule.effect}</p>
              <p class="texte-fort">Concerne {rule.concerned} joueur{rule.concerned > 1 ? 's' : ''} de l'effectif</p>
            </div>
          </li>
        {/each}
      </ul>
    </Card>

    <div class="pile">
      <Card title="Soirée d'équipe">
        <fieldset>
          <legend class="texte-s discret">Choix de la semaine, il compte pour le prochain match.</legend>
          <ul class="liste-nue">
            {#each NIGHT_IDS as id (id)}
              {@const night = TEAM_NIGHT_OPTIONS[id]}
              <li>
                <label class="soiree">
                  <input type="radio" name="soiree" value={id} checked={club.teamNight === id} onchange={() => chooseNight(id)} />
                  <span class="texte-s">
                    <span class="texte-fort">{night.label}</span>
                    <span class="mono">
                      moral <span class={deltaClass(night.moraleDelta)}>{signed(night.moraleDelta)}</span>
                      · capacités alcool <span class={deltaClass(night.alcoholMoraleBonus)}>{signed(night.alcoholMoraleBonus)}</span>
                      · fatigue <span class={deltaClass(-night.fatigueDelta)}>{signed(night.fatigueDelta)}</span>
                    </span>
                    <span class="description">{night.description}</span>
                  </span>
                </label>
              </li>
            {/each}
          </ul>
        </fieldset>
      </Card>

      <Card title="Le président">
        <PresidentPanel speech />
      </Card>
    </div>
  </div>

  <div class="colonnes">
    <Card title={NEWSPAPER_NAME}>
      {#if club.press.length === 0}
        <p class="vide">Aucune une sur le club. Le journaliste attend ta première bêtise.</p>
      {:else}
        <ul class="liste-nue">
          {#each club.press as article (article.id)}
            <li class="article">
              <p class="tampon discret">Saison {article.season} · semaine {article.week}</p>
              <p class="texte-fort">{article.headline}</p>
              <p class="texte-s mono">
                Président <span class={deltaClass(article.presidentDelta)}>{signed(article.presidentDelta)}</span>
                · sponsors <span class={deltaClass(article.sponsorDelta)}>{signed(article.sponsorDelta)}</span>
              </p>
            </li>
          {/each}
        </ul>
      {/if}
    </Card>

    <Card title="Historique">
      {#if club.history.length === 0}
        <p class="vide">Première saison en cours : rien d'écrit pour l'instant.</p>
      {:else}
        <div class="defilant">
          <table class="tableau">
            <caption class="sr-only">Bilan des saisons précédentes</caption>
            <thead>
              <tr>
                <th scope="col" class="num">Saison</th>
                <th scope="col">Division</th>
                <th scope="col" class="num">Place</th>
                <th scope="col" class="num">Tours de coupe</th>
                <th scope="col">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {#each club.history as record (record.season)}
                <tr>
                  <td class="num">{record.season}</td>
                  <td>{record.divisionName}</td>
                  <td class="num">{record.position}e</td>
                  <td class="num">{record.cupRoundsWon}</td>
                  <td>{record.verdict}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Card>
  </div>
</div>

<style>
  p {
    margin: 0;
  }
  .intro {
    margin-bottom: var(--space-4);
  }
  .regle {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
    gap: var(--space-4);
    align-items: start;
    padding-bottom: var(--space-2);
    border-bottom: var(--trait-fin) solid var(--craie-2);
  }
  .regle .texte-s {
    display: grid;
    gap: var(--space-1);
  }
  .interrupteur {
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-fin) solid var(--encre);
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
  }
  .interrupteur[aria-pressed='true'] {
    background: var(--scotch);
    color: var(--encre-fixe);
    border-color: var(--encre-fixe);
  }
  fieldset {
    border: none;
    margin: 0;
    padding: 0;
  }
  legend {
    margin-bottom: var(--space-2);
  }
  .soiree {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-2);
    cursor: pointer;
  }
  .soiree input {
    accent-color: var(--encre);
    margin-top: 4px;
  }
  .soiree .texte-s {
    display: grid;
  }
  .description {
    color: var(--encre-pale);
  }
  .article {
    display: grid;
    gap: var(--space-1);
    padding-bottom: var(--space-2);
    border-bottom: var(--trait-fin) solid var(--craie-2);
  }
  @media (max-width: 600px) {
    .regle {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
