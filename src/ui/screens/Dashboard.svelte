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
  import { acceptJob, autoPickLineup, canAdvanceWeek, clubPlayers, currentWeek, divisionOf, humanDivision, humanFixture, humanLineupErrors, isDerby, outcomeFor } from '../../domain/game';
  import { overall } from '../../domain/player/rating';
  import { recentForm, weekLabel, type FormLetter } from './views';

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
          opponent: game.clubs[opponentId]?.name ?? 'Adversaire inconnu',
          isHome,
          competition:
            fixture.competition === 'league'
              ? `Championnat · ${humanDivision(game).name}`
              : fixture.competition === 'playoff'
                ? fixture.awayId === game.humanClubId
                  ? 'Barrage d’accession'
                  : 'Barrage de maintien'
                : 'Coupe',
          score: fixture.result ? `${fixture.result.homeGoals}-${fixture.result.awayGoals}` : null,
          outcome: outcome ? (FORM_LETTER[outcome] as FormLetter) : null,
          ownForm: recentForm(allFixtures, game.humanClubId),
          opponentForm: recentForm(allFixtures, opponentId),
          derby: isDerby(game, fixture),
        };
      }
      return {
        fired: game.status === 'fired',
        season: game.season,
        week: game.week,
        weekLabel: weekLabel(currentWeek(game), game.cup),
        match,
        lineupErrors: humanLineupErrors(game).map((error) => error.message),
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

  const matchToPlay = $derived(desk.match !== null && desk.match.score === null);

  /** Le dialogue s'ouvre de lui-même ; refermé, il attend qu'on le rouvre (clé = saison, semaine, dialogue). */
  let closedDialogueKey = $state<string | null>(null);
  let dialogueOutcome = $state<{ speaker: string; text: string } | null>(null);
  const showDialogue = $derived(desk.dialogueKey !== null && desk.dialogueKey !== closedDialogueKey && !dialogueOutcome);

  function assistantPick(): void {
    const errors = store.run(autoPickLineup);
    store.notify(errors.length === 0 ? 'L’adjoint a fait la compo.' : errors[0]!.message);
  }

  function signFor(clubId: string, name: string): void {
    if (store.run((game) => acceptJob(game, clubId))) store.notify(`Bienvenue à ${name}, coach.`);
  }

  function kickOff(): void {
    try {
      store.kickOff();
    } catch (error) {
      store.notify(error instanceof Error ? error.message : 'Le match ne peut pas commencer.');
    }
  }
</script>

{#if desk.fired}
  <div class="ecran">
    <Card>
      <div class="licencie">
        <h2 class="banderole-xl">Licencié</h2>
        <p class="texte-fort">Saison {desk.season}, semaine {desk.week}. Le président a appelé. Il n'a rien dit. Puis il a raccroché.</p>
        {#if desk.history.length > 0}
          <ul class="liste-nue texte-s">
            {#each desk.history as record (record.season)}
              <li>
                <span class="mono">Saison {record.season}</span> · {record.divisionName}, <span class="mono">{record.position}e</span>
              </li>
            {/each}
          </ul>
        {/if}
        {#if desk.jobOffers.length > 0}
          <h3 class="banderole-m">Le téléphone sonne encore</h3>
          <p class="texte-s">Trois clubs te veulent. Tu reprends leur effectif, leur budget et leur place au classement.</p>
          <ul class="liste-nue offres-emploi">
            {#each desk.jobOffers as offer (offer.clubId)}
              <li>
                <p class="texte-fort">{offer.name}</p>
                <p class="texte-s discret">{offer.division} · niveau <span class="mono">{offer.level}</span> · budget <span class="mono">{formatEuros(offer.budget)}</span></p>
                <Button variant="primary" onclick={() => signFor(offer.clubId, offer.name)}>Signer</Button>
              </li>
            {/each}
          </ul>
        {/if}
        <div>
          <Button variant={desk.jobOffers.length > 0 ? 'ghost' : 'primary'} onclick={() => store.quitToTitle()}>Retour au titre</Button>
        </div>
      </div>
    </Card>
  </div>
{:else}
  <div class="ecran">
    <div class="colonnes large-gauche">
      <Card title={`Semaine ${desk.week}`} scotch>
        {#snippet actions()}
          <span class="tampon">{desk.weekLabel}</span>
        {/snippet}
        <div class="semaine">
          {#if desk.match}
            <div class="affiche">
              <p class="tampon discret">{desk.match.competition} · {desk.match.isHome ? 'à domicile' : 'à l’extérieur'}</p>
              {#if desk.match.derby}<Sticker tilted>Derby ! Ça compte double</Sticker>{/if}
              <p class="banderole-m">
                {desk.match.isHome ? 'Contre' : 'Chez'} {desk.match.opponent}
              </p>
              {#if desk.match.score}
                <p class="resultat">
                  <span class="tampon">Score</span>
                  <span class="mono texte-fort">{desk.match.score}</span>
                  {#if desk.match.outcome}<FormBadge result={desk.match.outcome} />{/if}
                </p>
              {/if}
              <dl class="formes">
                <div>
                  <dt class="tampon">Ta forme</dt>
                  <dd>
                    {#each desk.match.ownForm as result, index (index)}<FormBadge {result} />{:else}<span class="texte-s discret">Aucun match</span>{/each}
                  </dd>
                </div>
                <div>
                  <dt class="tampon">Leur forme</dt>
                  <dd>
                    {#each desk.match.opponentForm as result, index (index)}<FormBadge {result} />{:else}<span class="texte-s discret">Aucun match</span>{/each}
                  </dd>
                </div>
              </dl>
            </div>
          {:else}
            <p class="texte-s">Pas de match pour toi cette semaine. Profites-en pour régler le vestiaire.</p>
          {/if}

          {#if matchToPlay}
            {#if desk.lineupErrors.length > 0}
              <div class="bloque" role="alert">
                <p class="tampon">Compo à revoir avant le coup d'envoi</p>
                <ul class="texte-s">
                  {#each desk.lineupErrors as error, index (index)}<li>{error}</li>{/each}
                </ul>
              </div>
            {/if}
            <div class="ligne-actions">
              <Button variant="primary" disabled={desk.lineupErrors.length > 0} onclick={kickOff}>Lancer le match</Button>
              <Button onclick={assistantPick}>Compo de l'adjoint</Button>
              <Button variant="ghost" onclick={() => store.go('tactics')}>Tactique</Button>
            </div>
          {:else}
            <div class="ligne-actions">
              <Button variant="primary" disabled={!desk.advance.ok} onclick={() => store.nextWeek()}>Semaine suivante</Button>
              {#if !desk.advance.ok}<span class="texte-s malus">{desk.advance.reason}</span>{/if}
            </div>
          {/if}

          {#if desk.dialogueKey && !showDialogue && !dialogueOutcome}
            <div class="ligne-actions">
              <Button size="s" onclick={() => (closedDialogueKey = null)}>Répondre à {desk.dialogueSpeaker ?? 'ton visiteur'}</Button>
            </div>
          {/if}
        </div>
      </Card>

      <Card title="Le président">
        <PresidentPanel />
      </Card>
    </div>

    <div class="colonnes">
      <Card title="Fil de la semaine">
        {#if desk.news.length === 0}
          <p class="vide">Rien de neuf cette semaine.</p>
        {:else}
          <ul class="liste-nue fil texte-s">
            {#each desk.news as line, index (index)}<li>{line}</li>{/each}
          </ul>
        {/if}
      </Card>

      <div class="pile">
        <Card title="Offres reçues">
          <OffersList />
        </Card>

        <Card title="Bilan de la semaine">
          {#if desk.finance.length === 0}
            <p class="vide">Pas encore de bilan : il tombe à la fin de la semaine.</p>
          {:else}
            <table class="tableau">
              <caption class="sr-only">Recettes et dépenses de la semaine passée</caption>
              <thead>
                <tr><th scope="col">Poste</th><th scope="col" class="num">Montant</th></tr>
              </thead>
              <tbody>
                {#each desk.finance as line (line.label)}
                  <tr>
                    <td>{line.label}</td>
                    <td class="num" class:bonus={line.amount > 0} class:malus={line.amount < 0}>
                      {line.amount > 0 ? '+' : '−'}{formatEuros(Math.abs(line.amount))}
                    </td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
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
    <Modal title={dialogueOutcome.speaker} kicker="Dialogue de la semaine · la suite" onclose={() => (dialogueOutcome = null)}>
      <p class="texte-fort">{dialogueOutcome.text}</p>
      {#snippet actions()}
        <Button onclick={() => (dialogueOutcome = null)}>Retour au bureau</Button>
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
