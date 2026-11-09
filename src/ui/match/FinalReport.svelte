<script lang="ts">
  import type { MatchSummary, Side } from '../../domain/match';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import FormBadge from '../kit/FormBadge.svelte';
  import { store } from '../store.svelte';
  import { formatPercent } from '../format';
  import { minuteLabel } from './live';
  import { consequenceText, outcomeFor, outcomeLine } from './verdict';

  /** Résumé de fin de match (MATCH-06) : le score, puis tout ce qui s'est passé, capacités comprises. */
  interface Props {
    summary: MatchSummary;
    coachSide: Side;
  }

  let { summary, coachSide }: Props = $props();

  const SIDES: readonly Side[] = ['home', 'away'];

  const teamName = (side: Side) => (side === 'home' ? summary.homeName : summary.awayName);
  const outcome = $derived(outcomeFor(summary, coachSide));
  const headline = $derived(outcomeLine(summary, coachSide));
  const consequences = $derived.by(() => {
    const names = new Map(summary.players.map((player) => [player.playerId, player.name]));
    const nameOf = (id: string) => names.get(id) ?? '?';
    return summary.consequences[coachSide].map((consequence) => consequenceText(consequence, nameOf));
  });

  let heading: HTMLHeadingElement;
  $effect(() => heading.focus());
</script>

<main class="resume">
  <header class="banderole">
    <h1 class="banderole-l" tabindex="-1" bind:this={heading}>
      <span class="nom">{coachSide === 'home' ? summary.homeName : summary.awayName}</span>
      <span class="score">{coachSide === 'home' ? `${summary.homeGoals}-${summary.awayGoals}` : `${summary.awayGoals}-${summary.homeGoals}`}</span>
      <span class="nom">{coachSide === 'home' ? summary.awayName : summary.homeName}</span>
    </h1>
    {#if summary.shootout}
      <p class="tampon">Tirs au but {summary.shootout.home}-{summary.shootout.away}</p>
    {/if}
  </header>

  <p class="verdict">
    <FormBadge result={outcome} />
    <span class="texte-fort">{headline}</span>
  </p>

  <div class="grille">
    <Card title="Buts">
      <div class="camps">
        {#each coachSide === 'home' ? SIDES : [...SIDES].reverse() as side (side)}
          <div>
            <h3 class="tampon">{teamName(side)}</h3>
            <ul class="liste texte-s">
              {#each summary.goals.filter((goal) => goal.side === side) as goal, index (index)}
                <li>
                  <span class="tampon">{minuteLabel(goal.minute, goal.addedMinute)}</span>
                  {goal.playerName}{goal.penalty ? ' (pen.)' : ''}{goal.value > 1 ? ' (×2)' : ''}
                </li>
              {:else}
                <li class="vide">Aucun but.</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </Card>

    <Card title="Cartons et blessures">
      <ul class="liste texte-s">
        {#each summary.cards as card, index (index)}
          <li>
            <span class="tampon">{card.minute}'</span>
            <span class="carton tampon {card.card}">{card.card === 'red' ? 'Rouge' : 'Jaune'}</span>
            {card.playerName} <span class="pale">({teamName(card.side)})</span>
          </li>
        {/each}
        {#each summary.injuries as injury, index (index)}
          <li>
            <span class="tampon">{injury.minute}'</span>
            <span class="carton tampon blessure">Blessé</span>
            {injury.playerName}, {injury.weeks > 0 ? `${injury.weeks} sem.` : 'rien de grave'} <span class="pale">({teamName(injury.side)})</span>
          </li>
        {/each}
        {#if summary.cards.length === 0 && summary.injuries.length === 0}
          <li class="vide">Aucun carton, aucune blessure.</li>
        {/if}
      </ul>
    </Card>
  </div>

  <Card title="Capacités">
    {#if summary.abilities.length === 0}
      <p class="vide texte-s">Aucune capacité utilisée.</p>
    {:else}
      <div class="defile">
        <table class="texte-s">
          <thead>
            <tr>
              <th class="tampon" scope="col">Min.</th>
              <th class="tampon" scope="col">Camp</th>
              <th class="tampon" scope="col">Joueur</th>
              <th class="tampon" scope="col">Capacité</th>
              <th class="tampon" scope="col">Impact</th>
              <th class="tampon chiffre" scope="col">XP</th>
            </tr>
          </thead>
          <tbody>
            {#each summary.abilities as report, index (index)}
              <tr>
                <td class="tampon">{report.minute}'</td>
                <td>{report.side === coachSide ? 'Toi' : 'En face'}</td>
                <td>{report.playerName}</td>
                <td class="texte-fort">{report.abilityName}</td>
                <td>{report.text} <span class="tampon">{formatPercent(report.impact)}</span></td>
                <td class="tampon chiffre">{report.xp}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <Card title="Après le match" tone="craie-2">
    {#if consequences.length === 0}
      <p class="vide texte-s">Rien à signaler pour la suite.</p>
    {:else}
      <ul class="liste texte-s">
        {#each consequences as text, index (index)}<li>{text}</li>{/each}
      </ul>
    {/if}
  </Card>

  <div class="sortie">
    <Button variant="primary" onclick={() => store.leaveMatch()}>Retour au bureau</Button>
  </div>
</main>

<style>
  .resume {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    max-width: 1100px;
    margin: 0 auto;
    padding: var(--space-6) var(--marge-page) var(--space-10);
  }
  .banderole {
    background: var(--fumigene);
    color: var(--encre-fixe);
    border: var(--trait-epais) solid var(--encre-fixe);
    box-shadow: var(--ombre-sticker);
    padding: var(--space-4);
    text-align: center;
  }
  .banderole h1 {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    gap: var(--space-2) var(--space-4);
    text-transform: uppercase;
  }
  .banderole h1:focus {
    outline: none;
  }
  .banderole p {
    margin: var(--space-2) 0 0;
  }
  .score {
    font-variant-numeric: tabular-nums;
  }
  .nom {
    font-size: 0.6em;
  }
  .verdict {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    padding: var(--space-2) var(--space-4);
  }
  .grille {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-6);
  }
  .camps {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
  }
  h3 {
    margin: 0 0 var(--space-1);
    font-family: var(--font-mono);
  }
  .liste {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .vide,
  .pale {
    color: var(--encre-pale);
  }
  .carton {
    padding: 0 var(--space-1);
    border: var(--trait-fin) solid var(--encre);
  }
  .yellow {
    background: var(--scotch);
    color: var(--encre-fixe);
  }
  .red,
  .blessure {
    background: var(--carton);
    color: var(--craie);
  }
  .defile {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    text-align: left;
    padding: var(--space-1) var(--space-2);
    border-bottom: var(--trait-fin) solid var(--encre);
    vertical-align: top;
  }
  tbody tr:nth-child(even) {
    background: var(--craie-2);
  }
  .chiffre {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .sortie {
    display: flex;
    justify-content: center;
  }
  @media (max-width: 900px) {
    .grille {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
