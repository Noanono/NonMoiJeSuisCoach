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
  /** false = capacité cachée (CAP-13). */
  revealed: boolean;
}

/** Ce que le joueur travaille à l'entraînement : un attribut, ou sa capacité spéciale. */
export type TrainingFocus = AttributeName | 'ability';

export interface PlayerTraining {
  focus: TrainingFocus;
  /** Fraction du prochain point d'attribut, de 0 à 1. */
  progress: number;
  /** Fraction du prochain point gagné hors programme (absente des anciennes sauvegardes). */
  passive?: number;
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
  /** Note au début de la saison : sert à afficher sa progression. */
  overallAtSeasonStart: number;
  training: PlayerTraining;
  /** 0 = frais, 100 = épuisé (EFF-04). */
  fatigue: number;
  /** Semaines d'indisponibilité restantes (EFF-05). */
  injuryWeeks: number;
  suspendedMatches: number;
  ability: AbilityProgress;
  /** Salaire hebdomadaire en euros. */
  salary: number;
  clubId: string | null;
  seasonStats: { matches: number; goals: number; assists: number; yellowCards: number; redCards: number };
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
  /** 11 places, dans l'ordre des postes de la formation (voir FORMATION_SLOTS) ; EMPTY_SLOT = poste libre. */
  starters: string[];
  /** Remplaçants : cinq changements en match (MATCH-08), et porteurs des capacités « Banc ». */
  bench: string[];
  instructions: Instructions;
}

// ---------------------------------------------------------------------------
// Capacités (CAP-01 à CAP-20, CAT-01)
// ---------------------------------------------------------------------------

export type Rarity = 'common' | 'rare' | 'legendary' | 'mythic';
export type AbilityPosition = Position | 'ANY' | 'BENCH';
/** Sert à l'IA pour choisir selon le score. */
export type AbilityCategory = 'attack' | 'defense' | 'sabotage' | 'support' | 'legendary';

/**
 * Qui choisit la cible (CAP-16 à CAP-18) :
 * - self : le porteur ; team / opponentTeam : toute une équipe ;
 * - zone : déclenchée à l'emplacement du porteur, le coach choisit le moment ;
 * - teammate / opponent : le coach choisit `count` cibles, une à une, match en pause ;
 * - randomOpponent : cible tirée au hasard.
 */
export type TargetKind = 'self' | 'team' | 'opponentTeam' | 'zone' | 'teammate' | 'opponent' | 'randomOpponent';

export interface Targeting {
  kind: TargetKind;
  count?: number;
  /** Limite les cibles à une ligne (« 1 attaquant », « 2 défenseurs »). */
  line?: Position;
  /** Seuls les joueurs au sol ou blessés sont des cibles (L'Éponge miracle, Le Kiné du dimanche). */
  downed?: boolean;
}

/** Sur qui s'applique un effet, une fois la cible résolue. */
export type Scope = 'self' | 'targets' | 'team' | 'opponents' | 'zoneOpponents';

/** Statistiques modifiables en match. `all` = toutes les stats de jeu. */
export type MatchStat = 'all' | 'speed' | 'technique' | 'physical' | 'shooting' | 'defense' | 'goalkeeping' | 'concentration';

/** Déclencheur d'une capacité liée à un événement (CAP-19). `ownDeadBall` = penalty ou coup de pied arrêté. */
export type AbilityTrigger =
  | 'anytime'
  | 'afterOwnGoal'
  | 'ownSetPiece'
  | 'opponentSetPiece'
  | 'ownPenalty'
  | 'opponentPenalty'
  | 'ownDeadBall'
  | 'halftime'
  /** Coup franc seulement (pas les corners) : CAP-19. */
  | 'ownFreeKick'
  | 'opponentFreeKick';

/**
 * Effets primitifs interprétés par le moteur de match. Tous restent dans le match :
 * aucune capacité ne touche au budget, à la confiance ou aux matchs suivants.
 * Les valeurs en pourcentage sont des fractions (0.2 = +20 %, -0.3 = −30 %).
 * Les durées sont en minutes de jeu.
 */
export type Effect =
  /** `extendOnGoal` : minutes ajoutées à l'effet à chaque but marqué par l'équipe. */
  | { type: 'modifier'; scope: Scope; stat: MatchStat; value: number; duration: number; extendOnGoal?: number }
  /** Modificateur calculé à l'activation : `base` + `perUnit` par but encaissé ou par minute jouée. */
  | { type: 'scaledModifier'; scope: Scope; stat: MatchStat; base: number; perUnit: number; per: 'concededGoal' | 'minute' | 'goalDeficit'; duration: number }
  /** Joueur(s) hors jeu. `chaseDuration` : la mise hors jeu passe ensuite à un autre adversaire. */
  | { type: 'knockout'; scope: Scope; duration: number; chaseDuration?: number }
  /** Relève immédiatement un joueur au sol. */
  | { type: 'revive'; scope: Scope }
  /** Annule les prochaines actions adverses (une par défaut). */
  | { type: 'cancelAction'; count?: number }
  /** Bonus sur la prochaine occasion. `carrier` : le porteur la tente et sa recharge repart à zéro s'il marque. */
  | { type: 'chanceBoost'; value: number; carrier?: boolean }
  /** Crée tout de suite une occasion pour le porteur, avec cette probabilité de but. */
  | { type: 'instantChance'; chance: number }
  /** Malus sur les prochains tirs adverses. */
  | { type: 'opponentChanceMalus'; value: number; shots: number }
  /** Efface une fraction de la fatigue, pour ce match seulement. */
  | { type: 'energy'; scope: Scope; value: number }
  /** Annule un but adverse marqué dans les `withinMinutes` dernières minutes. */
  | { type: 'cancelGoal'; withinMinutes: number }
  | { type: 'gauge'; value: number }
  | { type: 'stealGauge'; value: number }
  /** Points de jauge gagnés si l'équipe n'encaisse rien pendant `duration`. */
  | { type: 'cleanSheetGauge'; value: number; duration: number }
  /** Retire les malus de l'équipe ; `bonusGauge` points si au moins `threshold` malus sont retirés. */
  | { type: 'clearMaluses'; bonusGauge: number; threshold: number; scope?: 'targets'; perMalus?: number; perMalusDuration?: number }
  /** Soins : le joueur visé reste au sol `minutes` de plus (contrepartie d'un pari raté). */
  | { type: 'prolongDown'; scope: Scope; minutes: number }
  /** Soins : les joueurs visés ne peuvent pas être mis au sol pendant `duration`. */
  | { type: 'steady'; scope: Scope; duration: number }
  /** Soins : jusqu'à la fin du match, un joueur au sol se relève après `reviveAfter` minutes et les malus adverses durent `malusFactor` fois leur durée. */
  | { type: 'fieldDoctor'; reviveAfter: number; malusFactor: number }
  /** Inverse les niveaux des deux équipes. */
  | { type: 'swapTeams'; duration: number }
  /** Le meilleur joueur de champ adverse rejoint l'équipe jusqu'à la fin du match. */
  | { type: 'poachBest' }
  /** Chaque but de l'équipe compte double. */
  | { type: 'doubleGoals'; duration: number }
  /** Exclus et blessés reviennent, toute l'équipe repart à 100 % d'énergie. */
  | { type: 'miracle' }
  /** Bonus sur le coup de pied arrêté en cours, seulement s'il est joué de cette façon (tir direct ou centre). */
  | { type: 'setPieceBoost'; option: 'shot' | 'cross'; value: number }
  /** Le ballon du coup franc avance d'un cran (lointain → moyen → proche). */
  | { type: 'moveBallCloser' }
  /** Le coup de pied arrêté adverse est annulé. */
  | { type: 'cancelSetPiece' }
  /** Les `count` prochains penalties adverses marqués sont à retirer. */
  | { type: 'retakePenalty'; count: number }
  /** Le coup franc en cours devient un penalty. */
  | { type: 'turnIntoPenalty' }
  /** Marquage (M1) : malus sur les cibles tant que le porteur est sur le terrain et debout. */
  | { type: 'mark'; stat: MatchStat; value: number; duration: number }
  /** Pari (M4) : `success` avec cette probabilité, `failure` sinon. */
  | { type: 'gamble'; chance: number; success: Effect[]; failure: Effect[] }
  /** Carton pour le porteur (contrepartie d'un pari). */
  | { type: 'bookSelf'; card: 'yellow' | 'red' }
  /** Penalty tout de suite pour l'équipe. */
  | { type: 'awardPenalty' }
  /** Occasion tout de suite pour l'adversaire, avec cette probabilité de but (contrepartie). */
  | { type: 'opponentChance'; chance: number }
  /** Chrono (M5) : minutes mortes, sans occasion ni faute pour personne. */
  | { type: 'deadMinutes'; duration: number }
  /** Chrono (M5) : minutes ajoutées au temps additionnel de la fin du match. */
  | { type: 'addedTime'; minutes: number }
  /** Chrono (M5) : les buts des `minutes` dernières minutes sont effacés, des deux côtés. */
  | { type: 'rewind'; minutes: number }
  /** Bouclier (M7) : absorbe les `charges` prochaines capacités hostiles adverses. */
  | { type: 'shield'; scope: Scope; charges: number; duration: number }
  /** Copie (M9) : rejoue la dernière capacité « à tout moment » de l'adversaire. */
  | { type: 'copyLast' }
  /** Énergie (M11) : fatigue en plus, pour ce match seulement. */
  | { type: 'drain'; scope: Scope; value: number }
  /** Surcharge (M13) : vide la jauge restante, +`perPoint` par point dépensé. */
  | { type: 'overcharge'; scope: Scope; stat: MatchStat; perPoint: number; duration: number };

/** Situation de match qui rend une capacité disponible (M12). */
export interface AbilityCondition {
  score?: 'behind' | 'ahead' | 'level' | 'notAhead';
  /** À partir de cette minute de jeu. */
  fromMinute?: number;
}

export interface AbilityStats {
  effects: Effect[];
  targeting: Targeting;
  /** Coût en points de Jauge de Gueulante (CAP-05). */
  cost: number;
  /** Minutes de recharge, 0 = aucune. */
  cooldown: number;
}

export interface Ability {
  id: string;
  name: string;
  rarity: Rarity;
  category: AbilityCategory;
  position: AbilityPosition;
  targeting: Targeting;
  trigger: AbilityTrigger;
  /** Disponible seulement si un but adverse date de moins de tant de minutes. */
  requiresRecentOpponentGoal?: number;
  /** Coût en Gueulante propre à la capacité (1 à 7) ; à défaut, celui de sa rareté. */
  cost?: number;
  /** Réglage de la montée en niveau : 1 = gain normal par niveau, 0 = seul le bonus du niveau 5 compte. */
  levelGain?: number;
  /** Bonus d'équipe ajouté à chaque niveau au-delà du premier (part de toutes les stats, 10 min). */
  levelBoost?: number;
  /** Durée maximale des effets, en minutes, quel que soit le niveau. */
  maxDuration?: number;
  /** Disponible seulement dans cette situation (M12). */
  condition?: AbilityCondition;
  /** Texte humoristique, sans chiffres : les chiffres dépendent du niveau et sont calculés. */
  description: string;
  /** Effets au niveau 1. */
  effects: Effect[];
  /** Capacité cachée jusqu'à l'arrivée au club ou la première activation (CAP-13). */
  hidden: boolean;
  /** Les niveaux renforcent l'effet sans allonger sa durée (Le Béton armé, Le Car à deux étages). */
  fixedDuration?: boolean;
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
  /** Niveau des installations (CLUB-09), 0 si absent. */
  facilities?: Facilities;
}

export type FacilityId = 'buvette' | 'tribunes' | 'vestiaires' | 'entrainement' | 'formation' | 'scouts';
export type Facilities = Record<FacilityId, number>;

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
  /** `playoff` : barrage d'accession de fin de saison. */
  competition: 'league' | 'cup' | 'playoff';
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
  scorers: { playerId: string; clubId: string; minute: number; assistId?: string }[];
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
