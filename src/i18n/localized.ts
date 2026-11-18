import { lang, type Lang } from './locale';

/**
 * Table de libellés bilingue lue comme une table simple : `POSITION_LABEL.GK` rend le libellé
 * dans la langue courante (et abonne l'UI au changement de langue).
 */
export function localized<K extends string>(byLang: Record<Lang, Record<K, string>>): Readonly<Record<K, string>> {
  const table = {} as Record<K, string>;
  for (const key of Object.keys(byLang.fr) as K[]) {
    Object.defineProperty(table, key, { enumerable: true, get: () => byLang[lang()][key] });
  }
  return table;
}
