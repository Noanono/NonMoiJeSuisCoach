/**
 * Outil de test (I18N-03) : relève les textes écrits en dur dans le code du domaine, pour vérifier
 * que chacun a sa traduction. Lecture du code source uniquement, jamais chargé par le jeu.
 */

/** Un texte trouvé dans le source ; les morceaux `${…}` des gabarits deviennent `{}`. */
export interface SourceString {
  text: string;
  line: number;
}

const PLACEHOLDER = '{}';

/** Découpe un fichier TypeScript en littéraux texte, en suivant les gabarits imbriqués. */
export function extractStrings(source: string): SourceString[] {
  const found: SourceString[] = [];
  let index = 0;
  let line = 1;

  const advance = (): string => {
    const char = source[index++]!;
    if (char === '\n') line++;
    return char;
  };

  function readQuoted(quote: string): void {
    const startLine = line;
    let text = '';
    while (index < source.length) {
      const char = advance();
      if (char === '\\') {
        text += advance();
        continue;
      }
      if (char === quote || char === '\n') break;
      text += char;
    }
    found.push({ text, line: startLine });
  }

  function readTemplate(): void {
    const startLine = line;
    let text = '';
    while (index < source.length) {
      const char = advance();
      if (char === '\\') {
        text += advance();
        continue;
      }
      if (char === '`') break;
      if (char === '$' && source[index] === '{') {
        advance();
        readCode('}');
        text += PLACEHOLDER;
        continue;
      }
      text += char;
    }
    found.push({ text, line: startLine });
  }

  /** Lit du code jusqu'à la fermeture `closer` (ou la fin du fichier). */
  function readCode(closer: string | null): void {
    let depth = 0;
    while (index < source.length) {
      const char = source[index]!;
      const next = source[index + 1];
      if (char === '/' && next === '/') {
        while (index < source.length && source[index] !== '\n') advance();
        continue;
      }
      if (char === '/' && next === '*') {
        while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) advance();
        advance();
        advance();
        continue;
      }
      advance();
      if (char === "'" || char === '"') readQuoted(char);
      else if (char === '`') readTemplate();
      else if (char === '{') depth++;
      else if (char === '}') {
        if (depth === 0 && closer === '}') return;
        depth--;
      }
    }
  }

  readCode(null);
  return found;
}

/** Un texte affichable : au moins deux mots ou une lettre accentuée (pas un identifiant ni une clé). */
export function looksLikeProse(text: string): boolean {
  const stripped = normalizeTemplate(text).replaceAll(PLACEHOLDER, '').trim();
  if (stripped.length < 2) return false;
  if (/^[\w./:#@-]+$/.test(stripped) && !/[À-ÿ]/.test(stripped)) return false;
  return /[A-Za-zÀ-ÿ]{2,}/.test(stripped);
}

/** Forme comparable d'un gabarit du catalogue : chaque `{nom}` devient `{}`. */
export function normalizeTemplate(template: string): string {
  return template.replace(/\{[^{}]+\}/g, PLACEHOLDER);
}
