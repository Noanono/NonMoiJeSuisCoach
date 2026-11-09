<script lang="ts">
  import Button from '../../kit/Button.svelte';
  import Gauge from '../../kit/Gauge.svelte';
  import DeltaBadge from '../../kit/DeltaBadge.svelte';
  import PlayerAvatar from '../../kit/PlayerAvatar.svelte';
  import RatingBadge from '../../kit/RatingBadge.svelte';
  import Modal from './Modal.svelte';
  import AbilityPanel from './AbilityPanel.svelte';
  import { store } from '../../store.svelte';
  import { formatEuros } from '../../format';
  import { getAbility } from '../../../domain/abilities/catalog';
  import { RARITY_LABEL } from '../../../domain/abilities/progression';
  import { playerValue } from '../../../domain/club/valuation';
  import { sellNow, transferWindowOpen } from '../../../domain/game';
  import { fatigueMalus, overall } from '../../../domain/player/rating';
  import type { AttributeName } from '../../../domain/types';
  import { ATTRIBUTE_LABEL, availabilityLabel, fullName, POSITION_LABEL } from '../describe';

  /** Fiche joueur (CAP-08, CLUB-08) : attributs, capacité complète, valeur et vente express. */
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
      if (!player || player.clubId !== game.humanClubId) return null;
      const ability = getAbility(player.ability.abilityId);
      return {
        name: fullName(player),
        avatar: { id: player.id, age: player.age, clubId: player.clubId, position: player.position },
        position: POSITION_LABEL[player.position],
        age: player.age,
        overall: overall(player),
        malus: fatigueMalus(player, player.position),
        evolution: overall(player) - player.overallAtSeasonStart,
        potential: player.potential,
        fatigue: player.fatigue,
        salary: player.salary,
        availability: availabilityLabel(player),
        stats: { ...player.seasonStats },
        attributes: ATTRIBUTES.map((name) => ({ name, value: player.attributes[name] })),
        ability,
        progress: { ...player.ability },
        value: playerValue(player, ability.rarity),
        windowOpen: transferWindowOpen(game),
      };
    }),
  );

  let confirmSale = $state(false);
  /** Le toast passe sous la modale (couche supérieure du navigateur) : on répète le message ici. */
  let feedback = $state<string | null>(null);

  function sell(): void {
    const result = store.run((game) => sellNow(game, playerId));
    store.notify(result.message);
    confirmSale = false;
    feedback = result.message;
    if (result.ok) onclose();
  }
</script>

{#if view}
  <Modal title={view.name} kicker="Fiche joueur · {view.position} · {view.age} ans" {onclose}>
    <div class="haut">
      <PlayerAvatar player={view.avatar} size={88} />
      <dl class="chiffres">
        <div><dt class="tampon">Note</dt><dd class="stat"><RatingBadge value={view.overall} malus={view.malus} size="l" /> <DeltaBadge value={view.evolution} /></dd></div>
        <div><dt class="tampon">Potentiel</dt><dd class="stat">{view.potential}</dd></div>
        <div><dt class="tampon">Valeur</dt><dd class="valeur mono">{formatEuros(view.value)}</dd></div>
      </dl>
      <dl class="paire texte-s">
        <dt>Rareté</dt>
        <dd>
          {#if view.progress.revealed}{RARITY_LABEL[view.ability.rarity]}{:else}???{/if}
        </dd>
        <dt>Salaire</dt>
        <dd class="mono">{formatEuros(view.salary)} / sem.</dd>
        <dt>Dispo</dt>
        <dd>
          {#if view.availability}<span class="malus">{view.availability}</span>{:else}Apte{/if}
        </dd>
        <dt>Saison</dt>
        <dd class="mono">{view.stats.matches} m. · {view.stats.goals} b. · {view.stats.yellowCards} J · {view.stats.redCards} R</dd>
      </dl>
    </div>

    <div class="colonnes-fiche">
      <table class="tableau">
        <caption class="tampon">Attributs</caption>
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
        <caption class="tampon">Forme</caption>
        <tbody>
          <tr>
            <th scope="row">Fatigue</th>
            <td class="jauge"><Gauge value={view.fatigue} max={100} label="Fatigue" tone="carton" /></td>
            <td class="num">{view.fatigue}</td>
          </tr>
        </tbody>
      </table>
    </div>

    {#if view.progress.revealed}
      <AbilityPanel ability={view.ability} progress={view.progress} />
    {:else}
      <p class="texte-s"><span class="tampon">Capacité</span> ??? Elle se dévoilera à sa première activation en match.</p>
    {/if}

    <section class="actions" aria-label="Transfert">
      <h3 class="tampon">Vente express</h3>
      {#if !view.windowOpen}
        <p class="texte-s discret">Mercato fermé : la vente express attendra la prochaine fenêtre.</p>
      {:else if confirmSale}
        <div class="ligne-actions">
          <Button size="s" onclick={sell}>Confirmer la vente</Button>
          <Button size="s" variant="ghost" onclick={() => (confirmSale = false)}>Annuler</Button>
        </div>
      {:else}
        <Button size="s" variant="ghost" onclick={() => (confirmSale = true)}>Vendre tout de suite (sous sa valeur)</Button>
      {/if}
      <p class="texte-s texte-fort" role="status">{feedback ?? ''}</p>
    </section>
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
