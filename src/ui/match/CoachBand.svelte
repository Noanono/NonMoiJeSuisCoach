<script lang="ts">
  import Button from '../kit/Button.svelte';
  import {
    defaultFreeKickOption,
    defaultWall,
    expectedAgainstDive,
    expectedPenaltyChance,
    freeKickChances,
    FREE_KICK_DISTANCE_LABEL,
    KEEPER_HABIT_LABEL,
    KEEPER_STAY_CHANCE,
    keeperHabit,
    type FreeKickOption,
    type KeeperDive,
    type PenaltyStyle,
    type Side,
    type WallSize,
  } from '../../domain/match';
  import type { MatchController } from './controller.svelte';
  import { windowTitle } from './verdict';

  /**
   * Bandeau scotch rayé quand le match attend le coach : choix des cibles (CAP-16, CAP-17),
   * fenêtre d'événement (CAP-19), et sur coup franc le choix de l'option ou du mur.
   * Le ciblage passe avant : il peut naître d'une fenêtre.
   */
  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

  const OPTIONS: { id: FreeKickOption; label: string; hint: string }[] = [
    { id: 'shot', label: 'Frappe directe', hint: 'le meilleur tireur vise la lucarne' },
    { id: 'cross', label: 'Centre', hint: 'les grands montent ; risque de contre si c’est repoussé' },
    { id: 'combination', label: 'Combinaison', hint: 'passe courte, action sûre' },
  ];
  const WALLS: { id: WallSize; label: string; hint: string }[] = [
    { id: 'small', label: 'Petit mur', hint: 'meilleur sur les centres, faible contre la frappe' },
    { id: 'normal', label: 'Mur normal', hint: 'équilibré' },
    { id: 'large', label: 'Grand mur', hint: 'ferme la frappe, laisse de l’espace sur les centres' },
  ];

  // L'état d'attente est muté en place par le moteur : on relit à chaque version.
  const prompt = $derived.by(() => {
    void controller.version;
    const match = controller.match;
    const pending = match.pending;
    if (pending) {
      const source = match[pending.side].players.find((player) => player.id === pending.playerId);
      return {
        kind: 'targeting' as const,
        abilityName: source?.ability?.name ?? 'Capacité',
        chosen: pending.targetIds.length,
        required: pending.required,
      };
    }
    const window = match.awaiting;
    if (window && window.side === controller.coachSide) {
      const play = match.pendingPlay;
      const distance = play?.kind === 'freeKick' ? (play.distance ?? 'medium') : null;
      return {
        kind: 'window' as const,
        title: windowTitle(window, play),
        hasAbilities: window.eligiblePlayerIds.length > 0,
        freeKick:
          window.freeKick && play && distance
            ? {
                role: window.freeKick,
                distance: FREE_KICK_DISTANCE_LABEL[distance],
                // Chances exactes au moment du choix : tireur, gardien, mur et capacités en cours.
                odds: freeKickChances(match),
                wallOdds: Object.fromEntries(WALLS.map((wall) => [wall.id, freeKickChances(match, wall.id)?.[play.option ?? defaultFreeKickOption(distance)]?.chance ?? 0])) as Record<WallSize, number>,
                wallLabel: WALLS.find((wall) => wall.id === (play.wall ?? defaultWall(distance)))?.label ?? '',
                theirOption: OPTIONS.find((option) => option.id === (play.option ?? defaultFreeKickOption(distance)))?.label ?? '',
                option: play.option ?? defaultFreeKickOption(distance),
                wall: play.wall ?? defaultWall(distance),
              }
            : null,
        penalty: window.penalty && play?.kind === 'penalty' ? penaltyPrompt(window.penalty, play.side) : null,
      };
    }
    return null;
  });

  const STYLES: { id: PenaltyStyle; label: string; hint: string }[] = [
    { id: 'placed', label: 'Frappe placée', hint: 'petit filet : sûre, sauf si le gardien devine le côté' },
    { id: 'power', label: 'En force', hint: 'déborde le gardien qui plonge, s’écrase sur celui qui attend' },
    { id: 'panenka', label: 'Panenka', hint: 'le bluff : imparable s’il plonge, ridicule s’il reste au centre ; fait basculer la gueulante' },
  ];
  const DIVES: { id: KeeperDive; label: string; hint: string }[] = [
    { id: 'left', label: 'Plonger à gauche', hint: 'pari sur le côté' },
    { id: 'right', label: 'Plonger à droite', hint: 'pari sur le côté' },
    { id: 'center', label: 'Rester au centre', hint: 'piège la Panenka et la frappe en force, battu par une frappe placée' },
  ];

  /** Penalty : en attaque, ce qu'on sait du gardien adverse ; en défense, le choix du plongeon. */
  function penaltyPrompt(role: 'attack' | 'defense', shootingSide: Side) {
    const match = controller.match;
    const play = match.pendingPlay;
    const keeperTeam = shootingSide === 'home' ? match.away : match.home;
    const keeper = keeperTeam.players.find((player) => player.line === 'GK' && !player.sentOff);
    const scouted = keeper !== undefined && (match.scoutedKeeperIds ?? []).includes(keeper.id);
    const habit = keeper && scouted ? keeperHabit(keeper.id) : null;
    const stay = KEEPER_STAY_CHANCE[habit ?? 'neutral'];
    return {
      role,
      keeper: habit && keeper ? `Le staff a noté : ${keeper.name} ${KEEPER_HABIT_LABEL[habit]}.` : 'Habitudes du gardien inconnues : le staff les notera après son premier penalty.',
      style: play?.style ?? null,
      dive: play?.dive ?? null,
      odds: Object.fromEntries(STYLES.map((style) => [style.id, expectedPenaltyChance(style.id, stay)])) as Record<PenaltyStyle, number>,
      against: Object.fromEntries(DIVES.map((dive) => [dive.id, expectedAgainstDive(dive.id)])) as Record<KeeperDive, number>,
    };
  }

  const percent = (value: number) => `${Math.round(value * 100)} %`;
  /** Pourcentage au dixième : « 12,4 % ». */
  const exact = (value: number) => `${(value * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  /** Points de probabilité ajoutés par les capacités : « 5,0 pts ». */
  const points = (value: number) => `${Math.abs(value * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts`;

  /** Échap annule le ciblage en cours, sans rien consommer (CAP-20). */
  function cancelOnEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && prompt?.kind === 'targeting') controller.cancel();
  }
</script>

<svelte:window onkeydown={cancelOnEscape} />

{#if prompt}
  <div class="bandeau" role="region" aria-label="Le match t'attend">
    {#if prompt.kind === 'targeting'}
      {@const complete = prompt.chosen >= prompt.required}
      <p class="consigne" aria-live="polite">
        <span class="texte-fort">{prompt.abilityName} :</span>
        <span>{complete ? 'cible choisie. On y va ?' : 'touche une cible surlignée.'}</span>
        <span class="tampon compteur">{prompt.chosen}/{prompt.required}</span>
      </p>
      <div class="actions">
        <Button variant="primary" size="s" disabled={!complete} onclick={() => controller.confirm()}>Valider</Button>
        <Button variant="secondary" size="s" onclick={() => controller.cancel()}>Laisser tomber</Button>
      </div>
    {:else if prompt.freeKick}
      {@const freeKick = prompt.freeKick}
      <div class="coup-franc">
        <p class="consigne" aria-live="polite">
          <span class="banderole-titre">{prompt.title}</span>
          <span class="tampon distance">Coup franc {freeKick.distance}</span>
          <span class="texte-s">{freeKick.role === 'attack' ? `En face : ${freeKick.wallLabel.toLowerCase()}.` : `Ils vont jouer : ${freeKick.theirOption.toLowerCase()}.`}</span>
          {#if prompt.hasAbilities}<span class="texte-s">Une capacité peut s'en mêler : touche un joueur surligné.</span>{/if}
        </p>
        {#if freeKick.role === 'attack'}
          <div class="choix" role="radiogroup" aria-label="Option du coup franc">
            {#each OPTIONS as option (option.id)}
              {@const odds = freeKick.odds?.[option.id]}
              <button
                class="carte"
                role="radio"
                aria-checked={freeKick.option === option.id}
                onclick={() => controller.chooseFreeKick(option.id)}
              >
                <span class="texte-fort">{option.label}</span>
                <span class="mono">but {exact(odds?.chance ?? 0)}</span>
                {#if odds?.takerName}<span class="texte-s">Tireur : {odds.takerName}</span>{/if}
                {#if odds && odds.boost !== 0}<span class="texte-s mono">dont capacités {odds.boost > 0 ? '+' : '−'}{points(odds.boost)}</span>{/if}
                <span class="texte-s">{option.hint}</span>
              </button>
            {/each}
          </div>
        {:else}
          <div class="choix" role="radiogroup" aria-label="Taille du mur">
            {#each WALLS as wall (wall.id)}
              <button class="carte" role="radio" aria-checked={freeKick.wall === wall.id} onclick={() => controller.chooseWall(wall.id)}>
                <span class="texte-fort">{wall.label}</span>
                <span class="mono">but adverse {exact(freeKick.wallOdds[wall.id])}</span>
                <span class="texte-s">{wall.hint}</span>
              </button>
            {/each}
          </div>
        {/if}
        <div class="actions">
          <Button variant="primary" size="s" onclick={() => controller.dismissWindow()}>
            {freeKick.role === 'attack' ? 'Jouer le coup franc' : 'En place'}
          </Button>
        </div>
      </div>
    {:else if prompt.penalty}
      {@const penalty = prompt.penalty}
      <div class="coup-franc">
        <p class="consigne" aria-live="polite">
          <span class="banderole-titre">{penalty.role === 'attack' ? 'Penalty pour toi : quelle frappe ?' : 'Penalty contre toi : où plonge ton gardien ?'}</span>
          {#if penalty.role === 'attack'}<span class="texte-s">{penalty.keeper}</span>{/if}
          {#if prompt.hasAbilities}<span class="texte-s">Une capacité peut s'en mêler : touche un joueur surligné.</span>{/if}
        </p>
        {#if penalty.role === 'attack'}
          <div class="choix" role="radiogroup" aria-label="Frappe du penalty">
            {#each STYLES as style (style.id)}
              <button class="carte" role="radio" aria-checked={penalty.style === style.id} onclick={() => controller.choosePenaltyStyle(style.id)}>
                <span class="texte-fort">{style.label}</span>
                <span class="mono">~{percent(penalty.odds[style.id])}</span>
                <span class="texte-s">{style.hint}</span>
              </button>
            {/each}
          </div>
        {:else}
          <div class="choix" role="radiogroup" aria-label="Plongeon du gardien">
            {#each DIVES as dive (dive.id)}
              <button class="carte" role="radio" aria-checked={penalty.dive === dive.id} onclick={() => controller.chooseKeeperDive(dive.id)}>
                <span class="texte-fort">{dive.label}</span>
                <span class="mono">but adverse ~{percent(penalty.against[dive.id])}</span>
                <span class="texte-s">{dive.hint}</span>
              </button>
            {/each}
          </div>
        {/if}
        <div class="actions">
          <Button variant="primary" size="s" onclick={() => controller.dismissWindow()}>
            {penalty.role === 'attack' ? (penalty.style ? 'Tirer' : 'Laisser le tireur choisir') : penalty.dive ? 'En place' : 'Laisser le gardien choisir'}
          </Button>
        </div>
      </div>
    {:else}
      <p class="consigne" aria-live="polite">
        <span class="banderole-titre">{prompt.title}</span>
        <span class="texte-s">Touche un joueur surligné, ou laisse filer.</span>
      </p>
      <div class="actions">
        <Button variant="secondary" size="s" onclick={() => controller.dismissWindow()}>Laisser passer</Button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .bandeau {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2) var(--space-4);
    padding: var(--space-2) var(--space-4);
    color: var(--encre-fixe);
    border: var(--trait-epais) solid var(--encre-fixe);
    box-shadow: var(--ombre-sticker);
    background: repeating-linear-gradient(
      45deg,
      var(--scotch) 0 14px,
      color-mix(in srgb, var(--scotch) 85%, var(--encre-fixe)) 14px 17px
    );
  }
  .consigne {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-2);
  }
  .banderole-titre {
    font-family: var(--font-display);
    font-size: 24px;
    line-height: 1.1;
  }
  .compteur,
  .distance {
    background: var(--encre-fixe);
    color: var(--craie-fixe);
    padding: 0 var(--space-2);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  .actions {
    display: flex;
    gap: var(--space-2);
  }
  .coup-franc {
    display: grid;
    gap: var(--space-2);
    width: 100%;
  }
  .choix {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr));
    gap: var(--space-2);
  }
  .carte {
    display: grid;
    gap: 2px;
    text-align: left;
    padding: var(--space-2);
    font: inherit;
    color: var(--encre-fixe);
    background: var(--craie-fixe);
    border: var(--trait-fin) solid var(--encre-fixe);
    cursor: pointer;
  }
  .carte[aria-checked='true'] {
    background: var(--encre-fixe);
    color: var(--craie-fixe);
    box-shadow: var(--ombre-presse);
  }
</style>
