<script lang="ts">
  import './parts/screens.css';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import FormBadge from '../kit/FormBadge.svelte';
  import Modal from './parts/Modal.svelte';
  import DialogueModal from './parts/DialogueModal.svelte';
  import OffersList from './parts/OffersList.svelte';
  import PresidentPanel from './parts/PresidentPanel.svelte';
  import { store } from '../store.svelte';
  import { formatEuros } from '../format';
  import { balanceTotal } from '../../domain/club/finance';
  import { DIALOGUES } from '../../domain/club/dialogues';
  import Sticker from '../kit/Sticker.svelte';
  import { NATIONS } from '../../domain/world/nations';
  import { pendingFriendly, canAdvanceWeek, isHumanDuel, clubPlayers, currentWeek, divisionOf, humanDivision, humanFixture, humanLineupErrors, isDerby, outcomeFor } from '../../domain/game';
  import { overall } from '../../domain/player/rating';
  import { AI_STYLE_HINT, AI_STYLE_LABEL, aiStyleOf } from '../../domain/club/aiStyle';
  import { recentForm, weekLabel, type FormLetter } from './views';
  import { t, td } from '../../i18n/t';

  /** Bureau du coach : semaine, prochain match, actualité, dialogue, offres, finances et président. */
  const FORM_LETTER = { win: 'V', draw: 'N', loss: 'D' } as const;

  const desk = $derived(
    store.select((game) => {
      const fixture = humanFixture(game);
      const allFixtures = [...game.fixtures, ...game.cup.fixtures];
      const pending = game.dialogue;
      let match = null;
      if (fixture) {
        const isHome = fixture.homeId === game.humanClubId;
        const opponentId = isHome ? fixture.awayId : fixture.homeId;
        const outcome = outcomeFor(fixture, game.humanClubId);
        match = {
          opponent: game.clubs[opponentId]?.name ?? null,
          isHome,
          competition:
            fixture.competition === 'league'
              ? { kind: 'league' as const, division: humanDivision(game).name }
              : fixture.competition === 'playoff'
                ? { kind: fixture.awayId === game.humanClubId ? ('promotionPlayoff' as const) : ('relegationPlayoff' as const), division: '' }
                : { kind: 'cup' as const, division: '' },
          score: fixture.result ? `${fixture.result.homeGoals}-${fixture.result.awayGoals}` : null,
          outcome: outcome ? (FORM_LETTER[outcome] as FormLetter) : null,
          ownForm: recentForm(allFixtures, game.humanClubId),
          opponentForm: recentForm(allFixtures, opponentId),
          // Style du coach IA d'en face (C6) : connu de tous, il se voit à la télé locale.
          style: game.clubs[opponentId]?.isHuman ? null : { label: AI_STYLE_LABEL[aiStyleOf(opponentId)], hint: AI_STYLE_HINT[aiStyleOf(opponentId)] },
          derby: isDerby(game, fixture),
          // Contre un autre coach de la ligue (MULTI-06).
          duel: isHumanDuel(game, fixture),
        };
      }
      return {
        fired: game.status === 'fired',
        season: game.season,
        week: game.week,
        weekLabel: weekLabel(currentWeek(game), game.cup),
        match,
        lineupErrors: humanLineupErrors(game).map((error) => error.message),
        friendly: (() => {
          const friendly = pendingFriendly(game);
          if (!friendly) return null;
          const nation = NATIONS[friendly.nationId];
          return { club: nation.clubName, country: nation.country, motto: nation.motto };
        })(),
        advance: canAdvanceWeek(game),
        news: [...game.news],
        dialogueKey: pending ? `${game.season}-${game.week}-${pending.dialogueId}` : null,
        dialogueSpeaker: pending ? (DIALOGUES.find((dialogue) => dialogue.id === pending.dialogueId)?.speakerName ?? null) : null,
        finance: game.lastFinance.map((line) => ({ ...line })),
        financeTotal: balanceTotal(game.lastFinance),
        history: game.history.map((record) => ({ ...record })),
        jobOffers: game.jobOffers.map((clubId) => {
          const club = game.clubs[clubId]!;
          const best = clubPlayers(game, clubId).map(overall).sort((a, b) => b - a).slice(0, 11);
          return {
            clubId,
            name: club.name,
            division: divisionOf(game, clubId).name,
            budget: club.budget,
            level: best.length > 0 ? Math.round(best.reduce((sum, value) => sum + value, 0) / best.length) : 0,
          };
        }),
      };
    }),
  );

  const matchToPlay = $derived(desk.match !== null && desk.match.score === null && !desk.match.duel);
  const duelToPlay = $derived(desk.match !== null && desk.match.score === null && desk.match.duel);
  /** Ligue entre amis : prêt pour la semaine suivante, et combien le sont. */
  const multi = $derived(store.multi);
  const ready = $derived(multi?.me?.ready ?? false);
  /** Déjà entré dans le match en direct, en attente de l'adversaire. */
  const duelWaiting = $derived(!!multi?.duel && !multi.duel.started && multi.duel.present.includes(multi.duel.you));
  /** L'adversaire est déjà sur le terrain et attend ce coach. */
  const opponentWaiting = $derived(!!multi?.duel && !multi.duel.started && !duelWaiting && multi.duel.present.length > 0);
  const readyCount = $derived(multi ? multi.coaches.filter((coach) => coach.ready).length : 0);

  /** Le dialogue s'ouvre de lui-même ; refermé, il attend qu'on le rouvre (clé = saison, semaine, dialogue). */
  let closedDialogueKey = $state<string | null>(null);
  let dialogueOutcome = $state<{ speaker: string; text: string } | null>(null);
  const showDialogue = $derived(desk.dialogueKey !== null && desk.dialogueKey !== closedDialogueKey && !dialogueOutcome);

  function assistantPick(): void {
    const errors = store.command('autoPickLineup');
    store.notify(errors.length === 0 ? t('dashboard.assistantPicked') : errors[0]!.message);
  }

  function signFor(clubId: string, name: string): void {
    if (store.command('acceptJob', clubId)) store.notify(t('dashboard.welcomeJob', { club: name }));
  }

  function kickOff(): void {
    try {
      store.kickOff();
    } catch (error) {
      store.notify(error instanceof Error ? error.message : t('dashboard.cannotStart'));
    }
  }
</script>

{#if desk.fired}
  <div class="ecran">
    <Card>
      <div class="licencie">
        <h2 class="banderole-xl">{t('dashboard.fired.title')}</h2>
        <p class="texte-fort">{t('dashboard.fired.text', { season: desk.season, week: desk.week })}</p>
        {#if desk.history.length > 0}
          <ul class="liste-nue texte-s">
            {#each desk.history as record (record.season)}
              <li>
                <span class="mono">{t('common.season', { season: record.season })}</span> · {td(record.divisionName)}, <span class="mono">{t('common.rank', { position: record.position })}</span>
              </li>
            {/each}
          </ul>
        {/if}
        {#if desk.jobOffers.length > 0}
          <h3 class="banderole-m">{t('dashboard.fired.phone')}</h3>
          <p class="texte-s">{t('dashboard.fired.offers')}</p>
          <ul class="liste-nue offres-emploi">
            {#each desk.jobOffers as offer (offer.clubId)}
              <li>
                <p class="texte-fort">{offer.name}</p>
                <p class="texte-s discret">{td(offer.division)} · {t('dashboard.fired.level')} <span class="mono">{offer.level}</span> · {t('dashboard.fired.budget')} <span class="mono">{formatEuros(offer.budget)}</span></p>
                <Button variant="primary" onclick={() => signFor(offer.clubId, offer.name)}>{t('dashboard.fired.sign')}</Button>
              </li>
            {/each}
          </ul>
        {/if}
        <div>
          <Button variant={desk.jobOffers.length > 0 ? 'ghost' : 'primary'} onclick={() => store.quitToTitle()}>{t('dashboard.fired.backToTitle')}</Button>
        </div>
      </div>
    </Card>
  </div>
{:else}
  <div class="ecran">
    <div class="colonnes large-gauche">
      <Card title={t('dashboard.week', { week: desk.week })} scotch>
        {#snippet actions()}
          <span class="tampon">{td(desk.weekLabel)}</span>
        {/snippet}
        <div class="semaine">
          {#if desk.match}
            <div class="affiche">
              <p class="tampon discret">{t(`dashboard.competition.${desk.match.competition.kind}`, { division: td(desk.match.competition.division) })} · {desk.match.isHome ? t('dashboard.home') : t('dashboard.away')}</p>
              {#if desk.match.derby}<Sticker tilted>{t('dashboard.derby')}</Sticker>{/if}
              <p class="banderole-m">
                {desk.match.isHome ? t('dashboard.versus', { club: desk.match.opponent ?? t('dashboard.unknownOpponent') }) : t('dashboard.at', { club: desk.match.opponent ?? t('dashboard.unknownOpponent') })}
              </p>
              {#if desk.match.style}
                <p class="texte-s"><span class="tampon">{t('dashboard.theirCoach')}</span> <span class="texte-fort">{td(desk.match.style.label)}</span>{t('common.colon')}{td(desk.match.style.hint)}.</p>
              {/if}
              {#if desk.match.score}
                <p class="resultat">
                  <span class="tampon">{t('dashboard.score')}</span>
                  <span class="mono texte-fort">{desk.match.score}</span>
                  {#if desk.match.outcome}<FormBadge result={desk.match.outcome} />{/if}
                </p>
              {/if}
              <dl class="formes">
                <div>
                  <dt class="tampon">{t('dashboard.ownForm')}</dt>
                  <dd>
                    {#each desk.match.ownForm as result, index (index)}<FormBadge {result} />{:else}<span class="texte-s discret">{t('dashboard.noMatches')}</span>{/each}
                  </dd>
                </div>
                <div>
                  <dt class="tampon">{t('dashboard.theirForm')}</dt>
                  <dd>
                    {#each desk.match.opponentForm as result, index (index)}<FormBadge {result} />{:else}<span class="texte-s discret">{t('dashboard.noMatches')}</span>{/each}
                  </dd>
                </div>
              </dl>
            </div>
          {:else}
            <p class="texte-s">{t('dashboard.noMatchThisWeek')}</p>
          {/if}

          {#if desk.friendly && !matchToPlay}
            <div class="affiche amical">
              <p class="tampon discret">{t('dashboard.friendly.kicker')}</p>
              <p class="banderole-m">{t('dashboard.versus', { club: desk.friendly.club })}</p>
              <p class="texte-s"><span class="tampon">{td(desk.friendly.country)}</span> {td(desk.friendly.motto)}</p>
              <p class="texte-s">{t('dashboard.friendly.text')}</p>
              {#if desk.lineupErrors.length > 0}
                <ul class="texte-s malus">{#each desk.lineupErrors as error, index (index)}<li>{td(error)}</li>{/each}</ul>
              {/if}
              <div class="ligne-actions">
                <Button variant="primary" disabled={desk.lineupErrors.length > 0} onclick={() => store.kickOffFriendly()}>{t('dashboard.friendly.play')}</Button>
                <Button variant="ghost" onclick={() => { store.command('declineFriendly'); store.notify(t('dashboard.friendly.declined')); }}>{t('dashboard.friendly.decline')}</Button>
              </div>
            </div>
          {/if}

          {#if matchToPlay}
            {#if desk.lineupErrors.length > 0}
              <div class="bloque" role="alert">
                <p class="tampon">{t('dashboard.lineupToFix')}</p>
                <ul class="texte-s">
                  {#each desk.lineupErrors as error, index (index)}<li>{td(error)}</li>{/each}
                </ul>
              </div>
            {/if}
            <div class="ligne-actions">
              <Button variant="primary" disabled={desk.lineupErrors.length > 0} onclick={kickOff}>{t('dashboard.kickOff')}</Button>
              <Button onclick={assistantPick}>{t('dashboard.assistantLineup')}</Button>
              <Button variant="ghost" onclick={() => store.go('tactics')}>{t('shell.tabs.tactics')}</Button>
            </div>
          {:else}
            {#if duelToPlay}
              <div class="ligne-actions">
                {#if duelWaiting}
                  <span class="texte-s texte-fort">{t('dashboard.duel.waiting', { club: desk.match?.opponent ?? t('dashboard.duel.yourOpponent') })}</span>
                {:else}
                  <Button variant="primary" onclick={() => store.joinDuel()}>{t('dashboard.duel.play', { club: desk.match?.opponent ?? '' })}</Button>
                  {#if opponentWaiting}<span class="texte-s texte-fort">{t('dashboard.duel.opponentWaiting')}</span>{/if}
                {/if}
              </div>
              <p class="texte-s">{t('dashboard.duel.rules')}</p>
            {/if}
            <div class="ligne-actions">
              {#if multi}
                <Button variant={ready ? 'ghost' : 'primary'} disabled={!desk.advance.ok && !ready} onclick={() => store.nextWeek()}>
                  {ready ? t('dashboard.notReady') : t('dashboard.ready')}
                </Button>
                <span class="texte-s">{t('dashboard.readyCount', { ready: readyCount, total: multi.coaches.length })}</span>
              {:else}
                <Button variant="primary" disabled={!desk.advance.ok} onclick={() => store.nextWeek()}>{t('dashboard.nextWeek')}</Button>
              {/if}
              {#if !desk.advance.ok}<span class="texte-s malus">{td(desk.advance.reason)}</span>{/if}
            </div>
          {/if}

          {#if desk.dialogueKey && !showDialogue && !dialogueOutcome}
            <div class="ligne-actions">
              <Button size="s" onclick={() => (closedDialogueKey = null)}>{t('dashboard.answer', { speaker: desk.dialogueSpeaker ? td(desk.dialogueSpeaker) : t('dashboard.yourVisitor') })}</Button>
            </div>
          {/if}
        </div>
      </Card>

      <Card title={t('dashboard.president')}>
        <PresidentPanel />
      </Card>
    </div>

    <div class="colonnes">
      <Card title={t('dashboard.news')}>
        {#if desk.news.length === 0}
          <p class="vide">{t('dashboard.noNews')}</p>
        {:else}
          <ul class="liste-nue fil texte-s">
            {#each desk.news as line, index (index)}<li>{td(line)}</li>{/each}
          </ul>
        {/if}
      </Card>

      <div class="pile">
        <Card title={t('dashboard.offers')}>
          <OffersList />
        </Card>

        <Card title={t('dashboard.balance.title')}>
          {#if desk.finance.length === 0}
            <p class="vide">{t('dashboard.balance.empty')}</p>
          {:else}
            <table class="tableau">
              <caption class="sr-only">{t('dashboard.balance.caption')}</caption>
              <thead>
                <tr><th scope="col">{t('dashboard.balance.item')}</th><th scope="col" class="num">{t('dashboard.balance.amount')}</th></tr>
              </thead>
              <tbody>
                {#each desk.finance as line (line.label)}
                  <tr>
                    <td>{td(line.label)}</td>
                    <td class="num" class:bonus={line.amount > 0} class:malus={line.amount < 0}>
                      {line.amount > 0 ? '+' : '−'}{formatEuros(Math.abs(line.amount))}
                    </td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{t('dashboard.balance.total')}</th>
                  <td class="num texte-fort" class:bonus={desk.financeTotal > 0} class:malus={desk.financeTotal < 0}>
                    {desk.financeTotal < 0 ? '−' : '+'}{formatEuros(Math.abs(desk.financeTotal))}
                  </td>
                </tr>
              </tfoot>
            </table>
          {/if}
        </Card>
      </div>
    </div>
  </div>

  {#if showDialogue}
    <DialogueModal onclose={() => (closedDialogueKey = desk.dialogueKey)} onanswered={(outcome) => (dialogueOutcome = outcome)} />
  {/if}
  {#if dialogueOutcome}
    <Modal title={td(dialogueOutcome.speaker)} kicker={t('dashboard.dialogueFollowUp')} onclose={() => (dialogueOutcome = null)}>
      <p class="texte-fort">{td(dialogueOutcome.text)}</p>
      {#snippet actions()}
        <Button onclick={() => (dialogueOutcome = null)}>{t('dashboard.backToOffice')}</Button>
      {/snippet}
    </Modal>
  {/if}
{/if}

<style>
  p {
    margin: 0;
  }
  .semaine,
  .affiche,
  .licencie {
    display: grid;
    gap: var(--space-4);
    justify-items: start;
  }
  .affiche {
    gap: var(--space-2);
  }
  .resultat {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .formes {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-6);
    margin: 0;
  }
  .formes div {
    display: grid;
    gap: var(--space-1);
  }
  .formes dd {
    display: flex;
    gap: var(--space-1);
    margin: 0;
  }
  .bloque {
    border: var(--trait-fin) solid var(--carton);
    padding: var(--space-2) var(--space-4);
    color: var(--carton);
  }
  .bloque ul {
    margin: var(--space-1) 0 0;
    padding-left: var(--space-4);
    font-weight: 700;
  }
  .fil li {
    padding-bottom: var(--space-2);
    border-bottom: var(--trait-fin) solid var(--craie-2);
  }
  tfoot th,
  tfoot td {
    border-top: var(--trait-epais) solid var(--encre);
  }
  .offres-emploi {
    grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    gap: var(--space-4);
  }
  .offres-emploi li {
    display: grid;
    gap: var(--space-2);
    align-content: start;
    padding: var(--space-4);
    border: var(--trait-fin) solid var(--encre);
    background: var(--craie);
  }
  .offres-emploi p {
    margin: 0;
  }
</style>
