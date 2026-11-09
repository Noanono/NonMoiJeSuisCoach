<script lang="ts">
  import './parts/screens.css';
  import Button from '../kit/Button.svelte';
  import Card from '../kit/Card.svelte';
  import Pitch, { type PitchSlot } from './parts/Pitch.svelte';
  import { store } from '../store.svelte';
  import { autoPickLineup, humanClub, humanLineupErrors, humanSquad, setInstructions, setLineup } from '../../domain/game';
  import { MAX_BENCH_SIZE, STARTERS_COUNT } from '../../domain/league/lineup';
  import { effectiveRating, FORMATION_SLOTS, FORMATIONS, isAvailable, overall } from '../../domain/player/rating';
  import type { Formation, Instructions, Lineup, Mentality, Position } from '../../domain/types';
  import { availabilityLabel, fullName, MENTALITY_LABEL, POSITION_ORDER, POSITION_SHORT } from './describe';
  import { assignStarter, emptyLineup, toggleBench } from './lineupEdit';

  /** Formation, onze, banc et consignes (EFF-03, MATCH-05). */
  const DEFAULT_FORMATION: Formation = '4-4-2';
  const MENTALITIES = Object.keys(MENTALITY_LABEL) as Mentality[];

  interface SquadMember {
    id: string;
    name: string;
    lastName: string;
    position: Position;
    overall: number;
    available: boolean;
    availability: string | null;
    fatigue: number;
    /** Note effective à chaque poste (poste, fatigue, moral : EFF-02, EFF-04, EFF-06). */
    ratingAt: Record<Position, number>;
  }

  const view = $derived(
    store.select((game) => {
      const lineup = humanClub(game).lineup;
      const squad = humanSquad(game)
        .map(
          (player): SquadMember => ({
            id: player.id,
            name: fullName(player),
            lastName: player.lastName,
            position: player.position,
            overall: overall(player),
            available: isAvailable(player),
            availability: availabilityLabel(player),
            fatigue: player.fatigue,
            ratingAt: {
              GK: Math.round(effectiveRating(player, 'GK')),
              DEF: Math.round(effectiveRating(player, 'DEF')),
              MID: Math.round(effectiveRating(player, 'MID')),
              ATT: Math.round(effectiveRating(player, 'ATT')),
            },
          }),
        )
        .sort((a, b) => POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || b.overall - a.overall);
      return {
        lineup: lineup ? { ...lineup, starters: [...lineup.starters], bench: [...lineup.bench] } : null,
        squad,
        errors: humanLineupErrors(game).map((error) => error.message),
      };
    }),
  );

  const formation = $derived(view.lineup?.formation ?? DEFAULT_FORMATION);
  const membersById = $derived(new Map(view.squad.map((member) => [member.id, member])));
  const starterIds = $derived(new Set(view.lineup?.starters ?? []));
  const benchIds = $derived(new Set(view.lineup?.bench ?? []));

  const slots = $derived(
    FORMATION_SLOTS[formation].map((position, index): PitchSlot & { playerId: string | null; editable: boolean } => {
      const playerId = view.lineup?.starters[index] ?? null;
      const member = playerId ? membersById.get(playerId) : undefined;
      return {
        index,
        position,
        playerId,
        playerName: member?.lastName ?? null,
        rating: member ? member.ratingAt[position] : null,
        outOfPosition: member !== undefined && member.position !== position,
        // La composition ne connaît pas les trous : on remplit les postes dans l'ordre.
        editable: index <= (view.lineup?.starters.length ?? 0),
      };
    }),
  );

  const reserves = $derived(view.squad.filter((member) => !starterIds.has(member.id)));
  const benchFull = $derived(benchIds.size >= MAX_BENCH_SIZE);

  function save(lineup: Lineup): void {
    store.run((game) => setLineup(game, lineup));
  }

  function currentLineup(): Lineup {
    return view.lineup ?? emptyLineup(formation);
  }

  function changeFormation(event: Event & { currentTarget: HTMLSelectElement }): void {
    save({ ...currentLineup(), formation: event.currentTarget.value as Formation });
  }

  function assign(index: number, event: Event & { currentTarget: HTMLSelectElement }): void {
    const playerId = event.currentTarget.value;
    if (playerId) save(assignStarter(currentLineup(), index, playerId));
  }

  function bench(playerId: string): void {
    save(toggleBench(currentLineup(), playerId));
  }

  function updateInstructions(change: Partial<Instructions>): void {
    const lineup = view.lineup;
    if (lineup) store.run((game) => setInstructions(game, { ...lineup.instructions, ...change }));
  }

  function assistantPick(): void {
    const errors = store.run(autoPickLineup);
    store.notify(errors.length === 0 ? 'L’adjoint a fait la compo. Il a même pensé au gardien.' : errors[0]!.message);
  }

  function focusSlot(index: number): void {
    document.getElementById(`poste-${index}`)?.focus();
  }

  function optionLabel(member: SquadMember, position: Position): string {
    const flags = [member.position !== position ? `hors poste (${POSITION_SHORT[member.position]})` : '', member.availability ?? '']
      .filter(Boolean)
      .join(', ');
    return `${member.name} · ${member.ratingAt[position]}${flags ? ` · ${flags}` : ''}`;
  }
</script>

<div class="ecran">
  <div class="colonnes">
    <Pitch {slots} onpick={focusSlot} />

    <Card title="Le onze">
      {#snippet actions()}
        <Button size="s" onclick={assistantPick}>Compo de l'adjoint</Button>
      {/snippet}
      <div class="pile-serree">
        <label class="champ">
          <span class="tampon">Formation</span>
          <select value={formation} onchange={changeFormation}>
            {#each FORMATIONS as option (option)}<option value={option}>{option}</option>{/each}
          </select>
        </label>

        <div aria-live="polite">
          {#if view.errors.length > 0}
            <ul class="erreurs texte-s">
              {#each view.errors as error, index (index)}<li>{error}</li>{/each}
            </ul>
          {:else}
            <p class="texte-s texte-fort">Compo valide : {STARTERS_COUNT} titulaires et {benchIds.size} remplaçants.</p>
          {/if}
        </div>

        <ol class="liste-nue postes">
          {#each slots as slot (slot.index)}
            <li class="poste">
              <label class="tampon" for="poste-{slot.index}">{POSITION_SHORT[slot.position]}</label>
              <select
                id="poste-{slot.index}"
                class="select"
                value={slot.playerId ?? ''}
                disabled={!slot.editable}
                onchange={(event) => assign(slot.index, event)}
              >
                {#if !slot.playerId}<option value="">{slot.editable ? 'Choisir un joueur' : 'Remplis d’abord le poste précédent'}</option>{/if}
                {#each view.squad as member (member.id)}
                  {#if slot.playerId || !starterIds.has(member.id)}
                    <option value={member.id}>{optionLabel(member, slot.position)}</option>
                  {/if}
                {/each}
              </select>
              {#if slot.outOfPosition}<span class="tampon alerte">Hors poste</span>{/if}
            </li>
          {/each}
        </ol>
      </div>
    </Card>
  </div>

  <div class="colonnes">
    <Card title="Le banc">
      {#snippet actions()}
        <span class="tampon">{benchIds.size} / {MAX_BENCH_SIZE}</span>
      {/snippet}
      {#if reserves.length === 0}
        <p class="vide">Tout le monde est titulaire. Même le kiné.</p>
      {:else}
        <ul class="liste-nue">
          {#each reserves as member (member.id)}
            {@const onBench = benchIds.has(member.id)}
            <li class="reserve">
              <button
                class="interrupteur tampon"
                aria-pressed={onBench}
                disabled={!onBench && benchFull}
                onclick={() => bench(member.id)}
              >
                {onBench ? 'Sur le banc' : 'Tribune'}
              </button>
              <span class="texte-s">
                <span class="texte-fort">{member.name}</span>
                <span class="discret">{POSITION_SHORT[member.position]}</span>
                <span class="mono">{member.overall}</span>
                {#if member.availability}<span class="malus">{member.availability}</span>{/if}
              </span>
            </li>
          {/each}
        </ul>
      {/if}
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
  </div>
</div>

<style>
  .pile-serree {
    display: grid;
    gap: var(--space-4);
  }
  .erreurs {
    margin: 0;
    padding-left: var(--space-4);
    color: var(--carton);
    font-weight: 700;
  }
  .poste {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-2);
  }
  .postes {
    gap: var(--space-1);
  }
  .alerte {
    background: var(--scotch);
    color: var(--encre-fixe);
    padding: 0 var(--space-1);
  }
  .reserve {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .reserve .texte-s {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .interrupteur {
    min-width: 112px;
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
  .interrupteur:disabled {
    cursor: not-allowed;
    opacity: 0.55;
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
</style>
