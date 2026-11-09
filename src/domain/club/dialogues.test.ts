import { describe, expect, test } from 'bun:test';
import { createRng } from '../core/rng';
import { makePlayer } from '../testing/fixtures';
import { applyDialogueChoice, DIALOGUES, pickWeeklyDialogue, type DialogueContext } from './dialogues';

const calmWeek: DialogueContext = {
  losingStreak: 0,
  winningStreak: 0,
  budget: 50_000,
  presidentConfidence: 60,
  recentDialogueIds: [],
};

describe('dialogues (CLUB-06)', () => {
  test('au moins 15 dialogues, 2 ou 3 choix chacun, tous avec des conséquences', () => {
    expect(DIALOGUES.length).toBeGreaterThanOrEqual(15);
    expect(new Set(DIALOGUES.map((dialogue) => dialogue.id)).size).toBe(DIALOGUES.length);
    for (const dialogue of DIALOGUES) {
      expect(dialogue.choices.length).toBeGreaterThanOrEqual(2);
      expect(dialogue.choices.length).toBeLessThanOrEqual(3);
      for (const choice of dialogue.choices) expect(choice.consequences.length).toBeGreaterThan(0);
    }
  });

  test('un dialogue ne fatigue jamais : seuls les matchs fatiguent (EFF-04)', () => {
    for (const dialogue of DIALOGUES) {
      for (const choice of dialogue.choices) {
        for (const consequence of choice.consequences) {
          if (consequence.kind === 'fatigue') expect(consequence.value).toBeLessThan(0);
        }
      }
    }
  });

  test('le contexte oriente le choix du dialogue de la semaine', () => {
    expect(pickWeeklyDialogue({ ...calmWeek, losingStreak: 4 }, createRng(1)).trigger).toBe('losingStreak');
    expect(pickWeeklyDialogue({ ...calmWeek, budget: 100 }, createRng(1)).trigger).toBe('lowBudget');
    expect(pickWeeklyDialogue(calmWeek, createRng(1)).trigger).toBe('anytime');
  });

  test('un dialogue récent n’est pas resservi tant qu’il en reste d’autres', () => {
    const recentDialogueIds = DIALOGUES.filter((dialogue) => dialogue.trigger === 'anytime')
      .slice(1)
      .map((dialogue) => dialogue.id);
    const dialogue = pickWeeklyDialogue({ ...calmWeek, recentDialogueIds }, createRng(5));
    expect(recentDialogueIds).not.toContain(dialogue.id);
  });

  test('appliquer un choix modifie les jauges', () => {
    const dialogue = DIALOGUES.find((candidate) => candidate.id === 'physio-ice-bath')!;
    const squad = [makePlayer({ id: 'p9', fatigue: 50 })];
    const outlook = { budget: 1_000, presidentConfidence: 50, sponsorMood: 50 };
    const result = applyDialogueChoice({ outlook, squad }, dialogue, 'ice-only');
    expect(result.squad[0]!.fatigue).toBe(45);
    expect(result.outlook.budget).toBe(950);
    expect(result.messages).toContain('Budget −50 €');
    expect(() => applyDialogueChoice({ outlook, squad }, dialogue, 'nope')).toThrow();
  });
});
