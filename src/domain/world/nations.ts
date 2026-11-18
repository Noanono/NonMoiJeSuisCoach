/**
 * Équipes étrangères (UNIV-10) : quatre nations caricaturées avec tendresse, qui viennent jouer un match
 * amical par saison. Chacune a ses noms, ses couleurs, son style de jeu et deux capacités typiques
 * (rareté Étrangère). Leurs joueurs ne vivent que le temps du match, sauf le jeune offert après une victoire.
 */
import type { AiStyle } from '../club/aiStyle';

export type NationId = 'cn' | 'dz' | 'sn' | 'br';

export interface Nation {
  id: NationId;
  country: string;
  clubName: string;
  shortName: string;
  /** Maillot, liseré, fond de vignette. */
  colors: readonly [string, string, string];
  style: AiStyle;
  /** Ce que la presse locale dit d'eux avant le match. */
  motto: string;
  firstNames: readonly string[];
  /** Vide : un seul nom, comme les stars. */
  lastNames: readonly string[];
  abilityIds: readonly [string, string];
}

export const NATIONS: Record<NationId, Nation> = {
  cn: {
    id: 'cn',
    country: 'Chine',
    clubName: 'Grande Muraille FC',
    shortName: 'GMF',
    colors: ['#c8201f', '#f6d743', '#f7d9d2'],
    style: 'bus',
    motto: 'Un milliard et demi d’habitants : le banc de touche fait trois kilomètres, et le kiné a été formé au ping-pong.',
    firstNames: ['Wang', 'Zhang', 'Li', 'Chen', 'Liu', 'Zhao', 'Huang', 'Wu', 'Zhou', 'Sun', 'Xu', 'Ma'],
    lastNames: ['Lei', 'Wei', 'Hao', 'Bo', 'Yang', 'Jun', 'Tao', 'Gang', 'Ming', 'Fei', 'Peng', 'Long'],
    abilityIds: ['la-grande-muraille', 'made-in-china'],
  },
  dz: {
    id: 'dz',
    country: 'Algérie',
    clubName: 'Les Fennecs de la Casbah',
    shortName: 'FDC',
    colors: ['#fbfaf2', '#1e7a3c', '#d6ecd4'],
    style: 'cunning',
    motto: 'Le couscous de la mi-temps est préparé par la mère du capitaine. Personne n’ose perdre, personne n’ose resservir sans demander.',
    firstNames: ['Yacine', 'Riyad', 'Mehdi', 'Sofiane', 'Karim', 'Nassim', 'Walid', 'Amine', 'Bilal', 'Farid', 'Hichem', 'Rachid'],
    lastNames: ['Belkacem', 'Benali', 'Bouzid', 'Haddad', 'Meziane', 'Rahmani', 'Cherif', 'Saadi', 'Hamidi', 'Zerrouki', 'Boudjema', 'Larbi'],
    abilityIds: ['le-the-a-la-menthe', 'le-sirocco'],
  },
  sn: {
    id: 'sn',
    country: 'Sénégal',
    clubName: 'Les Lions de la Teranga',
    shortName: 'LDT',
    colors: ['#1e7a3c', '#f6d743', '#d6ecd4'],
    style: 'pressing',
    motto: 'La Teranga, c’est l’hospitalité : ils t’accueillent avec le thiéboudienne, le thé et le sourire. Ensuite, ils te battent.',
    firstNames: ['Moussa', 'Cheikh', 'Ibrahima', 'Pape', 'Lamine', 'Mamadou', 'Abdoulaye', 'Ousmane', 'Babacar', 'Saliou', 'Modou', 'Aliou'],
    lastNames: ['Diop', 'Ndiaye', 'Sarr', 'Faye', 'Diallo', 'Sow', 'Gueye', 'Fall', 'Mbaye', 'Ndour', 'Seck', 'Cissé'],
    abilityIds: ['la-lutte-senegalaise', 'la-teranga'],
  },
  br: {
    id: 'br',
    country: 'Brésil',
    clubName: 'Samba Caipirinha FC',
    shortName: 'SCF',
    colors: ['#f6d743', '#1e7a3c', '#fbf3c7'],
    style: 'attack',
    motto: 'Ici, aucune passe ne part sans un petit pas de samba. L’entraîneur a demandé une défense : on lui a répondu par un carnaval.',
    firstNames: ['Feijãozinho', 'Caipirão', 'Pastelzinho', 'Brigadeiro', 'Churrasquinho', 'Açaízinho', 'Farofinha', 'Coxinha', 'Guaranazinho', 'Pãozinho', 'Pudinzinho', 'Tapioquinha'],
    lastNames: [],
    abilityIds: ['le-jogo-bonito', 'le-carnaval'],
  },
};

export const NATION_IDS = Object.keys(NATIONS) as NationId[];

/** Identifiant de club d'une équipe étrangère : elle n'est inscrite dans aucune division. */
export function foreignClubId(nation: NationId): string {
  return `foreign-${nation}`;
}

export function nationOfClub(clubId: string | null | undefined): Nation | null {
  if (!clubId?.startsWith('foreign-')) return null;
  return NATIONS[clubId.slice('foreign-'.length) as NationId] ?? null;
}
