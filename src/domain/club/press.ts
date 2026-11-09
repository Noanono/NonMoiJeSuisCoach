import type { PressArticle } from '../types';
import type { Rng } from '../core/rng';
import { clampGauge, type ClubOutlook, type FrasqueEvent, type FrasqueKind } from './model';

/**
 * Presse locale (FRAS-03, FRAS-04) : une frasque devient une une, et chaque une
 * fait bouger la confiance du président et l'humeur des sponsors.
 */

export const NEWSPAPER_NAME = "L'Écho de la Buvette";

/** Écart de buts à partir duquel une défaite fait la une. */
export const HUMILIATION_GOAL_MARGIN = 4;

interface ArticleTemplate {
  /** Titres possibles : {joueur}, {club}, {montant} et {score} sont remplacés. */
  headlines: readonly string[];
  presidentDelta: number;
  sponsorDelta: number;
  /** Probabilité que les sponsors adorent le scandale : leur humeur monte au lieu de baisser. */
  scandalAppeal: number;
}

const ARTICLE_TEMPLATES: Record<FrasqueKind, ArticleTemplate> = {
  fight: {
    headlines: [
      '{club} : {joueur} confond troisième mi-temps et troisième round',
      'Mêlée générale : le parking du stade transformé en octogone',
      '{joueur} règle ses comptes à coups de chaise pliante',
    ],
    presidentDelta: -6,
    sponsorDelta: -4,
    scandalAppeal: 0.3,
  },
  vomit: {
    headlines: [
      '{joueur} repeint la surface de réparation : le jardinier porte plainte',
      '{club} glisse sur un terrain « humide » : le bar-tabac est soupçonné',
      'Vomi en plein match : les adversaires refusent de défendre les corners',
    ],
    presidentDelta: -3,
    sponsorDelta: -3,
    scandalAppeal: 0.4,
  },
  streaker: {
    headlines: [
      'Un supporter nu traverse le terrain : il court plus vite que la défense de {club}',
      'Streaker au stade : « Il n’avait sur lui que l’écharpe du club », raconte un témoin',
      'Nudité sur la pelouse : {club} devra payer l’amende et le pressing',
    ],
    presidentDelta: -4,
    sponsorDelta: -2,
    scandalAppeal: 0.5,
  },
  maritalDrama: {
    headlines: [
      'Drame conjugal à {club} : la femme du président aperçue avec {joueur}',
      '{joueur} et la présidente : le vestiaire se tait, la buvette commente',
      'Le président de {club} dort au club-house depuis mardi',
    ],
    presidentDelta: -10,
    sponsorDelta: -2,
    scandalAppeal: 0.3,
  },
  fine: {
    headlines: [
      '{joueur} prend {montant} € d’amende : la caisse de la buvette applaudit',
      '{club} : le coach sort le carnet à souches, {montant} € pour {joueur}',
      'Discipline de fer à {club} : {joueur} paiera sa tournée au club',
    ],
    presidentDelta: 1,
    sponsorDelta: 0,
    scandalAppeal: 0,
  },
  fineRebellion: {
    headlines: [
      '{joueur} refuse son amende : « Je paierai quand le coach paiera sa tournée »',
      'Fronde à {club} : {joueur} conteste son amende devant toute la buvette',
      'Amende de {montant} € : {joueur} déchire le règlement intérieur au comptoir',
    ],
    presidentDelta: -4,
    sponsorDelta: -2,
    scandalAppeal: 0.2,
  },
  playerRant: {
    headlines: [
      '{joueur} vide son sac : « Ici, même la tireuse joue plus que moi »',
      'Malaise à {club} : {joueur} critique le coach sur la page Facebook du club',
      '{joueur} : « Le coach ? Il ne reconnaîtrait pas un ballon dans un sac de ballons »',
    ],
    presidentDelta: -4,
    sponsorDelta: -2,
    scandalAppeal: 0.1,
  },
  transferRequest: {
    headlines: [
      '{joueur} veut quitter {club} : « Même le Sporting de Mémé me ferait plus jouer »',
      'Divorce consommé entre {joueur} et {club}',
      '{joueur} fait ses valises et laisse ses crampons à la buvette',
    ],
    presidentDelta: -3,
    sponsorDelta: -1,
    scandalAppeal: 0,
  },
  bigNight: {
    headlines: [
      'Nuit agitée à {club} : le karaoké a fermé, pas les joueurs',
      'Soirée d’équipe : {joueur} retrouvé endormi dans le rond central',
      '{club} a vidé les fûts : la buvette commande en urgence',
    ],
    presidentDelta: -2,
    sponsorDelta: -2,
    scandalAppeal: 0.5,
  },
  humiliatingDefeat: {
    headlines: [
      'Naufrage : {club} s’incline {score}, le gardien réclame des cages plus petites',
      '{score} : {club} invente le football sans défense',
      'Humiliation {score} : les supporters de {club} demandent le remboursement de la saucisse',
    ],
    presidentDelta: -6,
    sponsorDelta: -5,
    scandalAppeal: 0,
  },
};

const DEFAULT_PLAYER_LABEL = 'un joueur';

export interface ArticleContext {
  week: number;
  season: number;
  clubName: string;
  rng: Rng;
}

function fillHeadline(template: string, event: FrasqueEvent, clubName: string): string {
  return template
    .replaceAll('{joueur}', event.playerName ?? DEFAULT_PLAYER_LABEL)
    .replaceAll('{club}', clubName)
    .replaceAll('{montant}', String(event.amount ?? 0))
    .replaceAll('{score}', event.score ?? '');
}

/** Rédige la une correspondant à une frasque (FRAS-03), avec son effet sur le club (FRAS-04). */
export function writeArticle(event: FrasqueEvent, context: ArticleContext): PressArticle {
  const template = ARTICLE_TEMPLATES[event.kind];
  const { rng } = context;
  const headline = fillHeadline(rng.pick(template.headlines), event, context.clubName);
  const sponsorsLoveIt = template.scandalAppeal > 0 && rng.chance(template.scandalAppeal);
  const sponsorDelta = sponsorsLoveIt ? Math.abs(template.sponsorDelta) : template.sponsorDelta;
  return {
    id: `press-${context.season}-${context.week}-${event.kind}-${event.playerId ?? 'club'}-${rng.int(0, 9_999)}`,
    week: context.week,
    season: context.season,
    headline,
    presidentDelta: template.presidentDelta,
    sponsorDelta,
  };
}

/** Applique l'effet d'un article sur la confiance du président et l'humeur des sponsors (FRAS-04). */
export function applyPressArticle(outlook: ClubOutlook, article: PressArticle): ClubOutlook {
  return {
    ...outlook,
    presidentConfidence: clampGauge(outlook.presidentConfidence + article.presidentDelta),
    sponsorMood: clampGauge(outlook.sponsorMood + article.sponsorDelta),
  };
}

/** Frasque « défaite humiliante » si l'écart atteint HUMILIATION_GOAL_MARGIN buts, sinon `null`. */
export function humiliationEvent(goalsFor: number, goalsAgainst: number): FrasqueEvent | null {
  if (goalsAgainst - goalsFor < HUMILIATION_GOAL_MARGIN) return null;
  return { kind: 'humiliatingDefeat', score: `${goalsFor}-${goalsAgainst}` };
}
