import type { Club, Facilities, FacilityId } from '../types';

/**
 * Installations du club (CLUB-09) : six bâtiments à améliorer avec le budget, cinq niveaux chacun.
 * Chaque niveau rapporte un bonus chiffré ; aucun entretien à payer.
 */

export const MAX_FACILITY_LEVEL = 5;
export const FACILITY_IDS: readonly FacilityId[] = ['buvette', 'tribunes', 'vestiaires', 'entrainement', 'formation', 'scouts'];
export const NO_FACILITIES: Facilities = { buvette: 0, tribunes: 0, vestiaires: 0, entrainement: 0, formation: 0, scouts: 0 };

/** Prix du premier niveau ; chaque niveau suivant coûte deux fois plus. */
const BASE_COST = 10_000;
const COST_GROWTH = 2;

/** Bonus par niveau. */
const BUVETTE_PER_LEVEL = 0.25;
const SPONSOR_PER_LEVEL = 0.1;
const HOME_ADVANTAGE_BASE = 1.1;
const HOME_ADVANTAGE_PER_LEVEL = 0.03;
const RECOVERY_PER_LEVEL = 5;
const TRAINING_PER_LEVEL = 0.2;
const YOUTH_RATING_PER_LEVEL = 3;
const YOUTH_POTENTIAL_PER_LEVEL = 5;
/** Cellule de scouts (CLUB-10) : rapports par semaine et part des joueurs découverts d'office (5 à 55 %). */
const SCOUT_REPORTS_BASE = 2;
const SCOUT_REPORTS_PER_LEVEL = 2;
const SCOUT_AUTO_BASE = 0.05;
const SCOUT_AUTO_PER_LEVEL = 0.1;

export interface FacilityInfo {
  label: string;
  description: string;
  /** Effet à un niveau donné, en clair. */
  effect: (level: number) => string;
}

const percent = (value: number) => `+${Math.round(value * 100)} %`;

export const FACILITIES: Record<FacilityId, FacilityInfo> = {
  buvette: {
    label: 'Buvette',
    description: 'Une vraie tireuse, des frites et un écran pour les matchs à l’extérieur.',
    effect: (level) => `${percent(level * BUVETTE_PER_LEVEL)} de recettes de buvette`,
  },
  tribunes: {
    label: 'Tribunes',
    description: 'Des sièges, un toit, et des supporters qui entendent mieux le coach adverse se faire chambrer.',
    effect: (level) => `${percent(level * SPONSOR_PER_LEVEL)} de sponsors, avantage du terrain ${percent(level * HOME_ADVANTAGE_PER_LEVEL)}`,
  },
  vestiaires: {
    label: 'Vestiaires',
    description: 'L’eau chaude, enfin. Et un bain froid qui ne sert pas aussi de glacière.',
    effect: (level) => `+${level * RECOVERY_PER_LEVEL} de récupération de fatigue par semaine`,
  },
  entrainement: {
    label: 'Centre d’entraînement',
    description: 'Des plots neufs, des filets sans trous et un terrain sans taupes.',
    effect: (level) => `${percent(level * TRAINING_PER_LEVEL)} de vitesse de progression à l’entraînement`,
  },
  scouts: {
    label: 'Cellule de scouts',
    description: 'Des bénévoles en K-way qui notent tout dans un carnet à spirale, au bord de tous les terrains du département.',
    effect: (level) => {
      const scouting = facilityBonus.scouting({ ...NO_FACILITIES, scouts: level });
      return `${scouting.weeklyReports} rapports par semaine, ${Math.round(scouting.autoShare * 100)} % des joueurs connus d'office`;
    },
  },
  formation: {
    label: 'Centre de formation',
    description: 'Chaque été, un jeune du club est promu en équipe première.',
    effect: (level) => `Jeune promu : +${level * YOUTH_RATING_PER_LEVEL} de note, +${level * YOUTH_POTENTIAL_PER_LEVEL} de potentiel`,
  },
};

export function facilitiesOf(club: Club): Facilities {
  return { ...NO_FACILITIES, ...club.facilities };
}

/** Prix du prochain niveau, `null` au niveau maximum. */
export function upgradeCost(level: number): number | null {
  return level >= MAX_FACILITY_LEVEL ? null : Math.round(BASE_COST * COST_GROWTH ** level);
}

export const facilityBonus = {
  buvetteIncome: (facilities: Facilities) => 1 + facilities.buvette * BUVETTE_PER_LEVEL,
  sponsorIncome: (facilities: Facilities) => 1 + facilities.tribunes * SPONSOR_PER_LEVEL,
  homeAdvantage: (facilities: Facilities) => HOME_ADVANTAGE_BASE + facilities.tribunes * HOME_ADVANTAGE_PER_LEVEL,
  extraRecovery: (facilities: Facilities) => facilities.vestiaires * RECOVERY_PER_LEVEL,
  trainingRate: (facilities: Facilities) => 1 + facilities.entrainement * TRAINING_PER_LEVEL,
  youth: (facilities: Facilities) => ({ rating: facilities.formation * YOUTH_RATING_PER_LEVEL, potential: facilities.formation * YOUTH_POTENTIAL_PER_LEVEL }),
  scouting: (facilities: Facilities) => ({
    weeklyReports: SCOUT_REPORTS_BASE + facilities.scouts * SCOUT_REPORTS_PER_LEVEL,
    autoShare: SCOUT_AUTO_BASE + facilities.scouts * SCOUT_AUTO_PER_LEVEL,
  }),
};
