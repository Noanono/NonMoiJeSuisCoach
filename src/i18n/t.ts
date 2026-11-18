import { intlLocale, lang, type Lang } from './locale';
import { en } from './ui/en';
import { fr, type Dictionary } from './ui/fr';

/**
 * Textes de l'interface (I18N-01) : `t('shell.nav.office')` rend la phrase dans la langue
 * choisie, `{nom}` remplacé par les variables. Les phrases du domaine passent par `td`.
 */
export const DICTIONARIES: Record<Lang, Dictionary> = { fr, en };

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Dictionary>;
/** Clés à deux formes (`.one` / `.other`). */
export type PluralKey = MessageKey extends infer K ? (K extends `${infer P}.one` ? P : never) : never;
export type MessageVars = Record<string, string | number>;

const PLACEHOLDER = /\{(\w+)\}/g;

/** Valeur brute d'une clé dans un dictionnaire, `undefined` si elle manque. */
export function rawMessage(dictionary: Dictionary, key: string): string | undefined {
  let node: unknown = dictionary;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function t(key: MessageKey, vars: MessageVars = {}): string {
  const template = rawMessage(DICTIONARIES[lang()], key) ?? rawMessage(fr, key) ?? key;
  return template.replace(PLACEHOLDER, (whole, name: string) => (name in vars ? formatVar(vars[name]!) : whole));
}

function formatVar(value: string | number): string {
  return typeof value === 'number' ? value.toLocaleString(intlLocale()) : value;
}

/** Choisit la forme singulier/pluriel (`key.one` / `key.other`) puis remplit `{n}`. */
export function tn(key: PluralKey, n: number, vars: MessageVars = {}): string {
  return t(`${key}.${Math.abs(n) === 1 ? 'one' : 'other'}` as MessageKey, { n, ...vars });
}

export { lang, setLang, intlLocale, LANGS, type Lang } from './locale';
export { td } from './domain/translate';
