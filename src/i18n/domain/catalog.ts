import { ABILITIES } from '../../domain/abilities/catalog';
import { DIALOGUES } from '../../domain/club/dialogues';
import { COMMENTARY_LINES, TRIGGER_LABEL, UNAVAILABLE } from '../../domain/match/commentary';
import { ABILITIES_EN } from './abilities.en';
import { COMMENTARY_LINES_EN, TRIGGER_LABEL_EN, UNAVAILABLE_EN } from './commentary.en';
import { DIALOGUES_EN } from './dialogues.en';
import { NETWORK_EN } from './network.en';
import { PHRASES_EN } from './phrases.en';

/** Une phrase du domaine et sa version anglaise (gabarits à `{nom}`). */
export interface PhrasePair {
  fr: string;
  en: string;
  /** D'où vient la paire, pour les messages des tests. */
  source: string;
}

/**
 * Toutes les paires français → anglais du domaine (I18N-02). Les tables du domaine (live,
 * dialogues, capacités) sont appariées par clé, les phrases écrites dans le code par gabarit.
 */
export function domainPhrasePairs(): PhrasePair[] {
  const pairs: PhrasePair[] = [];
  const add = (fr: string, en: string | undefined, source: string) => {
    if (en !== undefined) pairs.push({ fr, en, source });
  };

  for (const [fr, en] of Object.entries(PHRASES_EN)) add(fr, en, 'phrases');
  for (const [fr, en] of Object.entries(NETWORK_EN)) add(fr, en, 'network');

  for (const key of Object.keys(COMMENTARY_LINES) as (keyof typeof COMMENTARY_LINES)[]) {
    COMMENTARY_LINES[key].forEach((line, index) => add(line, COMMENTARY_LINES_EN[key][index], `commentary.${key}`));
  }
  for (const key of Object.keys(UNAVAILABLE) as (keyof typeof UNAVAILABLE)[]) add(UNAVAILABLE[key], UNAVAILABLE_EN[key], `unavailable.${key}`);
  for (const key of Object.keys(TRIGGER_LABEL) as (keyof typeof TRIGGER_LABEL)[]) add(TRIGGER_LABEL[key], TRIGGER_LABEL_EN[key], `trigger.${key}`);

  for (const dialogue of DIALOGUES) {
    const en = DIALOGUES_EN[dialogue.id];
    add(dialogue.speakerName, en?.speakerName, `dialogue.${dialogue.id}`);
    add(dialogue.text, en?.text, `dialogue.${dialogue.id}`);
    for (const choice of dialogue.choices) {
      add(choice.label, en?.choices[choice.id]?.label, `dialogue.${dialogue.id}.${choice.id}`);
      add(choice.outcome, en?.choices[choice.id]?.outcome, `dialogue.${dialogue.id}.${choice.id}`);
    }
  }

  for (const ability of ABILITIES) {
    const en = ABILITIES_EN[ability.id];
    add(ability.name, en?.name, `ability.${ability.id}`);
    add(ability.description, en?.description, `ability.${ability.id}`);
  }
  return pairs;
}
