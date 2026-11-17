<script lang="ts">
  import './parts/screens.css';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import LineupBoard from './parts/LineupBoard.svelte';
  import PlayerSheet from './parts/PlayerSheet.svelte';
  import type { CardPlayer } from './parts/PlayerCard.svelte';
  import { store } from '../store.svelte';
  import { getAbility } from '../../domain/abilities/catalog';
  import { divisionOf, humanClub, humanLineupErrors, humanSquad } from '../../domain/game';
  import { countRarities, RARITY_QUOTA_LABEL, rarityLimits, type RarityLimits } from '../../domain/club/rarityQuota';
  import { EMPTY_SLOT, MAX_BENCH_SIZE, STARTERS_COUNT } from '../../domain/league/lineup';
  import { FORMATIONS, isAvailable, overall, ratingAtPosition } from '../../domain/player/rating';
  import type { Formation, Instructions, Mentality } from '../../domain/types';
  import { availabilityLabel, fullName, MENTALITY_LABEL, POSITION_ORDER } from './describe';
  import { emptyLineup, movePlayer, type LineupDrop } from './lineupEdit';

  /** Formation, onze, banc et consignes (EFF-03, MATCH-05). */
  const DEFAULT_FORMATION: Formation = '4-4-2';
  const MENTALITIES = Object.keys(MENTALITY_LABEL) as Mentality[];
  const UNKNOWN_ABILITY = '???';

  const view = $derived(
    store.select((game) => {
      const lineup = humanClub(game).lineup;
      const squad = humanSquad(game)
        .map((player): CardPlayer => {
          const ability = getAbility(player.ability.abilityId);
          return {
            id: player.id,
            name: fullName(player),
            lastName: player.lastName,
            position: player.position,
            overall: overall(player),
            available: isAvailable(player),
            availability: availabilityLabel(player),
            fatigue: player.fatigue,
            avatar: { id: player.id, age: player.age, clubId: player.clubId, position: player.position },
            abilityName: player.ability.revealed ? ability.name : UNKNOWN_ABILITY,
            rarity: player.ability.revealed ? ability.rarity : null,
            ratingAt: {
              GK: Math.round(ratingAtPosition(player, 'GK')),
              DEF: Math.round(ratingAtPosition(player, 'DEF')),
              MID: Math.round(ratingAtPosition(player, 'MID')),
              ATT: Math.round(ratingAtPosition(player, 'ATT')),
            },
          };
        })
        .sort((a, b) => POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || b.overall - a.overall);
      return {
        lineup: lineup ? { ...lineup, starters: [...lineup.starters], bench: [...lineup.bench] } : null,
        squad,
        errors: humanLineupErrors(game).map((error) => error.message),
        // Quotas de rareté de la feuille de match (CAP-24), selon la division.
        quotas: (() => {
          const limits = rarityLimits(divisionOf(game, game.humanClubId).tier);
          const listed = lineup ? [...lineup.starters, ...lineup.bench].map((id) => game.players[id]).filter((player) => player !== undefined) : [];
          const counts = countRarities(listed, (id) => getAbility(id).rarity);
          return (Object.keys(limits) as (keyof RarityLimits)[]).map((rarity) => ({ label: RARITY_QUOTA_LABEL[rarity], used: counts[rarity], max: limits[rarity] }));
        })(),
      };
    }),
  );

  const formation = $derived(view.lineup?.formation ?? DEFAULT_FORMATION);
  const starters = $derived(view.lineup?.starters ?? []);
  const bench = $derived(view.lineup?.bench ?? []);
  const benchFull = $derived(bench.length >= MAX_BENCH_SIZE);

  function currentLineup() {
    return view.lineup ?? emptyLineup(formation);
  }

  function save(lineup: ReturnType<typeof currentLineup>): void {
    store.command('setLineup', lineup);
  }

  function move(playerId: string, drop: LineupDrop): void {
    const before = currentLineup();
    const after = movePlayer(before, playerId, drop);
    if (after !== before) save(after);
    else if (drop.kind === 'bench' && benchFull) store.notify('Banc plein : lâche la carte sur un remplaçant pour échanger.');
  }

  function changeFormation(option: Formation): void {
    save({ ...currentLineup(), formation: option });
  }

  function updateInstructions(change: Partial<Instructions>): void {
    const lineup = view.lineup;
    if (lineup) store.command('setInstructions', { ...lineup.instructions, ...change });
  }

  function assistantPick(): void {
    const errors = store.command('autoPickLineup');
    store.notify(errors.length === 0 ? 'L’adjoint a fait la compo. Il a même pensé au gardien.' : errors[0]!.message);
  }

  let openPlayerId = $state<string | null>(null);

  const placed = $derived(starters.filter((id) => id !== EMPTY_SLOT).length);
</script>

<div class="ecran">
  <LineupBoard {formation} {starters} {bench} squad={view.squad} onmove={move} oninfo={(playerId) => (openPlayerId = playerId)}>
    {#snippet aside()}
      <Card title="Le onze">
        {#snippet actions()}
          <Button size="s" onclick={assistantPick}>Compo de l'adjoint</Button>
        {/snippet}
        <div class="pile-serree">
          <div class="formations" role="group" aria-label="Formation">
            {#each FORMATIONS as option (option)}
              <button type="button" class="interrupteur tampon" aria-pressed={formation === option} onclick={() => changeFormation(option)}>{option}</button>
            {/each}
          </div>
          <div aria-live="polite">
            {#if view.errors.length > 0}
              <ul class="erreurs texte-s">
                {#each view.errors as error, index (index)}<li>{error}</li>{/each}
              </ul>
            {:else}
              <p class="texte-s texte-fort">Compo valide : {placed} / {STARTERS_COUNT} titulaires et {bench.length} remplaçants.</p>
            {/if}
          </div>
          <p class="texte-s">
            <span class="tampon">Raretés sur la feuille</span>
            {#each view.quotas as quota, index (quota.label)}{index > 0 ? ' · ' : ' '}<span class="mono" class:depasse={quota.used > quota.max}>{quota.label} {quota.used}/{quota.max}</span>{/each}
          </p>
          <p class="texte-s discret">Glisse les cartes. Le « i » ouvre la fiche du joueur. Titulaires et remplaçants comptent dans les quotas de ta division.</p>
        </div>
      </Card>

      <Card title="Consignes">
        {#if view.lineup}
          {@const instructions = view.lineup.instructions}
          <fieldset class="champ">
            <legend class="tampon">Mentalité</legend>
            <div class="ligne-actions">
              {#each MENTALITIES as mentality (mentality)}
                <label class="choix">
                  <input
                    type="radio"
                    name="mentalite"
                    value={mentality}
                    checked={instructions.mentality === mentality}
                    onchange={() => updateInstructions({ mentality })}
                  />
                  {MENTALITY_LABEL[mentality]}
                </label>
              {/each}
            </div>
          </fieldset>
          <div class="ligne-actions consignes">
            <label class="choix">
              <input type="checkbox" checked={instructions.highPress} onchange={(event) => updateInstructions({ highPress: event.currentTarget.checked })} />
              Pressing haut
            </label>
            <label class="choix">
              <input type="checkbox" checked={instructions.longBall} onchange={(event) => updateInstructions({ longBall: event.currentTarget.checked })} />
              Jeu long
            </label>
          </div>
          <p class="texte-s discret">Les consignes comptent pour le prochain match et se changent aussi à la pause.</p>
        {:else}
          <p class="vide">Fais d'abord une compo : les consignes s'accrochent au onze.</p>
        {/if}
      </Card>
    {/snippet}
  </LineupBoard>
</div>

{#if openPlayerId}
  <PlayerSheet playerId={openPlayerId} onclose={() => (openPlayerId = null)} />
{/if}

<style>
  .pile-serree {
    display: grid;
    gap: var(--space-2);
  }
  .formations {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .erreurs {
    margin: 0;
    padding-left: var(--space-4);
    color: var(--carton);
    font-weight: 700;
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
    padding: 0;
    margin: 0 0 var(--space-4);
  }
  .choix {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    cursor: pointer;
  }
  .choix input {
    accent-color: var(--encre);
  }
  .consignes {
    margin-bottom: var(--space-4);
  }
  p {
    margin: 0;
  }
  .depasse {
    color: var(--carton);
    font-weight: 700;
  }
</style>
