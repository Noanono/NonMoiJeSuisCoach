/**
 * Types du moteur de match. L'état est un objet JSON simple, muté en place
 * par le moteur (pas de copie à chaque minute) et sauvegardable tel quel.
 */
import type {
  Ability,
  AbilityCategory,
  AbilityPosition,
  AbilityTrigger,
  Combo,
  Cooldown,
  Effect,
  Formation,
  Instructions,
  MatchStat,
  Player,
  Position,
  Range,
  Risk,
  TargetKind,
  Targeting,
} from '../types';
import type { AbilityContext } from '../abilities/progression';

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
  /** Soirée de la veille et règlement intérieur (CAP-14). */
  context: AbilityContext;
  isHuman: boolean;
}

export interface MatchOptions {
  home: TeamSheet;
  away: TeamSheet;
  seed: number;
  /** Match de coupe : tirs au but en cas d'égalité (UNIV-06). */
  knockout?: boolean;
  /** Source des capacités, `getAbility` par défaut. */
  lookupAbility?: (id: string) => Ability;
  /** Combos connus, `COMBOS` par défaut. */
  combos?: readonly Combo[];
}

// ---------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------

export type MatchStatus = 'firstHalf' | 'halftime' | 'secondHalf' | 'finished';

/** Statistique touchée par un effet actif : stats de jeu, moral ou mise hors jeu. */
export type ActiveStat = MatchStat | 'morale' | 'knockout';

/** Effet actif visible sur un joueur, avec son compte à rebours (CAP-09). */
export interface ActiveEffect {
  label: string;
  stat: ActiveStat;
  /** Valeur signée : positive = bonus (vert), négative = malus (rouge). */
  value: number;
  /** Dernière minute écoulée (`elapsed`) où l'effet joue : compte à rebours = endsAt − elapsed. */
  endsAt: number;
}

/** Capacité prête à l'emploi : niveau et contexte déjà appliqués à la création du match. */
export interface PreparedAbility {
  id: string;
  name: string;
  category: AbilityCategory;
  position: AbilityPosition;
  targeting: Targeting;
  trigger: AbilityTrigger;
  condition: { minMinute?: number; whenLeading?: boolean } | null;
  description: string;
  downside: string;
  hidden: boolean;
  cost: number;
  successChance: number;
  cooldown: Cooldown;
  /** Effets principaux, bonus de contexte appliqué. */
  effects: Effect[];
  /** Risques, multiplicateur de contexte appliqué. */
  risks: Risk[];
}

export interface MatchPlayer {
  id: string;
  name: string;
  side: Side;
  /** Ligne occupée sur le terrain, `null` pour un remplaçant. */
  line: Position | null;
  /** Copie du joueur : fatigue et moral évoluent pendant le match sans toucher l'original. */
  profile: Player;
  /** Note effective en cache (poste, fatigue, moral), rafraîchie périodiquement. */
  rating: number;
  yellowCards: number;
  sentOff: boolean;
  injured: boolean;
  /** Hors jeu (au sol, aux toilettes…) jusqu'à cette minute écoulée incluse. */
  knockedOutUntil: number;
  effects: ActiveEffect[];
  ability: PreparedAbility | null;
  abilityRevealed: boolean;
  seasonUses: number;
  usesThisMatch: number;
  cooldownUntil: number;
  /** Numéro du dernier événement sur lequel la capacité a servi (recharge « par événement »). */
  lastEventUse: number;
  goals: number;
}

export type ChanceKind = 'open' | 'counter' | 'longShot' | 'setPiece' | 'penalty';

export interface ChanceBoost {
  value: number;
  on: 'nextChance' | 'setPiece' | 'penalty' | 'counter' | 'longShot';
}

export interface ShotMalus {
  value: number;
  shotsLeft: number;
}

/** Conséquences hors match, appliquées par la boucle de saison. */
export type Consequence =
  | { type: 'fine'; amount: number; reason: string }
  | { type: 'budget'; amount: number; reason: string }
  | { type: 'presidentConfidence'; value: number; reason: string }
  | { type: 'injury'; playerId: string; weeks: number; reason: string }
  | { type: 'suspension'; playerId: string; matches: number; reason: string }
  | { type: 'squadFatigue'; value: number; reason: string }
  | { type: 'press'; headline: string; reason: string }
  /** Utilisation d'une capacité limitée à la saison (CAP-12) : nouveau total. */
  | { type: 'seasonUse'; playerId: string; abilityId: string; seasonUses: number }
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
  foulsIgnored: number;
  /** Échéances « jusqu'à la minute écoulée X incluse » (-1 = inactif). */
  noCardsUntil: number;
  emptyNetUntil: number;
  extraAttackerUntil: number;
  consequences: Consequence[];
}

export interface GoalRecord {
  side: Side;
  playerId: string;
  minute: number;
  addedMinute: number;
  elapsed: number;
  ownGoal: boolean;
  penalty: boolean;
  /** Annulé par une capacité (coupure de courant…). */
  cancelled: boolean;
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
  weeks: number;
}

export interface ActivationRecord {
  id: number;
  side: Side;
  playerId: string;
  abilityId: string;
  abilityName: string;
  minute: number;
  elapsed: number;
  byAi: boolean;
  success: boolean;
  targetIds: string[];
  /** Libellés des risques survenus. */
  risks: string[];
  /** Impact estimé sur le match, de 0 à 1 (CAP-10). */
  impact: number;
  notes: string[];
  /** Dernière minute pendant laquelle les faits de jeu sont crédités à l'activation. */
  activeUntil: number;
  comboName: string | null;
  usedInCombo: boolean;
}

/** Fenêtre d'événement (CAP-19) : le match attend que le coach active ou laisse passer. */
export interface EventWindow {
  side: Side;
  trigger: AbilityTrigger;
  eligiblePlayerIds: string[];
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
export interface PendingPlay {
  kind: 'freeKick' | 'corner' | 'penalty';
  side: Side;
  takerId: string | null;
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
  /** Temps additionnel ajouté par les capacités, versé dans la prochaine annonce. */
  extraStoppage: number;
  frozenUntil: number;
  homeAdvantageCancelledUntil: number;
  home: TeamState;
  away: TeamState;
  goals: GoalRecord[];
  cards: CardRecord[];
  injuries: InjuryRecord[];
  activations: ActivationRecord[];
  combosTriggered: { side: Side; name: string; minute: number }[];
  /** Live texte complet (MATCH-04). */
  events: MatchEvent[];
  awaiting: EventWindow | null;
  pending: PendingActivation | null;
  pendingPlay: PendingPlay | null;
  /** Déclencheur ouvert pour chaque camp (CAP-19), effacé à la minute suivante. */
  triggers: Record<Side, AbilityTrigger | null>;
  eventSeq: number;
  combos: Combo[];
  shootout: ShootoutResult | null;
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
  | 'ownGoal'
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
  | 'risk'
  | 'combo'
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
  revealed: boolean;
  cost: number;
  gauge: number;
  /** Chance de réussite (CAP-07). */
  successChance: number;
  /** Risques après contexte (CAP-07). */
  risks: { label: string; chance: number }[];
  targeting: TargetKind | null;
  targetCount: number;
  range: Range;
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
  success: boolean;
  impact: number;
  xp: number;
  combo: string | null;
  text: string;
}

export interface PlayerReport {
  playerId: string;
  side: Side;
  name: string;
  played: boolean;
  goals: number;
  yellowCards: number;
  sentOff: boolean;
  injured: boolean;
  /** Fatigue et moral en fin de match, à reporter sur le joueur (EFF-04, EFF-06). */
  fatigue: number;
  morale: number;
  abilityRevealed: boolean;
  seasonUses: number;
}

export interface MatchSummary {
  homeName: string;
  awayName: string;
  homeGoals: number;
  awayGoals: number;
  shootout: ShootoutResult | null;
  goals: (GoalRecord & { playerName: string })[];
  cards: (CardRecord & { playerName: string })[];
  injuries: (InjuryRecord & { playerName: string })[];
  abilities: AbilityReport[];
  combos: { side: Side; name: string; minute: number }[];
  consequences: Record<Side, Consequence[]>;
  xpGains: Record<string, number>;
  players: PlayerReport[];
}
