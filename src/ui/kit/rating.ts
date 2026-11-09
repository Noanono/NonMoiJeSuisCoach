/** Couleur d'une note : rouge près de 0, orange puis jaune au milieu, vert près de 100. */
const MAX_HUE = 120;
const DARK_TEXT_FROM_HUE = 32;
const DARK_TEXT_UNTIL_HUE = 100;
const MAX_RATING = 100;

export function ratingColors(rating: number): { background: string; color: string } {
  const hue = Math.round((Math.max(0, Math.min(rating, MAX_RATING)) / MAX_RATING) * MAX_HUE);
  const darkText = hue >= DARK_TEXT_FROM_HUE && hue <= DARK_TEXT_UNTIL_HUE;
  return { background: `hsl(${hue} 85% 48%)`, color: darkText ? '#14130f' : '#fbfaf2' };
}
