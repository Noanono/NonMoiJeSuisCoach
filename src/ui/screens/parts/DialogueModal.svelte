<script lang="ts">
  import Button from '../../kit/Button.svelte';
  import Modal from './Modal.svelte';
  import { store } from '../../store.svelte';
  import { DIALOGUES, localizeDialogue } from '../../../domain/club/dialogues';
  import { describeConsequence } from '../../../domain/club/model';
  import { answerDialogue, humanDivision } from '../../../domain/game';

  /** Dialogue de la semaine (CLUB-06) : la question et ses réponses, chacune avec ses conséquences chiffrées. */
  interface Props {
    onclose: () => void;
    /** Appelé après la réponse, avec l'issue à afficher (le dialogue a alors quitté la partie). */
    onanswered: (outcome: { speaker: string; text: string }) => void;
  }

  let { onclose, onanswered }: Props = $props();

  const dialogue = $derived(
    store.select((game) => {
      const pending = game.dialogue;
      const found = pending && DIALOGUES.find((candidate) => candidate.id === pending.dialogueId);
      if (!pending || !found) return null;
      // Montants ajustés à la division du coach (CLUB-06).
      const definition = localizeDialogue(found, humanDivision(game).tier);
      return {
        speaker: definition.speakerName,
        text: definition.text,
        choices: definition.choices.map((choice) => ({
          id: choice.id,
          label: choice.label,
          consequences: choice.consequences.map(describeConsequence).join(' · '),
        })),
      };
    }),
  );

  function reply(speaker: string, choiceId: string): void {
    const result = store.run((game) => answerDialogue(game, choiceId));
    onanswered({ speaker, text: result.message });
  }
</script>

{#if dialogue}
  <Modal title={dialogue.speaker} kicker="Dialogue de la semaine" {onclose}>
    <p>{dialogue.text}</p>
    <ul class="liste-nue" aria-label="Réponses possibles">
      {#each dialogue.choices as choice (choice.id)}
        <li class="reponse">
          <Button onclick={() => reply(dialogue.speaker, choice.id)}>{choice.label}</Button>
          <span class="texte-s discret">{choice.consequences}</span>
        </li>
      {/each}
    </ul>
  </Modal>
{/if}

<style>
  p {
    margin: 0;
  }
  .reponse {
    display: grid;
    justify-items: start;
    gap: var(--space-1);
  }
</style>
