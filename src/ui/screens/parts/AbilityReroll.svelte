<script lang="ts">
  import Button from '../../kit/Button.svelte';
  import Sticker from '../../kit/Sticker.svelte';
  import { store } from '../../store.svelte';
  import { formatEuros } from '../../format';
  import { getAbility } from '../../../domain/abilities/catalog';
  import { RARITY_LABEL, statsAtLevel } from '../../../domain/abilities/progression';
  import { REROLL_UPGRADE_CHANCE } from '../../../domain/club/abilityReroll';
  import { abilityRerollPrice, chooseRerolledAbility, humanClub, pendingReroll, rerollAbility, type ActionResult, type GameState } from '../../../domain/game';
  import type { Rarity } from '../../../domain/types';
  import { ABILITY_POSITION_LABEL, describeEffect, describeTargeting, describeTrigger } from '../describe';

  /** Reroll de capacité (CAP-23) : on paie, puis on choisit parmi 3 capacités, ou on garde l'ancienne. */
  interface Props {
    playerId: string;
  }

  let { playerId }: Props = $props();

  const RARITY_TONE: Record<Rarity, 'craie' | 'scotch' | 'fumigene' | 'mythique'> = { common: 'craie', rare: 'scotch', legendary: 'fumigene', mythic: 'mythique' };

  const view = $derived(
    store.select((game) => {
      const offer = pendingReroll(game);
      return {
        price: abilityRerollPrice(game, playerId),
        budget: humanClub(game).budget,
        otherPending: offer && offer.playerId !== playerId ? (game.players[offer.playerId]?.lastName ?? null) : null,
        options:
          offer?.playerId === playerId
            ? offer.abilityIds.map((id) => {
                const ability = getAbility(id);
                const stats = statsAtLevel(ability, 1);
                return { ability, targeting: describeTargeting(stats.targeting), effects: stats.effects.map(describeEffect) };
              })
            : null,
      };
    }),
  );

  let confirming = $state(false);
  let feedback = $state<string | null>(null);

  function act(command: (game: GameState) => ActionResult): void {
    const result = store.run(command);
    store.notify(result.message);
    feedback = result.message;
    confirming = false;
  }
</script>

<section class="reroll" aria-label="Changer de capacité">
  <h3 class="tampon">Changer de capacité</h3>
  {#if view.options}
    <p class="texte-s">Payé. Choisis sa nouvelle capacité : elle repart au niveau 1.</p>
    <ul class="propositions">
      {#each view.options as option (option.ability.id)}
        <li class="carte">
          <header>
            <strong>{option.ability.name}</strong>
            <Sticker tone={RARITY_TONE[option.ability.rarity]}>{RARITY_LABEL[option.ability.rarity]}</Sticker>
          </header>
          <p class="texte-s">{option.ability.description}</p>
          <p class="texte-s discret">
            {ABILITY_POSITION_LABEL[option.ability.position]} · {describeTrigger(option.ability.trigger)} · {option.targeting}
          </p>
          <ul class="effets texte-s">
            {#each option.effects as effect, index (index)}<li>{effect}</li>{/each}
          </ul>
          <Button size="s" onclick={() => act((game) => chooseRerolledAbility(game, option.ability.id))}>Choisir</Button>
        </li>
      {/each}
    </ul>
    <Button size="s" variant="ghost" onclick={() => act((game) => chooseRerolledAbility(game, null))}>Garder l'ancienne capacité</Button>
  {:else if view.price === null}
    <p class="texte-s discret">Sa capacité est encore cachée : impossible de la changer avant de la découvrir.</p>
  {:else if view.otherPending}
    <p class="texte-s discret">Choisis d'abord la nouvelle capacité de {view.otherPending}.</p>
  {:else}
    <p class="texte-s">
      Tu paies <span class="mono texte-fort">{formatEuros(view.price)}</span> avant de voir 3 nouvelles capacités. La nouvelle repart au niveau 1, et chacune a
      {Math.round(REROLL_UPGRADE_CHANCE * 100)} % de chances d'être d'une rareté au-dessus.
    </p>
    {#if confirming}
      <div class="ligne-actions">
        <Button size="s" onclick={() => act((game) => rerollAbility(game, playerId))}>Payer {formatEuros(view.price)}</Button>
        <Button size="s" variant="ghost" onclick={() => (confirming = false)}>Annuler</Button>
      </div>
    {:else}
      <Button size="s" variant="ghost" disabled={view.budget < view.price} onclick={() => (confirming = true)}>
        {view.budget < view.price ? 'Budget insuffisant' : 'Tirer 3 nouvelles capacités'}
      </Button>
    {/if}
  {/if}
  <p class="texte-s texte-fort" role="status">{feedback ?? ''}</p>
</section>

<style>
  .reroll {
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
  .propositions {
    list-style: none;
    margin: 0;
    padding: 0;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-2);
  }
  .carte {
    display: grid;
    align-content: start;
    justify-items: start;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4) var(--space-4);
    border: 2px dashed currentColor;
  }
  .carte header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }
  .effets {
    margin: 0;
    padding-left: var(--space-4);
  }
</style>
