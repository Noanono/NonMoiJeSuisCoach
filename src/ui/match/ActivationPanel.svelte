<script lang="ts">
  import { GAUGE_MAX } from '../../domain/match';
  import Button from '../kit/Button.svelte';
  import EnergyBar from '../kit/EnergyBar.svelte';
  import Gauge from '../kit/Gauge.svelte';
  import PlayerAvatar from '../kit/PlayerAvatar.svelte';
  import RatingBadge from '../kit/RatingBadge.svelte';
  import Sticker from '../kit/Sticker.svelte';
  import { abilitySheet } from './activation';
  import type { MatchController } from './controller.svelte';

  interface Props {
    controller: MatchController;
    playerId: string;
  }

  let { controller, playerId }: Props = $props();

  const RARITY_TONE = { common: 'craie', rare: 'scotch', legendary: 'fumigene', mythic: 'mythique' } as const;

  const sheet = $derived.by(() => {
    void controller.version;
    return abilitySheet(controller.match, controller.coachSide, playerId);
  });

  let heading: HTMLHeadingElement;

  // Le focus va sur le panneau à l'ouverture (accessibilité clavier).
  $effect(() => heading.focus());

  function closeOnEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape') controller.closeInspection();
  }
</script>

<svelte:window onkeydown={closeOnEscape} />

<div class="panneau" role="dialog" aria-labelledby="activation-titre">
  <div class="entete">
    {#if sheet.avatar}<PlayerAvatar player={sheet.avatar} size={56} />{/if}
    <div>
      <p class="tampon joueur">{sheet.playerName} · {sheet.position}</p>
      <h2 id="activation-titre" class="banderole-m" tabindex="-1" bind:this={heading}>{sheet.abilityName}</h2>
      {#if sheet.rarity}<Sticker tone={RARITY_TONE[sheet.rarity.key]}>{sheet.rarity.label}</Sticker>{/if}
    </div>
  </div>
  {#if sheet.description}<p class="description">{sheet.description}</p>{/if}
  {#if sheet.abilityEffects.length > 0}
    <ul class="ce-que-ca-fait texte-fort" aria-label="Effet de la capacité">
      {#each sheet.abilityEffects as line, index (index)}<li>{line}</li>{/each}
    </ul>
  {/if}

  <dl class="chiffres">
    <div><dt class="tampon">Cible</dt><dd class="texte-s">{sheet.targeting}</dd></div>
    <div><dt class="tampon">Coût</dt><dd class="stat-s">{sheet.cost} pts</dd></div>
    <div>
      <dt class="tampon">Énergie</dt>
      <dd class="jauge"><EnergyBar energy={sheet.energy} /><span class="stat-s">{sheet.energy} %</span></dd>
    </div>
    <div>
      <dt class="tampon">Jauge</dt>
      <dd class="jauge">
        <Gauge value={sheet.gauge} max={GAUGE_MAX} label="Jauge de Gueulante" />
        <span class="stat-s">{sheet.gauge}/{GAUGE_MAX}</span>
      </dd>
    </div>
  </dl>

  {#if sheet.active.length > 0}
    <ul class="effets texte-s" aria-label="Effets actifs">
      {#each sheet.active as effect, index (index)}<li>{effect}</li>{/each}
    </ul>
  {/if}

  {#if sheet.status}<p class="statut texte-s texte-fort">{sheet.status}</p>{/if}

  <div class="actions">
    <Button variant="primary" disabled={!sheet.available} onclick={() => controller.shout()}>Gueuler !</Button>
    <Button variant="ghost" onclick={() => controller.closeInspection()}>Laisser tomber</Button>
  </div>

  {#if sheet.substitution}
    {@const panel = sheet.substitution}
    <section class="changements" aria-label="Remplacement">
      <h3 class="tampon">{panel.title} · {panel.left}/{panel.max} restants</h3>
      {#if panel.left === 0}
        <p class="texte-s">Plus aucun changement disponible.</p>
      {:else if panel.options.length === 0}
        <p class="texte-s">Personne de disponible.</p>
      {:else}
        <ul>
          {#each panel.options as option (option.leavingId + option.enteringId)}
            <li>
              <button type="button" class="option" onclick={() => controller.substitute(option.leavingId, option.enteringId)}>
                <PlayerAvatar player={option.avatar} size={26} />
                <span class="option-nom texte-s texte-fort">{option.name}</span>
                <span class="tampon" class:hors={option.displaced}>{option.position}</span>
                <RatingBadge value={option.rating} size="s" />
                <span class="option-energie"><EnergyBar energy={option.energy} /></span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</div>

<style>
  .panneau {
    position: fixed;
    z-index: 5;
    left: 50%;
    bottom: var(--space-4);
    transform: translateX(-50%);
    width: min(94vw, 480px);
    max-height: 80vh;
    overflow-y: auto;
    background: var(--craie);
    color: var(--encre);
    border: var(--trait-epais) solid var(--encre);
    box-shadow: var(--ombre-sticker);
    padding: var(--space-4);
  }
  .entete {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
    margin-bottom: var(--space-2);
  }
  .joueur {
    margin: 0;
    color: var(--encre-pale);
  }
  h2:focus {
    outline: none;
  }
  h2:focus-visible {
    outline: var(--trait-epais) solid var(--scotch);
  }
  .description {
    margin: 0 0 var(--space-2);
  }
  .ce-que-ca-fait {
    margin: 0 0 var(--space-2);
    padding-left: var(--space-4);
  }
  .chiffres {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2) var(--space-4);
    margin: var(--space-2) 0;
  }
  .chiffres div:first-child {
    grid-column: 1 / -1;
  }
  dd {
    margin: 0;
  }
  .stat-s {
    font-family: var(--font-mono);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .jauge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .effets {
    margin: 0 0 var(--space-2);
    padding-left: var(--space-4);
  }
  .statut {
    margin: 0 0 var(--space-2);
    border-left: var(--trait-epais) solid var(--carton);
    padding-left: var(--space-2);
  }
  .changements {
    margin-top: var(--space-4);
    padding-top: var(--space-2);
    border-top: var(--trait-fin) solid var(--encre);
  }
  .changements h3 {
    margin: 0 0 var(--space-1);
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .changements p {
    margin: 0;
  }
  .changements ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }
  .option {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto 44px;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: 2px var(--space-1);
    background: var(--craie-2);
    color: var(--encre);
    border: var(--trait-fin) solid var(--encre);
    cursor: pointer;
    text-align: left;
  }
  .option-nom {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .option-energie {
    display: block;
  }
  .hors {
    background: var(--scotch);
    color: var(--encre-fixe);
    padding: 0 2px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    align-items: center;
    margin-top: var(--space-4);
  }
</style>
