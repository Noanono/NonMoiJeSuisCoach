import { lang, type Lang } from '../locale';
import { domainPhrasePairs } from './catalog';

/**
 * Traduction à l'affichage des textes produits par le domaine (I18N-02).
 *
 * Le domaine écrit ses phrases en français et la sauvegarde les garde telles quelles
 * (`state.news`, live du match, bilan de saison…). Plutôt que de changer le format des
 * sauvegardes et le protocole multijoueur, l'UI reconnaît chaque phrase à son gabarit
 * français et la réécrit en anglais, variables comprises (elles-mêmes traduites si ce sont
 * des morceaux du domaine, comme un libellé ou un nom de capacité). Les sauvegardes et les
 * ligues existantes s'affichent donc dans la langue choisie sans migration. Une phrase
 * inconnue (nom propre, ancienne formulation) reste telle quelle.
 */

interface CompiledPattern {
  regex: RegExp;
  names: string[];
  en: string;
  /** Nombre de caractères fixes : les gabarits les plus précis passent d'abord. */
  weight: number;
}

const PLACEHOLDER = /\{([^{}]+)\}/g;
const HAS_PLACEHOLDER = /\{[^{}]+\}/;
const MAX_DEPTH = 4;
const MONEY = /^([+−-]?)\s*(\d{1,3}(?:[\s  ]\d{3})*)\s*€$/;
const GROUPED_NUMBER = /^([+−-]?)(\d{1,3}(?:[\s  ]\d{3})+)$/;

let exact: Map<string, string> | null = null;
let upperExact: Map<string, string> | null = null;
let patterns: CompiledPattern[] = [];
const cache = new Map<string, string | null>();

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compile(fr: string, en: string): CompiledPattern {
  const names: string[] = [];
  let source = '';
  let last = 0;
  for (const match of fr.matchAll(PLACEHOLDER)) {
    source += escapeRegex(fr.slice(last, match.index));
    const name = match[1]!;
    const seen = names.indexOf(name);
    if (seen >= 0) source += `\\${seen + 1}`;
    else {
      names.push(name);
      source += '([\\s\\S]*?)';
    }
    last = match.index + match[0].length;
  }
  source += escapeRegex(fr.slice(last));
  return { regex: new RegExp(`^${source}$`), names, en, weight: fr.replace(PLACEHOLDER, '').length };
}

function build(): void {
  exact = new Map();
  upperExact = new Map();
  patterns = [];
  for (const { fr, en } of domainPhrasePairs()) {
    if (HAS_PLACEHOLDER.test(fr)) patterns.push(compile(fr, en));
    else {
      exact.set(fr, en);
      upperExact.set(fr.toUpperCase(), en.toUpperCase());
    }
  }
  patterns.sort((a, b) => b.weight - a.weight);
}

function englishNumber(digits: string): string {
  return Number(digits.replace(/[\s  ]/g, '')).toLocaleString('en-GB');
}

function ordinal(value: string): string {
  const n = Number(value);
  if (!Number.isInteger(n)) return value;
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** Une valeur glissée dans une phrase : morceau du domaine, montant ou nombre à reformater. */
function translateValue(value: string, depth: number): string {
  const leading = value.match(/^\s*/)![0];
  const trailing = value.match(/\s*$/)![0];
  const core = value.trim();
  if (!core) return value;
  const found = lookup(core, depth);
  if (found !== null) return leading + found + trailing;
  const money = MONEY.exec(core);
  if (money) return `${leading}${money[1]}€${englishNumber(money[2]!)}${trailing}`;
  const grouped = GROUPED_NUMBER.exec(core);
  if (grouped) return `${leading}${grouped[1]}${englishNumber(grouped[2]!)}${trailing}`;
  // Listes (« blessé, suspendu ») : chaque élément à part.
  if (core.includes(', ')) {
    const parts = core.split(', ');
    const translated = parts.map((part) => lookup(part, depth) ?? part);
    if (translated.some((part, index) => part !== parts[index])) return leading + translated.join(', ') + trailing;
  }
  return value;
}

function fillEnglish(template: string, values: Record<string, string>): string {
  return template.replace(PLACEHOLDER, (whole, spec: string) => {
    const [name, format] = spec.split('|') as [string, string | undefined];
    const value = values[name];
    if (value === undefined) return whole;
    return format === 'ordinal' ? ordinal(value) : value;
  });
}

/** Traduction anglaise d'une phrase du domaine, `null` si aucun gabarit ne la reconnaît. */
function lookup(text: string, depth = 0): string | null {
  if (!exact) build();
  const direct = exact!.get(text);
  if (direct !== undefined) return direct;
  if (depth >= MAX_DEPTH) return null;
  if (depth === 0 && cache.has(text)) return cache.get(text)!;
  let result: string | null = null;
  for (const pattern of patterns) {
    const match = pattern.regex.exec(text);
    if (!match) continue;
    const values: Record<string, string> = {};
    pattern.names.forEach((name, index) => (values[name] = translateValue(match[index + 1]!, depth + 1)));
    result = fillEnglish(pattern.en, values);
    break;
  }
  result ??= upperExact!.get(text) ?? null;
  if (depth === 0) cache.set(text, result);
  return result;
}

/** Phrase du domaine dans la langue de l'interface (réactif dans l'UI). */
export function td(text: string, target: Lang = lang()): string {
  if (target === 'fr' || !text) return text;
  return lookup(text) ?? text;
}

/** Pour les tests : la phrase est-elle reconnue par le catalogue anglais ? */
export function hasEnglish(text: string): boolean {
  return lookup(text) !== null;
}
