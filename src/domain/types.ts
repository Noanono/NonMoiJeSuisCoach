/**
 * Contrat partagé du domaine. Tout le jeu est de la donnée sérialisable (JSON)
 * pour la sauvegarde locale (TECH-03). Aucune dépendance au DOM ici.
 */

// ---------------------------------------------------------------------------
// Joueurs (EFF-01 à EFF-08)
// ---------------------------------------------------------------------------

export type Position = 'GK' | 'DEF' | 'MID' | 'ATT';

export type AttributeName = 'speed' | 'technique' | 'physical' | 'shooting' | 'defense' | 'goalkeeping';

/** Attributs de 1 à 99. */
export type Attributes = Record<AttributeName, number>;

export interface AbilityProgress {
  abilityId: string;
  /** 1 à 5 (CAP-10). */
  level: number;
  xp: number;
  /** false = capacité cachée (CAP-13, FRAS-05). */
  revealed: boolean;
  /** Utilisations consommées cette saison (capacités légendaires, CAP-12). */
  seasonUses: number;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: Position;
  attributes: Attributes;
  /** Note globale maximale atteignable (jeunes du centre de formation, CLUB-07). */
  potential: number;
  /** 0 = frais, 100 = épuisé (EFF-04). */
  fatigue: number;
  /** 0 = au fond du trou, 100 = euphorique (EFF-06). */
  morale: number;
  /** Semaines d'indisponibilité restantes (EFF-05). */
  injuryWeeks: number;
  suspendedMatches: number;
  ability: AbilityProgress;
  /** Salaire hebdomadaire en euros. */
  salary: number;
  clubId: string | null;
  /** Le joueur a demandé son transfert (EFF-07). */
  transferRequested: boolean;
  seasonStats: { matches: number; goals: number; yellowCards: number; redCards: number };
}

// ---------------------------------------------------------------------------
// Tactique (EFF-03, MATCH-05)
// ---------------------------------------------------------------------------

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '5-3-2' | '4-5-1';
export type Mentality = 'defensive' | 'balanced' | 'offensive';

export interface Instructions {
  mentality: Mentality;
  highPress: boolean;
  longBall: boolean;
}

export interface Lineup {
  formation: Formation;
  /** 11 identifiants, dans l'ordre des postes de la formation (voir FORMATION_SLOTS). */
  starters: string[];
  /** Remplaçants (aucun changement en match en V1, MATCH-08) : utiles pour les capacités « Banc ». */
  bench: string[];
  instructions: Instructions;
}

// ---------------------------------------------------------------------------
// Capacités (CAP-01 à CAP-20, CAT-01)
// ---------------------------------------------------------------------------

export type Rarity = 'common' | 'rare' | 'legendary';
export type AbilityPosition = Position | 'ANY' | 'BENCH';
export type AbilityCategory =
  | 'sabotage'
  | 'provoc'
  | 'attack'
  | 'defense'
  | 'support'
  | 'goalkeeper'
  | 'chaos'
  | 'legendary';

/**
 * Qui choisit la cible (CAP-16 à CAP-18) :
 * - self : le porteur ; team / opponentTeam : toute une équipe ;
 * - zone : déclenchée à l'emplacement du porteur, le coach choisit le moment ;
 * - teammate / opponent : le coach choisit `count` cibles, une à une, match en pause ;
 * - randomOpponent : cible tirée au hasard (« au hasard » dans le catalogue).
 */
export type TargetKind = 'self' | 'team' | 'opponentTeam' | 'zone' | 'teammate' | 'opponent' | 'randomOpponent';

/** Portée d'une cible (CAP-17) : vis-à-vis = même ligne adverse, near = « 5 m » = ligne voisine. */
export type Range = 'facing' | 'near' | 'any';

export interface Targeting {
  kind: TargetKind;
  count?: number;
  range?: Range;
}

/** Sur qui s'applique un effet, une fois la cible résolue. */
export type Scope =
  | 'self'
  | 'targets'
  | 'team'
  | 'opponents'
  | 'zoneAll'
  | 'zoneOpponents'
  | 'opponentKeeper'
  | 'ownKeeper'
  | 'opponentCaptain';

/** Statistiques modifiables en match. `all` = toutes les stats de jeu. */
export type MatchStat =
  | 'all'
  | 'speed'
  | 'technique'
  | 'physical'
  | 'shooting'
  | 'defense'
  | 'goalkeeping'
  | 'concentration'
  | 'aggression';

/** Déclencheur d'une capacité liée à un événement (CAP-19). */
export type AbilityTrigger =
  | 'anytime'
  | 'afterOwnGoal'
  | 'ownSetPiece'
  | 'opponentSetPiece'
  | 'ownPenalty'
  | 'opponentPenalty'
  | 'halftime';

export type Cooldown =
  | { kind: 'minutes'; value: number }
  | { kind: 'perMatch'; uses: number }
  | { kind: 'perSeason'; uses: number }
  | { kind: 'perEvent' };

/**
 * Effets primitifs interprétés par le moteur de match.
 * Les valeurs en pourcentage sont des fractions (0.2 = +20 %, -0.3 = −30 %).
 * Les durées sont en minutes de jeu.
 */
export type Effect =
  | { type: 'modifier'; scope: Scope; stat: MatchStat; value: number; duration: number }
  /** Joueur(s) hors jeu (au sol, aux toilettes, poursuivis par un chien…). */
  | { type: 'knockout'; scope: Scope; duration: number; chance?: number }
  /** Annule l'action adverse en cours ou la prochaine. */
  | { type: 'cancelAction' }
  /** Bonus de conversion sur la prochaine occasion de l'équipe (ou d'un type précis). */
  | { type: 'chanceBoost'; value: number; on: 'nextChance' | 'setPiece' | 'penalty' | 'counter' | 'longShot' }
  /** Malus sur la prochaine occasion adverse. */
  | { type: 'opponentChanceMalus'; value: number; shots: number }
  | { type: 'penaltyAwarded'; chance: number }
  | { type: 'ownGoal'; chance: number }
  | { type: 'card'; scope: Scope; card: 'yellow' | 'red'; chance: number }
  /** Le match se fige : moins d'occasions des deux côtés. */
  | { type: 'freeze'; duration: number }
  | { type: 'stoppageTime'; minutes: number }
  /** Récupère de l'énergie (fraction de la fatigue effacée). */
  | { type: 'energy'; scope: Scope; value: number }
  | { type: 'morale'; scope: Scope; value: number }
  /** Annule un but adverse marqué dans les `withinMinutes` dernières minutes. */
  | { type: 'cancelGoal'; withinMinutes: number }
  | { type: 'noCards'; duration: number }
  | { type: 'foulsIgnored'; count: number }
  | { type: 'emptyNet'; duration: number }
  | { type: 'extraAttacker'; duration: number }
  /** Annule les baisses de moral en cours de l'équipe. */
  | { type: 'clearMoraleMaluses' }
  /** Annule l'avantage du terrain adverse. */
  | { type: 'cancelHomeAdvantage'; duration: number }
  // --- Conséquences hors match (appliquées par la boucle de saison) ---
  | { type: 'fine'; amount: number }
  | { type: 'budget'; amount: number }
  | { type: 'presidentConfidence'; value: number }
  | { type: 'injury'; scope: Scope; weeks: number }
  | { type: 'suspension'; scope: Scope; matches: number }
  /** Forme du lendemain : fatigue ajoutée à tout l'effectif (−30 % de forme = +30 de fatigue). */
  | { type: 'squadFatigue'; value: number }
  | { type: 'press'; headline: string };

export interface Risk {
  /** Probabilité 0..1, affichée au coach avant l'activation (CAP-07). */
  chance: number;
  label: string;
  effects: Effect[];
}

export interface AbilityStats {
  /** Probabilité que l'effet principal réussisse (1 = certain). */
  successChance: number;
  effects: Effect[];
  risks: Risk[];
  cooldown: Cooldown;
  /** Coût en points de Jauge de Gueulante (CAP-05). */
  cost: number;
}

export interface Ability {
  id: string;
  name: string;
  rarity: Rarity;
  category: AbilityCategory;
  position: AbilityPosition;
  targeting: Targeting;
  trigger: AbilityTrigger;
  /** Conditions d'activation éventuelles. */
  condition?: { minMinute?: number; whenLeading?: boolean };
  /** Texte d'effet humoristique, tel qu'affiché sur la fiche joueur. */
  description: string;
  /** Texte du malus / risque. */
  downside: string;
  /** Texte du bonus de niveau 5 (CAP-11). */
  level5Text: string;
  /** Statistiques au niveau 1. */
  base: AbilityStats;
  /** Surcharge appliquée au niveau 5 (CAP-11). */
  level5: Partial<AbilityStats>;
  /** Mots-clés de contexte (CAP-14, FRAS-01) : 'alcohol' = +50 % après une grosse soirée. */
  tags: ('alcohol' | 'vice' | 'family')[];
  /** Capacité cachée jusqu'à l'arrivée au club ou la première activation (CAP-13). */
  hidden: boolean;
}

export interface Combo {
  id: string;
  name: string;
  abilityIds: [string, string];
  description: string;
  downside: string;
  effects: Effect[];
  /** Revers appliqués avec certitude ou selon leur probabilité. */
  risks: Risk[];
}

// ---------------------------------------------------------------------------
// Club, monde et compétitions (CLUB-*, UNIV-*)
// ---------------------------------------------------------------------------

export interface Club {
  id: string;
  name: string;
  shortName: string;
  divisionId: string;
  /** 1 à 100 : niveau général, sert à générer l'effectif et à piloter l'IA. */
  reputation: number;
  budget: number;
  playerIds: string[];
  lineup: Lineup | null;
  isHuman: boolean;
  /** Ambiance du stade : avantage du terrain. */
  stadium: string;
}

export interface Division {
  id: string;
  name: string;
  /** 1 = élite, plus grand = plus bas (district). */
  tier: number;
  clubIds: string[];
  promoted: number;
  relegated: number;
}

export interface Fixture {
  id: string;
  competition: 'league' | 'cup';
  divisionId: string | null;
  /** Journée (championnat) ou tour (coupe). */
  round: number;
  /** Semaine de la saison où se joue le match. */
  week: number;
  homeId: string;
  awayId: string;
  result: MatchResult | null;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  /** Vainqueur aux tirs au but en coupe si égalité. */
  penaltyWinnerId?: string;
  scorers: { playerId: string; clubId: string; minute: number }[];
}

export interface StandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

// ---------------------------------------------------------------------------
// Gestion des frasques (FRAS-*)
// ---------------------------------------------------------------------------

export type HouseRule = 'curfew' | 'noAlcoholEve' | 'barClosedToPlayers' | 'noGirlfriendsInStands';
export type TeamNight = 'none' | 'lightDrinks' | 'bigNight';

export interface PressArticle {
  id: string;
  week: number;
  season: number;
  headline: string;
  /** Effet sur la confiance du président et les sponsors (FRAS-04). */
  presidentDelta: number;
  sponsorDelta: number;
}
