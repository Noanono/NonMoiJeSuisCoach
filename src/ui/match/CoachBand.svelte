<script lang="ts">
  import Button from '../kit/Button.svelte';
  import type { MatchController } from './controller.svelte';
  import { windowTitle } from './verdict';

  /**
   * Bandeau scotch rayé quand le match attend le coach : choix des cibles (CAP-16, CAP-17)
   * ou fenêtre d'événement (CAP-19). Le ciblage passe avant : il peut naître d'une fenêtre.
   */
  interface Props {
    controller: MatchController;
  }

  let { controller }: Props = $props();

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
      return { kind: 'window' as const, title: windowTitle(window, match.pendingPlay) };
    }
    return null;
  });
</script>

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
  .compteur {
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
</style>
