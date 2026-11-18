<script lang="ts">
  import { t, td } from '../../../i18n/t';
  import Button from '../../kit/Button.svelte';
  import Gauge from '../../kit/Gauge.svelte';
  import DeltaBadge from '../../kit/DeltaBadge.svelte';
  import PlayerAvatar from '../../kit/PlayerAvatar.svelte';
  import RatingBadge from '../../kit/RatingBadge.svelte';
  import Modal from './Modal.svelte';
  import AbilityPanel from './AbilityPanel.svelte';
  import AbilityReroll from './AbilityReroll.svelte';
  import { store } from '../../store.svelte';
  import { formatEuros } from '../../format';
  import { getAbility } from '../../../domain/abilities/catalog';
  import { RARITY_LABEL } from '../../../domain/abilities/progression';
  import { playerValue } from '../../../domain/club/valuation';
  import { abilityKnown, isScouted, potentialView, scoutingOf, seenByCoach, transferWindowOpen } from '../../../domain/game';
  import { potentialLabel } from '../views';
  import { overall } from '../../../domain/player/rating';
  import type { AttributeName } from '../../../domain/types';
  import { ATTRIBUTE_LABEL, availabilityLabel, fullName, POSITION_LABEL } from '../describe';

  /** Fiche joueur (CAP-08, CLUB-08) : attributs, capacité, valeur, et vente express pour les joueurs du coach. */
  interface Props {
    playerId: string;
    onclose: () => void;
  }

  let { playerId, onclose }: Props = $props();

  const ATTRIBUTES = Object.keys(ATTRIBUTE_LABEL) as AttributeName[];
  const ATTRIBUTE_MAX = 99;

  const view = $derived(
    store.select((game) => {
      const player = game.players[playerId];
      if (!player) return null;
      const ability = getAbility(player.ability.abilityId);
      const own = player.clubId === game.humanClubId;
      return {
        own,
        standIn: own && player.standIn === true,
        club: own ? null : player.clubId ? (game.clubs[player.clubId]?.name ?? t('sheet.unknownClub')) : t('sheet.noClub'),
        name: fullName(player),
        avatar: { id: player.id, age: player.age, clubId: player.clubId, position: player.position, nationality: player.nationality },
        position: POSITION_LABEL[player.position],
        age: player.age,
        overall: overall(player),
        evolution: overall(player) - player.overallAtSeasonStart,
        potential: potentialLabel(potentialView(game, player)),
        /** Cellule de scouts (CLUB-10) : capacité connue, et ce qu'un rapport peut encore apprendre. */
        abilityKnown: abilityKnown(game, player),
        scoutable: !own && !isScouted(game, player),
        reports: scoutingOf(game).reports,
        fatigue: player.fatigue,
        salary: player.salary,
        availability: availabilityLabel(player),
        stats: { ...player.seasonStats },
        attributes: ATTRIBUTES.map((name) => ({ name, value: player.attributes[name] })),
        ability,
        progress: { ...player.ability },
        // Valeur telle que le coach la connaît : sans le potentiel d'un joueur qu'il n'a pas scouté.
        value: playerValue(seenByCoach(game, player), ability.rarity),
        windowOpen: transferWindowOpen(game),
      };
    }),
  );

  let confirmSale = $state(false);
  /** Le toast passe sous la modale (couche supérieure du navigateur) : on répète le message ici. */
  let feedback = $state<string | null>(null);

  function sell(): void {
    const result = store.command('sellNow', playerId);
    store.notify(result.message);
    confirmSale = false;
    feedback = result.message;
    if (result.ok) onclose();
  }
</script>

{#if view}
  <Modal title={view.name} kicker={t('sheet.kicker', { position: view.position, age: view.age }) + (view.club ? ` · ${view.club}` : '')} {onclose}>
    <div class="haut">
      <PlayerAvatar player={view.avatar} size={88} />
      <dl class="chiffres">
        <div><dt class="tampon">{t('sheet.overall')}</dt><dd class="stat"><RatingBadge value={view.overall} size="l" /> <DeltaBadge value={view.evolution} /></dd></div>
        <div><dt class="tampon">{t('sheet.potential')}</dt><dd class="stat">{view.potential}</dd></div>
        <div><dt class="tampon">{t('sheet.value')}</dt><dd class="valeur mono">{formatEuros(view.value)}</dd></div>
      </dl>
      <dl class="paire texte-s">
        <dt>{t('sheet.rarity')}</dt>
        <dd>
          {#if view.own && !view.progress.revealed}???{:else}{td(RARITY_LABEL[view.ability.rarity])}{/if}
        </dd>
        <dt>{t('sheet.salary')}</dt>
        <dd class="mono">{t('sheet.perWeek', { amount: formatEuros(view.salary) })}</dd>
        <dt>{t('sheet.availability')}</dt>
        <dd>
          {#if view.availability}<span class="malus">{view.availability}</span>{:else}{t('squad.fit')}{/if}
        </dd>
        <dt>{t('sheet.season')}</dt>
        <dd class="mono">{t('sheet.seasonStats', { matches: view.stats.matches, goals: view.stats.goals, yellow: view.stats.yellowCards, red: view.stats.redCards })}</dd>
      </dl>
    </div>

    <div class="colonnes-fiche">
      <table class="tableau">
        <caption class="tampon">{t('sheet.attributes')}</caption>
        <tbody>
          {#each view.attributes as attribute (attribute.name)}
            <tr>
              <th scope="row">{ATTRIBUTE_LABEL[attribute.name]}</th>
              <td class="jauge"><Gauge value={attribute.value} max={ATTRIBUTE_MAX} label={ATTRIBUTE_LABEL[attribute.name]} tone="scotch" /></td>
              <td class="num">{attribute.value}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <table class="tableau">
        <caption class="tampon">{t('sheet.form')}</caption>
        <tbody>
          <tr>
            <th scope="row">{t('sheet.fatigue')}</th>
            <td class="jauge"><Gauge value={view.fatigue} max={100} label={t('sheet.fatigue')} tone="carton" /></td>
            <td class="num">{view.fatigue}</td>
          </tr>
        </tbody>
      </table>
    </div>

    {#if view.abilityKnown}
      <AbilityPanel ability={view.ability} progress={view.progress} />
    {:else}
      <p class="texte-s">
        <span class="tampon">{t('sheet.ability')}</span> ???
        {view.own ? t('sheet.abilityHiddenOwn') : t('sheet.abilityHiddenScout', { rarity: td(RARITY_LABEL[view.ability.rarity]).toLowerCase() })}
      </p>
    {/if}
    {#if view.scoutable}
      <div class="ligne-actions">
        <Button size="s" variant="ghost" disabled={view.reports === 0} onclick={() => (feedback = store.command('scoutPlayer', playerId).message)}>
          {t('sheet.sendScout', { reports: view.reports })}
        </Button>
      </div>
      {#if !view.own}<p class="texte-s texte-fort" role="status">{feedback ? td(feedback) : ''}</p>{/if}
    {/if}

    {#if view.own}
    {#if view.standIn}
      <section class="actions" aria-label={t('sheet.standInContract')}>
        <h3 class="tampon">{t('sheet.standIn')}</h3>
        <p class="texte-s">{t('sheet.standInText')}</p>
        <Button size="s" variant="ghost" onclick={() => store.notify(store.command('keepStandIn', playerId).message)}>{t('sheet.keepStandIn')}</Button>
      </section>
    {/if}
    <AbilityReroll {playerId} />
    <section class="actions" aria-label={t('sheet.transfer')}>
      <h3 class="tampon">{t('sheet.quickSale')}</h3>
      {#if !view.windowOpen}
        <p class="texte-s discret">{t('sheet.windowClosed')}</p>
      {:else if confirmSale}
        <div class="ligne-actions">
          <Button size="s" onclick={sell}>{t('sheet.confirmSale')}</Button>
          <Button size="s" variant="ghost" onclick={() => (confirmSale = false)}>{t('common.cancel')}</Button>
        </div>
      {:else}
        <Button size="s" variant="ghost" onclick={() => (confirmSale = true)}>{t('sheet.sellNow')}</Button>
      {/if}
      <p class="texte-s texte-fort" role="status">{feedback ? td(feedback) : ''}</p>
    </section>
    {/if}
  </Modal>
{/if}

<style>
  .haut {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4) var(--space-10);
    align-items: start;
  }
  .chiffres {
    display: flex;
    gap: var(--space-6);
    margin: 0;
  }
  .chiffres div {
    display: grid;
    gap: var(--space-1);
  }
  .chiffres dd {
    margin: 0;
  }
  .valeur {
    font-weight: 700;
    font-size: 20px;
    line-height: 32px;
  }
  .colonnes-fiche {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    align-items: start;
    gap: var(--space-4);
  }
  .jauge {
    width: 50%;
  }
  .actions {
    display: grid;
    justify-items: start;
    gap: var(--space-2);
  }
  h3.tampon {
    margin: var(--space-2) 0 0;
    font-family: var(--font-mono);
    font-size: 12px;
  }
  p {
    margin: 0;
  }
</style>
