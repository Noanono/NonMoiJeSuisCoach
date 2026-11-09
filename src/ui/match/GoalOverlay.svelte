<script lang="ts">
  import Button from '../kit/Button.svelte';
  import PlayerAvatar from '../kit/PlayerAvatar.svelte';
  import type { GoalAlert } from './verdict';

  /** Le match s'arrête sur un but : qui a marqué, le score, et on reprend quand le coach veut. */
  interface Props {
    goal: GoalAlert;
    onresume: () => void;
  }

  let { goal, onresume }: Props = $props();

  let container: HTMLDivElement;
  $effect(() => container.querySelector('button')?.focus());
</script>

<div class="fond">
  <div class="but" class:encaisse={!goal.own} role="alertdialog" aria-labelledby="but-titre" bind:this={container}>
    <p id="but-titre" class="titre">{goal.title}</p>
    <div class="buteur">
      <PlayerAvatar player={goal.avatar} size={88} />
      <p>
        <span class="nom">{goal.scorer}</span>
        <span class="detail tampon">{goal.minute} · {goal.team}{goal.penalty ? ' · sur penalty' : ''}</span>
      </p>
    </div>
    <p class="score"><span class="equipe">{goal.ownName}</span> {goal.ownGoals} - {goal.otherGoals} <span class="equipe">{goal.otherName}</span></p>
    <Button variant="primary" onclick={onresume}>Reprendre le match</Button>
  </div>
</div>

<style>
  .fond {
    position: fixed;
    z-index: 8;
    inset: 0;
    display: grid;
    place-items: center;
    padding: var(--space-4);
    background: color-mix(in srgb, var(--encre-fixe) 55%, transparent);
  }
  .but {
    display: grid;
    justify-items: center;
    gap: var(--space-4);
    width: min(94vw, 640px);
    padding: var(--space-6);
    text-align: center;
    color: var(--craie-fixe);
    background: var(--victoire);
    border: var(--trait-epais) solid var(--encre-fixe);
    box-shadow: 8px 8px 0 var(--encre-fixe);
    transform: rotate(var(--rotation-sticker));
  }
  .encaisse {
    background: var(--carton);
  }
  p {
    margin: 0;
  }
  .titre {
    font-family: var(--font-display);
    font-size: 88px;
    line-height: 1;
    text-transform: uppercase;
  }
  .buteur {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    text-align: left;
  }
  .nom {
    display: block;
    font-family: var(--font-display);
    font-size: 36px;
    line-height: 1.1;
    text-transform: uppercase;
  }
  .detail {
    display: block;
  }
  .score {
    font-family: var(--font-display);
    font-size: 40px;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .equipe {
    font-size: 20px;
  }
  @media (max-width: 600px) {
    .titre {
      font-size: 56px;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .but {
      animation: tampon 220ms ease-out;
    }
  }
  @keyframes tampon {
    from {
      scale: 1.6;
      opacity: 0;
    }
  }
</style>
