import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { ABILITIES } from '../domain/abilities/catalog';
import { DIALOGUES } from '../domain/club/dialogues';
import { answerDialogue, autoPickLineup } from '../domain/game/actions';
import { finishHumanMatch, humanLineupErrors, startHumanMatch } from '../domain/game/matches';
import { newGame } from '../domain/game/newGame';
import { humanFixture } from '../domain/game/selectors';
import type { GameState } from '../domain/game/state';
import { advanceWeek, withRng } from '../domain/game/week';
import { dismissEventWindow, tick } from '../domain/match';
import { ABILITIES_EN } from './domain/abilities.en';
import { domainPhrasePairs } from './domain/catalog';
import { DIALOGUES_EN } from './domain/dialogues.en';
import { hasEnglish, td } from './domain/translate';
import { extractStrings, looksLikeProse, normalizeTemplate } from './sourceStrings';
import { en } from './ui/en';
import { fr } from './ui/fr';

function leaves(node: unknown, prefix = ''): Map<string, string> {
  const found = new Map<string, string>();
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') found.set(full, value);
    else for (const [childKey, childValue] of leaves(value, full)) found.set(childKey, childValue);
  }
  return found;
}

function placeholders(template: string): string[] {
  return [...template.matchAll(/\{([^{}|]+)(?:\|[a-z]+)?\}/g)].map((match) => match[1]!).sort();
}

describe('dictionnaires de l’interface (I18N-01)', () => {
  const french = leaves(fr);
  const english = leaves(en);

  test('chaque clé française existe en anglais', () => {
    expect([...french.keys()].filter((key) => !english.has(key))).toEqual([]);
  });

  test('chaque clé anglaise existe en français', () => {
    expect([...english.keys()].filter((key) => !french.has(key))).toEqual([]);
  });

  test('les deux langues utilisent les mêmes variables', () => {
    const mismatches = [...french].filter(([key, text]) => english.has(key) && placeholders(text).join() !== placeholders(english.get(key)!).join());
    expect(mismatches.map(([key]) => key)).toEqual([]);
  });

  test('aucun texte vide', () => {
    expect([...french, ...english].filter(([, text]) => text.trim() === '').map(([key]) => key)).toEqual([]);
  });
});

describe('textes du domaine (I18N-02)', () => {
  test('chaque dialogue et chaque réponse a sa version anglaise', () => {
    const missing = DIALOGUES.flatMap((dialogue) => {
      const english = DIALOGUES_EN[dialogue.id];
      if (!english) return [dialogue.id];
      return dialogue.choices.filter((choice) => !english.choices[choice.id]).map((choice) => `${dialogue.id}.${choice.id}`);
    });
    expect(missing).toEqual([]);
    expect(Object.keys(DIALOGUES_EN).filter((id) => !DIALOGUES.some((dialogue) => dialogue.id === id))).toEqual([]);
  });

  test('chaque capacité a son nom et sa description en anglais', () => {
    expect(ABILITIES.filter((ability) => !ABILITIES_EN[ability.id]).map((ability) => ability.id)).toEqual([]);
    expect(Object.keys(ABILITIES_EN).filter((id) => !ABILITIES.some((ability) => ability.id === id))).toEqual([]);
  });

  test('les gabarits anglais reprennent les variables du français', () => {
    const mismatches = domainPhrasePairs().filter((pair) => placeholders(pair.fr).join() !== placeholders(pair.en).join());
    expect(mismatches.map((pair) => `${pair.source}: ${pair.fr}`)).toEqual([]);
  });

  test('chaque texte écrit en dur dans le domaine a sa traduction', () => {
    const known = new Set(domainPhrasePairs().map((pair) => normalizeTemplate(pair.fr)));
    const src = path.join(process.cwd(), 'src');
    // Le domaine, et les messages du multijoueur qui arrivent au joueur (hôte et transport).
    const roots = [path.join(src, 'domain'), path.join(src, 'server'), path.join(src, 'ui', 'net'), path.join(src, 'ui', 'multiClient.svelte.ts')];
    // Données qui ne s'affichent pas telles quelles : noms propres, outils de mesure, jeux de test.
    const skipped = /[\\/](testing|names\.ts|fixtures\.ts|impactBench\.ts|patch\.ts)/;
    // Journaux de la console, types MIME, URL et JSON : jamais affichés dans le jeu.
    const technical = /console\.|^\s*\{"|^\/|^[a-z]+\/[a-z+.-]+(;.*)?$|^data: |^: ping/;
    const missing: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of statSync(dir).isDirectory() ? readdirSync(dir) : ['']) {
        const file = path.join(dir, entry);
        if (statSync(file).isDirectory()) walk(file);
        else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !skipped.test(file)) {
          const source = readFileSync(file, 'utf8');
          const lines = source.split('\n');
          for (const found of extractStrings(source)) {
            const line = lines[found.line - 1] ?? '';
            // Erreurs de programmation (jamais montrées au joueur) et noms propres des équipes étrangères.
            if (/new Error\(|clubName:|firstNames:|lastNames:|console\./.test(line) || technical.test(found.text) || !looksLikeProse(found.text)) continue;
            if (!known.has(normalizeTemplate(found.text))) missing.push(`${path.relative(src, file)}:${found.line} ${found.text}`);
          }
        }
      }
    };
    for (const root of roots) walk(root);
    expect(missing).toEqual([]);
  });

  test('une phrase reconnue est réécrite avec ses variables', () => {
    expect(td('Offre de Gégé FC : 1 500 € pour Jojo Bidon. À toi de voir.', 'en')).toBe('Offer from Gégé FC: €1,500 for Jojo Bidon. Your call.');
    expect(td('Fin de saison : 3e de District des Bourbiers. Aucun objectif atteint. Le président a fait changer la serrure de ton bureau, « par sécurité ».', 'en')).toBe(
      'End of season: 3rd in Mudbath District League. No target met. The chairman has had the lock on your office changed, "for security".',
    );
    expect(td('Nom propre inconnu', 'en')).toBe('Nom propre inconnu');
    expect(td('Offre refusée.', 'fr')).toBe('Offre refusée.');
  });

  test('une saison jouée ne produit que des phrases traduites (actualité et live)', () => {
    const untranslated = new Set<string>();
    const check = (text: string) => {
      if (!hasEnglish(text)) untranslated.add(text);
    };
    const state: GameState = newGame({ seed: 4242 });
    for (const line of state.news) check(line);
    for (let week = 0; week < 20 && state.status === 'playing'; week++) {
      const fixture = humanFixture(state);
      if (fixture && !fixture.result) {
        if (humanLineupErrors(state).length > 0) autoPickLineup(state);
        const match = withRng(state, (rng) => startHumanMatch(state, rng));
        while (match.status !== 'finished') {
          if (match.awaiting) dismissEventWindow(match);
          tick(match);
        }
        for (const event of match.events) if (event.text) check(event.text);
        finishHumanMatch(state, match);
      }
      if (state.dialogue) {
        const dialogue = DIALOGUES.find((entry) => entry.id === state.dialogue!.dialogueId)!;
        answerDialogue(state, dialogue.choices[0]!.id);
      }
      advanceWeek(state);
      for (const line of state.news) check(line);
    }
    expect([...untranslated]).toEqual([]);
  });
});
