/** Formats d'affichage partagés : les chiffres restent sacrés (design system). */
const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });

export function formatEuros(amount: number): string {
  return euros.format(amount);
}

export function formatPercent(fraction: number): string {
  return percent.format(fraction);
}

export function formatSigned(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`;
}
