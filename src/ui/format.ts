import { intlLocale } from '../i18n/locale';

/** Formats d'affichage partagés : les chiffres restent sacrés (design system), à la mode de la langue choisie. */
const formats = new Map<string, { euros: Intl.NumberFormat; percent: Intl.NumberFormat; number: Intl.NumberFormat }>();

function formatsFor(locale: string) {
  let found = formats.get(locale);
  if (!found) {
    found = {
      euros: new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
      percent: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
      number: new Intl.NumberFormat(locale),
    };
    formats.set(locale, found);
  }
  return found;
}

export function formatEuros(amount: number): string {
  return formatsFor(intlLocale()).euros.format(amount);
}

export function formatPercent(fraction: number): string {
  return formatsFor(intlLocale()).percent.format(fraction);
}

export function formatNumber(value: number): string {
  return formatsFor(intlLocale()).number.format(value);
}

export function formatSigned(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`;
}
