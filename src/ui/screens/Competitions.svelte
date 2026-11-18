<script lang="ts">
  import { t, td } from '../../i18n/t';
  import './parts/screens.css';
  import Card from '../kit/Card.svelte';
  import FormBadge from '../kit/FormBadge.svelte';
  import { store } from '../store.svelte';
  import { divisionStandings, humanDivision, isDerby, outcomeFor } from '../../domain/game';
  import { cupRoundFixtures, cupRoundName, cupWinnerId, fixtureWinnerId } from '../../domain/league/cup';
  import { playoffZone } from '../../domain/league/playoffs';
  import { goalDifference } from '../../domain/league/standings';
  import type { Fixture } from '../../domain/types';
  import { signed } from './describe';
  import { transferWindows, type FormLetter } from './views';

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
      const hasUpper = game.divisions.some((candidate) => candidate.tier === division.tier - 1);
      const hasLower = game.divisions.some((candidate) => candidate.tier === division.tier + 1);
      return divisionStandings(game, division.id).map((row, index) => {
        const rank = index + 1;
        let zone: string | null = null;
        const barrage = playoffZone(division, hasUpper, hasLower, rank);
        if (rank <= division.promoted) zone = t('competitions.zone.promotion');
        else if (rank > size - division.relegated) zone = t('competitions.zone.relegation');
        else if (barrage) zone = barrage === 'up' ? t('competitions.zone.playoffUp') : t('competitions.zone.playoffDown');
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
    const shootout = result.penaltyWinnerId ? t('competitions.shootout') : '';
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
            competition: fixture.competition === 'league' ? t('competitions.matchday', { round: fixture.round }) : fixture.competition === 'playoff' ? t('competitions.playoff') : td(cupRoundName(game.cup, fixture.round)),
            isHome,
            opponent: game.clubs[isHome ? fixture.awayId : fixture.homeId]?.name ?? '?',
            score: scoreOf(fixture),
            result: outcome ? (FORM_LETTER[outcome] as FormLetter) : null,
            derby: isDerby(game, fixture),
          };
        }),
    ),
  );

  const WINDOWS = transferWindows();
  const currentWeek = $derived(store.select((game) => game.week));

  /** Matchs et périodes de mercato, dans l'ordre de la saison. */
  const agenda = $derived([
    ...calendar.map((match) => ({ kind: 'match' as const, key: match.id, week: match.week, match })),
    ...WINDOWS.map((window) => ({
      kind: 'mercato' as const,
      key: `mercato-${window.first}`,
      week: window.first,
      first: window.first,
      last: window.last,
      status: currentWeek > window.last ? t('competitions.window.over') : currentWeek >= window.first ? t('competitions.window.open') : t('competitions.window.upcoming'),
      open: currentWeek >= window.first && currentWeek <= window.last,
    })),
  ].sort((a, b) => a.week - b.week));

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
            name: td(cupRoundName(state, round)),
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
    <Card title={t('competitions.table')}>
      {#snippet actions()}
        <label class="champ">
          <span class="sr-only">{t('competitions.shownDivision')}</span>
          <select class="select" value={divisionId} onchange={(event) => (chosenDivisionId = event.currentTarget.value)}>
            {#each divisions.list as division (division.id)}
              <option value={division.id}>{td(division.name)}{division.id === divisions.humanId ? t('stats.yours') : ''}</option>
            {/each}
          </select>
        </label>
      {/snippet}
      <div class="defilant">
        <table class="tableau">
          <caption class="sr-only">{t('competitions.tableCaption')}</caption>
          <thead>
            <tr>
              <th scope="col" class="num">#</th>
              <th scope="col">{t('shell.tabs.club')}</th>
              <th scope="col" class="num"><abbr title={t('competitions.col.played')}>{t('competitions.col.playedShort')}</abbr></th>
              <th scope="col" class="num"><abbr title={t('competitions.col.won')}>{t('competitions.col.wonShort')}</abbr></th>
              <th scope="col" class="num"><abbr title={t('competitions.col.drawn')}>{t('competitions.col.drawnShort')}</abbr></th>
              <th scope="col" class="num"><abbr title={t('competitions.col.lost')}>{t('competitions.col.lostShort')}</abbr></th>
              <th scope="col" class="num"><abbr title={t('competitions.col.for')}>{t('competitions.col.forShort')}</abbr></th>
              <th scope="col" class="num"><abbr title={t('competitions.col.against')}>{t('competitions.col.againstShort')}</abbr></th>
              <th scope="col" class="num"><abbr title={t('competitions.col.difference')}>{t('competitions.col.differenceShort')}</abbr></th>
              <th scope="col" class="num">{t('competitions.col.points')}</th>
              <th scope="col">{t('competitions.col.zone')}</th>
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

    <Card title={t('competitions.calendar')}>
      <p class="texte-s rappel">
        <span class="tampon pastille-mercato">{t('shell.tabs.market')}</span>
        {#each WINDOWS as window, index (window.first)}{index > 0 ? t('competitions.and') : ''}{t('competitions.weeks')} <span class="mono texte-fort">{t('competitions.range', { first: window.first, last: window.last })}</span>{/each}
      </p>
      <div class="defilant">
        <table class="tableau">
          <caption class="sr-only">{t('competitions.calendarCaption')}</caption>
          <thead>
            <tr>
              <th scope="col" class="num">{t('competitions.col.week')}</th>
              <th scope="col">{t('competitions.col.competition')}</th>
              <th scope="col">{t('competitions.col.opponent')}</th>
              <th scope="col" class="num">{t('dashboard.score')}</th>
              <th scope="col"><span class="sr-only">{t('competitions.col.result')}</span></th>
            </tr>
          </thead>
          <tbody>
            {#each agenda as entry (entry.key)}
              {#if entry.kind === 'mercato'}
                <tr class="mercato" class:ouvert={entry.open}>
                  <td class="num">{entry.first}-{entry.last}</td>
                  <td colspan="4"><span class="tampon">{t('shell.tabs.market')}</span> <span class="texte-s">{entry.status}</span></td>
                </tr>
              {:else}
                {@const match = entry.match}
                <tr class:surligne={match.current}>
                  <td class="num">{match.week}</td>
                  <td class="texte-s">{match.competition}</td>
                  <td>
                    {match.opponent}
                    <span class="discret texte-s">{match.isHome ? t('competitions.homeShort') : t('competitions.awayShort')}</span>
                    {#if match.derby}<span class="tampon pastille-derby">Derby</span>{/if}
                  </td>
                  <td class="num">{match.score ?? (match.current ? t('competitions.thisWeek') : '')}</td>
                  <td>{#if match.result}<FormBadge result={match.result} />{/if}</td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  </div>

  <Card title={t('competitions.cup')}>
    {#snippet actions()}
      {#if cup.winner}<span class="tampon">{t('competitions.winner', { club: cup.winner })}</span>{/if}
    {/snippet}
    {#if cup.rounds.length === 0}
      <p class="vide">{t('competitions.noDraw')}</p>
    {:else}
      <div class="tours" role="group" aria-label={t('competitions.rounds')}>
        {#each cup.rounds as round (round.round)}
          <button class="onglet tampon" aria-pressed={round.round === shownRound?.round} onclick={() => (chosenRound = round.round)}>
            {round.name}
          </button>
        {/each}
      </div>
      {#if shownRound}
        {#if shownRound.round === 1 && cup.byes > 0}
          <p class="texte-s discret">
            {t('competitions.byes', { count: cup.byes })}{cup.humanBye ? t('competitions.byesYours') : ''}.
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
  .rappel {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1);
  }
  .pastille-mercato {
    padding: 0 var(--space-1);
    background: var(--scotch);
    color: var(--encre-fixe);
    border: var(--trait-fin) solid var(--encre-fixe);
  }
  .pastille-derby {
    padding: 0 var(--space-1);
    background: var(--carton);
    color: var(--craie-fixe);
    border: var(--trait-fin) solid var(--encre-fixe);
  }
  .tableau tbody tr.mercato {
    background: repeating-linear-gradient(45deg, var(--scotch) 0 10px, color-mix(in srgb, var(--scotch) 80%, var(--craie)) 10px 20px);
    color: var(--encre-fixe);
    font-weight: 700;
  }
  .tableau tbody tr.mercato.ouvert {
    outline: var(--trait-epais) solid var(--fumigene);
    outline-offset: -3px;
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
