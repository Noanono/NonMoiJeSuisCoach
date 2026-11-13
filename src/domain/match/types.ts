/**
 * Types du moteur de match. L'état est un objet JSON simple, muté en place
 * par le moteur (pas de copie à chaque minute) et sauvegardable tel quel.
 */
import type {
  Ability,
  AbilityCategory,
  AbilityPosition,
  AbilityTrigger,
  Effect,
  Formation,
  Instructions,
  MatchStat,
  Player,
  Position,
  Rarity,
  TargetKind,
  Targeting,
} from '../types';

export type Side = 'home' | 'away';

// ---------------------------------------------------------------------------
// Entrées
// ---------------------------------------------------------------------------

export interface TeamSheet {
  clubId: string;
  name: string;
  /** 11 titulaires, dans l'ordre de FORMATION_SLOTS. */
  starters: Player[];
  bench: Player[];
  formation: Formation;
  instructions: Instructions;
  captainId: string;
  isHuman: boolean;
}

export interface MatchOptions {
  home: TeamSheet;
  away: TeamSheet;
  seed: number;
  /** Multiplicateur d'occasions à domicile (tribunes, CLUB-09) ; 1,1 par défaut. */
  homeAdvantage?: number;
  /** Bonus ou malus de toutes les stats d'un camp (difficulté, UNIV-07). */
  boosts?: Partial<Record<Side, number>>;
  /** Match contre le rival de la saison (UNIV-09). */
  derby?: boolean;
  /** Match de coupe : tirs au but en cas d'égalité (UNIV-06). */
  knockout?: boolean;
  /** Source des capacités, `getAbility` par défaut. */
  lookupAbility?: (id: string) => Ability;
}

// ---------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------

export type MatchStatus = 'firstHalf' | 'halftime' | 'secondHalf' | 'finished';

/** Statistique touchée par un effet actif : stats de jeu, mise hors jeu ou niveaux inversés. */
export type ActiveStat = MatchStat | 'knockout' | 'swap';

/** Effet actif visible sur un joueur, avec son compte à rebours (CAP-09). */
export interface ActiveEffect {
  label: string;
  stat: ActiveStat;
  /** Valeur signée : positive = bonus (vert), négative = malus (rouge). */
  value: number;
  /** Dernière minute écoulée (`elapsed`) où l'effet joue : compte à rebours = endsAt − elapsed. */
  endsAt: number;
  /** Minutes ajoutées à chaque but marqué par l'équipe du joueur. */
  extendOnGoal?: number;
  /** Compté dans le jeu mais non affiché (bonus d'entraînement). */
  quiet?: boolean;
}

/** Capacité prête à l'emploi : niveau déjà appliqué à la création du match. */
export interface PreparedAbility {
  id: string;
  name: string;
  rarity: Rarity;
  category: AbilityCategory;
  position: AbilityPosition;
  targeting: Targeting;
  trigger: AbilityTrigger;
  requiresRecentOpponentGoal: number | null;
  description: string;
  hidden: boolean;
  cost: number;
  cooldown: number;
  effects: Effect[];
}

export interface MatchPlayer {
  id: string;
  name: string;
  side: Side;
  /** Ligne occupée sur le terrain, `null` pour un remplaçant. */
  line: Position | null;
  /** Copie du joueur : la fatigue évolue pendant le match sans toucher l'original. */
  profile: Player;
  /** Note effective en cache (poste, fatigue), rafraîchie périodiquement. */
  rating: number;
  yellowCards: number;
  sentOff: boolean;
  injured: boolean;
  /** Hors jeu (au sol, aux toilettes…) jusqu'à cette minute écoulée incluse. */
  knockedOutUntil: number;
  effects: ActiveEffect[];
  ability: PreparedAbility | null;
  abilityRevealed: boolean;
  cooldownUntil: number;
  /** Fatigue effacée par les capacités : elle revient après le match, qui n'a pas de suite. */
  fatigueRestored: number;
  goals: number;
  assists: number;
  /** A joué ne serait-ce qu'une minute. */
  hasPlayed: boolean;
  /** Remplacé : il ne reviendra pas. */
  subbedOff: boolean;
  /** Sa capacité a servi dans ce match : une mythique ne sert qu'une fois. */
  usedAbility: boolean;
}

export type ChanceKind = 'open' | 'counter' | 'longShot' | 'setPiece' | 'penalty';

export interface ChanceBoost {
  value: number;
  /** Ce joueur tente l'occasion ; s'il marque, sa recharge repart à zéro. */
  shooterId?: string;
}

export interface ShotMalus {
  value: number;
  shotsLeft: number;
}

/** Suites d'un effet, résolues quand le moment arrive. */
export type DelayedEffect =
  | { kind: 'cleanSheet'; at: number; points: number; conceded: number; label: string }
  | { kind: 'chase'; at: number; duration: number; excludedId: string; label: string };

/** Ce qui reste du match pour la suite de la saison. */
export type Consequence =
  | { type: 'injury'; playerId: string; weeks: number; reason: string }
  | { type: 'suspension'; playerId: string; matches: number; reason: string }
  /** Capacité cachée révélée à sa première activation (CAP-13). */
  | { type: 'abilityRevealed'; playerId: string; abilityId: string };

export interface TeamState {
  side: Side;
  clubId: string;
  name: string;
  formation: Formation;
  instructions: Instructions;
  isHuman: boolean;
  captainId: string;
  /** Titulaires (11, ordre de la formation) puis remplaçants. */
  players: MatchPlayer[];
  goals: number;
  /** Jauge de Gueulante (CAP-05). */
  gauge: number;
  chanceBoosts: ChanceBoost[];
  /** Malus infligés aux prochains tirs adverses. */
  shotMaluses: ShotMalus[];
  /** Prochaines actions adverses à annuler. */
  pendingCancels: number;
  /** Bonus réservés au coup de pied arrêté en cours (perdus s'il est joué autrement). */
  setPieceBoosts: { option: 'shot' | 'cross'; value: number }[];
  /** Penalties adverses marqués à faire retirer. */
  retakePenalties: number;
  /** Une capacité d'occasion a déjà servi sur le penalty ou le coup de pied arrêté en cours. */
  occasionAbilityUsed: boolean;
  delayed: DelayedEffect[];
  substitutionsUsed: number;
  /** Les buts de l'équipe comptent double jusqu'à cette minute écoulée incluse. */
  doubleGoalsUntil: number;
  consequences: Consequence[];
}

export interface GoalRecord {
  side: Side;
  playerId: string;
  minute: number;
  addedMinute: number;
  elapsed: number;
  penalty: boolean;
  /** Nombre de buts que vaut celui-ci : 2 pendant Le But en or massif. */
  value: number;
  /** Annulé par une capacité (coupure de courant…). */
  cancelled: boolean;
  /** Passeur décisif, s'il y en a un. */
  assistId?: string;
}

export interface CardRecord {
  side: Side;
  playerId: string;
  minute: number;
  card: 'yellow' | 'red';
  /** Rouge consécutif à un second jaune. */
  secondYellow: boolean;
}

export interface InjuryRecord {
  side: Side;
  playerId: string;
  minute: number;
  /** 0 = rien de grave, il sera là la semaine prochaine. */
  weeks: number;
}

/** Texte qui s'envole au-dessus d'un joueur quand la capacité le touche. */
export interface FloatingText {
  playerId: string;
  text: string;
  tone: 'bonus' | 'malus';
}

export interface ActivationRecord {
  id: number;
  side: Side;
  playerId: string;
  abilityId: string;
  abilityName: string;
  rarity: Rarity;
  minute: number;
  elapsed: number;
  byAi: boolean;
  targetIds: string[];
  /** Capacité de zone : l'UI colore la zone touchée. */
  zone: boolean;
  floats: FloatingText[];
  /** Impact estimé sur le match, de 0 à 1 (CAP-10). */
  impact: number;
  notes: string[];
  /** Dernière minute pendant laquelle les faits de jeu sont crédités à l'activation. */
  activeUntil: number;
}

/** Fenêtre d'événement (CAP-19) : le match attend que le coach active ou laisse passer. */
export interface EventWindow {
  side: Side;
  trigger: AbilityTrigger;
  eligiblePlayerIds: string[];
  /** Coup franc : le coach choisit l'option (attaque) ou le mur (défense), même sans capacité à jouer. */
  freeKick?: 'attack' | 'defense';
  /** Penalty : le coach choisit la frappe (attaque) ou le plongeon de son gardien (défense). */
  penalty?: 'attack' | 'defense';
}

/** Activation en cours de ciblage (CAP-16, CAP-17, CAP-20). */
export interface PendingActivation {
  side: Side;
  playerId: string;
  abilityId: string;
  required: number;
  targetIds: string[];
  validTargetIds: string[];
}

/** Coup de pied arrêté ou penalty annoncé, joué au tick suivant (après la fenêtre éventuelle). */
/** Distance d'un coup franc : elle décide de l'option la plus rentable. */
export type FreeKickDistance = 'close' | 'medium' | 'far';
/** Ce que l'équipe qui tire fait du coup franc. */
export type FreeKickOption = 'shot' | 'cross' | 'combination';
/** Taille du mur de l'équipe qui défend. */
export type WallSize = 'small' | 'normal' | 'large';
/** Style de frappe au penalty : placée (sûre), en force (brutale) ou Panenka (le bluff). */
export type PenaltyStyle = 'placed' | 'power' | 'panenka';
/** Ce que fait le gardien sur un penalty. */
export type KeeperDive = 'left' | 'right' | 'center';
/** Habitude cachée d'un gardien face aux penalties. */
export type KeeperHabit = 'diver' | 'neutral' | 'stayer';

export interface PendingPlay {
  kind: 'freeKick' | 'corner' | 'penalty';
  side: Side;
  takerId: string | null;
  /** Coup franc : distance, option choisie par l'attaque, mur choisi par la défense. */
  distance?: FreeKickDistance;
  option?: FreeKickOption;
  wall?: WallSize;
  /** Penalty : frappe choisie par le tireur, plongeon choisi par le gardien. */
  style?: PenaltyStyle;
  dive?: KeeperDive;
}

export interface ShootoutResult {
  home: number;
  away: number;
  winner: Side;
}

export interface MatchState {
  seed: number;
  /** État du Rng, pour reprendre exactement la même suite. */
  rngState: number;
  knockout: boolean;
  status: MatchStatus;
  /** Minute affichée (45 puis 45+n en temps additionnel). */
  minute: number;
  addedMinute: number;
  /** Minutes de jeu écoulées, monotone : sert aux comptes à rebours et recharges. */
  elapsed: number;
  stoppage: number;
  stoppageAnnounced: boolean;
  /** Niveaux des équipes inversés jusqu'à cette minute écoulée incluse. */
  swappedUntil: number;
  homeAdvantage: number;
  derby: boolean;
  home: TeamState;
  away: TeamState;
  goals: GoalRecord[];
  cards: CardRecord[];
  injuries: InjuryRecord[];
  activations: ActivationRecord[];
  /** Live texte complet (MATCH-04). */
  events: MatchEvent[];
  awaiting: EventWindow | null;
  pending: PendingActivation | null;
  pendingPlay: PendingPlay | null;
  /** Déclencheur ouvert pour chaque camp (CAP-19), effacé à la minute suivante. */
  triggers: Record<Side, AbilityTrigger | null>;
  /** Deux coachs humains (multi) : la fenêtre du second camp attend que le premier ait choisi (MULTI-07). */
  windowQueue?: Side[];
  shootout: ShootoutResult | null;
  /** Gardiens dont le staff a percé les habitudes au penalty (après en avoir affronté un). */
  scoutedKeeperIds?: string[];
  /** XP gagnée par joueur (CAP-10), calculée au coup de sifflet final. */
  xpGains: Record<string, number>;
  nextActivationId: number;
}

// ---------------------------------------------------------------------------
// Sorties
// ---------------------------------------------------------------------------

export type MatchEventKind =
  | 'kickoff'
  | 'ambiance'
  | 'goal'
  | 'goalCancelled'
  | 'save'
  | 'miss'
  | 'actionCancelled'
  | 'foul'
  | 'yellowCard'
  | 'redCard'
  | 'freeKick'
  | 'corner'
  | 'penalty'
  | 'injury'
  | 'stoppage'
  | 'halftime'
  | 'fullTime'
  | 'shootout'
  | 'activation'
  | 'substitution'
  | 'effect'
  | 'eventWindow';

export interface MatchEvent {
  minute: number;
  addedMinute: number;
  kind: MatchEventKind;
  side: Side | null;
  text: string;
  playerId?: string;
  abilityId?: string;
  /** Passeur d'un but. */
  assistId?: string;
  assistName?: string;
  /** Score après l'événement, domicile puis extérieur. */
  score?: [number, number];
  /** Précision pour le live concis : nom de la capacité, minutes ajoutées. */
  label?: string;
}

export interface ActivationPreview {
  available: boolean;
  /** Pourquoi c'est impossible, sur le ton de la buvette. */
  reason: string | null;
  side: Side;
  playerId: string;
  abilityId: string | null;
  /** `???` tant que la capacité est cachée (CAP-13). */
  abilityName: string;
  rarity: Rarity | null;
  revealed: boolean;
  cost: number;
  gauge: number;
  targeting: TargetKind | null;
  targetCount: number;
  targetLine: Position | null;
  targetDowned: boolean;
  validTargetIds: string[];
  cooldownRemaining: number;
}

export interface AbilityReport {
  side: Side;
  playerId: string;
  playerName: string;
  abilityId: string;
  abilityName: string;
  minute: number;
  byAi: boolean;
  impact: number;
  xp: number;
  text: string;
}

export interface PlayerReport {
  playerId: string;
  side: Side;
  name: string;
  played: boolean;
  goals: number;
  assists: number;
  yellowCards: number;
  sentOff: boolean;
  injured: boolean;
  /** Fatigue due au match, à reporter sur le joueur (EFF-04). */
  fatigue: number;
  abilityRevealed: boolean;
}

export interface MatchSummary {
  homeName: string;
  awayName: string;
  homeGoals: number;
  awayGoals: number;
  shootout: ShootoutResult | null;
  goals: (GoalRecord & { playerName: string; assistName: string | null })[];
  cards: (CardRecord & { playerName: string })[];
  injuries: (InjuryRecord & { playerName: string })[];
  abilities: AbilityReport[];
  consequences: Record<Side, Consequence[]>;
  xpGains: Record<string, number>;
  players: PlayerReport[];
}
