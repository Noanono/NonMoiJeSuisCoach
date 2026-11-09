<script lang="ts">
  import './parts/screens.css';
  import Card from '../kit/Card.svelte';
  import FormBadge from '../kit/FormBadge.svelte';
  import { store } from '../store.svelte';
  import { divisionStandings, humanDivision, outcomeFor } from '../../domain/game';
  import { cupRoundFixtures, cupRoundName, cupWinnerId, fixtureWinnerId } from '../../domain/league/cup';
  import { goalDifference } from '../../domain/league/standings';
  import type { Fixture } from '../../domain/types';
  import { signed } from './describe';
  import type { FormLetter } from './views';

  /** Divisions et classements (UNIV-03 à UNIV-05), calendrier du coach et coupe (UNIV-06). */
  const FORM_LETTER = { win: 'V', draw: 'N', loss: 'D' } as const;

  const divisions = $derived(
    store.select((game) => ({
      list: [...game.divisions].sort((a, b) => a.tier - b.tier).map((division) => ({ id: division.id, name: division.name })),
      humanId: humanDivision(game).id,
    })),
  );

  let chosenDivisionId = $state<string | null>(null);
  const divisionId = $derived(
    chosenDivisionId && divisions.list.some((division) => division.id === chosenDivisionId) ? chosenDivisionId : divisions.humanId,
  );

  /** Classement recalculé seulement quand la partie ou la division affichée change. */
  const table = $derived(
    store.select((game) => {
      const division = game.divisions.find((candidate) => candidate.id === divisionId)!;
      const size = division.clubIds.length;
      return divisionStandings(game, division.id).map((row, index) => {
        const rank = index + 1;
        let zone: string | null = null;
        if (rank <= division.promoted) zone = 'Montée';
        else if (rank > size - division.relegated) zone = 'Descente';
        return {
          ...row,
          rank,
          zone,
          difference: goalDifference(row),
          name: game.clubs[row.clubId]?.name ?? '?',
          isHuman: row.clubId === game.humanClubId,
        };
      });
    }),
  );

  function scoreOf(fixture: Fixture): string | null {
    const { result } = fixture;
    if (!result) return null;
    const shootout = result.penaltyWinnerId ? ' (t.a.b.)' : '';
    return `${result.homeGoals}-${result.awayGoals}${shootout}`;
  }

  const calendar = $derived(
    store.select((game) =>
      [...game.fixtures, ...game.cup.fixtures]
        .filter((fixture) => fixture.homeId === game.humanClubId || fixture.awayId === game.humanClubId)
        .sort((a, b) => a.week - b.week)
        .map((fixture) => {
          const isHome = fixture.homeId === game.humanClubId;
          const outcome = outcomeFor(fixture, game.humanClubId);
          return {
            id: fixture.id,
            week: fixture.week,
            current: fixture.week === game.week,
            competition: fixture.competition === 'league' ? `J${fixture.round}` : cupRoundName(game.cup, fixture.round),
            isHome,
            opponent: game.clubs[isHome ? fixture.awayId : fixture.homeId]?.name ?? '?',
            score: scoreOf(fixture),
            result: outcome ? (FORM_LETTER[outcome] as FormLetter) : null,
          };
        }),
    ),
  );

  const cup = $derived(
    store.select((game) => {
      const { cup: state } = game;
      const winnerId = cupWinnerId(state);
      return {
        currentRound: state.currentRound,
        totalRounds: state.totalRounds,
        byes: state.byeClubIds.length,
        humanBye: state.byeClubIds.includes(game.humanClubId),
        winner: winnerId ? (game.clubs[winnerId]?.name ?? '?') : null,
        rounds: Array.from({ length: state.currentRound }, (_, index) => {
          const round = index + 1;
          return {
            round,
            name: cupRoundName(state, round),
            fixtures: cupRoundFixtures(state, round).map((fixture) => {
              const winner = fixture.result ? fixtureWinnerId(fixture) : null;
              return {
                id: fixture.id,
                home: game.clubs[fixture.homeId]?.name ?? '?',
                away: game.clubs[fixture.awayId]?.name ?? '?',
                homeWon: winner === fixture.homeId,
                awayWon: winner === fixture.awayId,
                score: scoreOf(fixture),
                involvesHuman: fixture.homeId === game.humanClubId || fixture.awayId === game.humanClubId,
              };
            }),
          };
        }),
      };
    }),
  );

  let chosenRound = $state<number | null>(null);
  const shownRound = $derived(cup.rounds.find((round) => round.round === (chosenRound ?? cup.currentRound)) ?? cup.rounds.at(-1));
</script>

<div class="ecran">
  <div class="colonnes large-gauche">
    <Card title="Classement">
      {#snippet actions()}
        <label class="champ">
          <span class="sr-only">Division affichée</span>
          <select class="select" value={divisionId} onchange={(event) => (chosenDivisionId = event.currentTarget.value)}>
            {#each divisions.list as division (division.id)}
              <option value={division.id}>{division.name}{division.id === divisions.humanId ? ' (la tienne)' : ''}</option>
            {/each}
          </select>
        </label>
      {/snippet}
      <div class="defilant">
        <table class="tableau">
          <caption class="sr-only">Classement de la division : points, puis différence de buts</caption>
          <thead>
            <tr>
              <th scope="col" class="num">#</th>
              <th scope="col">Club</th>
              <th scope="col" class="num"><abbr title="Joués">J</abbr></th>
              <th scope="col" class="num"><abbr title="Gagnés">G</abbr></th>
              <th scope="col" class="num"><abbr title="Nuls">N</abbr></th>
              <th scope="col" class="num"><abbr title="Perdus">P</abbr></th>
              <th scope="col" class="num"><abbr title="Buts pour">BP</abbr></th>
              <th scope="col" class="num"><abbr title="Buts contre">BC</abbr></th>
              <th scope="col" class="num"><abbr title="Différence de buts">Diff</abbr></th>
              <th scope="col" class="num">Pts</th>
              <th scope="col">Zone</th>
            </tr>
          </thead>
          <tbody>
            {#each table as row (row.clubId)}
              <tr class:surligne={row.isHuman} aria-current={row.isHuman ? 'true' : undefined}>
                <td class="num">{row.rank}</td>
                <td class:texte-fort={row.isHuman}>{row.name}</td>
                <td class="num">{row.played}</td>
                <td class="num">{row.won}</td>
                <td class="num">{row.drawn}</td>
                <td class="num">{row.lost}</td>
                <td class="num">{row.goalsFor}</td>
                <td class="num">{row.goalsAgainst}</td>
                <td class="num">{signed(row.difference)}</td>
                <td class="num texte-fort">{row.points}</td>
                <td class="tampon">{row.zone ?? ''}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>

    <Card title="Ton calendrier">
      <div class="defilant">
        <table class="tableau">
          <caption class="sr-only">Matchs de ton club cette saison, championnat et coupe</caption>
          <thead>
            <tr>
              <th scope="col" class="num">Sem.</th>
              <th scope="col">Compét.</th>
              <th scope="col">Adversaire</th>
              <th scope="col" class="num">Score</th>
              <th scope="col"><span class="sr-only">Résultat</span></th>
            </tr>
          </thead>
          <tbody>
            {#each calendar as match (match.id)}
              <tr class:surligne={match.current}>
                <td class="num">{match.week}</td>
                <td class="texte-s">{match.competition}</td>
                <td>
                  {match.opponent}
                  <span class="discret texte-s">{match.isHome ? 'dom.' : 'ext.'}</span>
                </td>
                <td class="num">{match.score ?? (match.current ? 'Cette sem.' : '')}</td>
                <td>{#if match.result}<FormBadge result={match.result} />{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  </div>

  <Card title="La coupe">
    {#snippet actions()}
      {#if cup.winner}<span class="tampon">Vainqueur : {cup.winner}</span>{/if}
    {/snippet}
    {#if cup.rounds.length === 0}
      <p class="vide">Le tirage n'a pas encore eu lieu.</p>
    {:else}
      <div class="tours" role="group" aria-label="Tours de coupe">
        {#each cup.rounds as round (round.round)}
          <button class="onglet tampon" aria-pressed={round.round === shownRound?.round} onclick={() => (chosenRound = round.round)}>
            {round.name}
          </button>
        {/each}
      </div>
      {#if shownRound}
        {#if shownRound.round === 1 && cup.byes > 0}
          <p class="texte-s discret">
            {cup.byes} clubs exemptés entrent au tour suivant{cup.humanBye ? ', dont le tien' : ''}.
          </p>
        {/if}
        <ul class="liste-nue rencontres">
          {#each shownRound.fixtures as fixture (fixture.id)}
            <li class="rencontre texte-s" class:surligne={fixture.involvesHuman}>
              <span class="equipe domicile" class:texte-fort={fixture.homeWon}>{fixture.home}</span>
              <span class="mono score">{fixture.score ?? '–'}</span>
              <span class="equipe" class:texte-fort={fixture.awayWon}>{fixture.away}</span>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </Card>
</div>

<style>
  p {
    margin: 0 0 var(--space-2);
  }
  abbr {
    text-decoration: none;
  }
  .tours {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
  .onglet {
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-fin) solid var(--encre);
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
  }
  .onglet[aria-pressed='true'] {
    background: var(--scotch);
    color: var(--encre-fixe);
    border-color: var(--encre-fixe);
  }
  .rencontres {
    grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
    gap: var(--space-1) var(--space-4);
  }
  .rencontre {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-bottom: var(--trait-fin) solid var(--craie-2);
  }
  .rencontre.surligne {
    background: var(--scotch);
    color: var(--encre-fixe);
  }
  .domicile {
    text-align: right;
  }
  .score {
    text-align: center;
  }
  .equipe {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
