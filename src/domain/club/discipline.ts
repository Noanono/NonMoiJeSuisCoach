import type { Ability, HouseRule, Player, TeamNight } from '../types';
import { clamp, type Rng } from '../core/rng';
import { HOUSE_RULE_TAGS } from '../abilities/progression';
import { clampGauge, playerName, type FrasqueEvent } from './model';

/**
 * Règlement intérieur (FRAS-01), amendes (FRAS-02) et soirées d'équipe (FRAS-06).
 * Les effets sur les capacités sont calculés par `contextMultiplier` (CAP-14) ;
 * ici on décrit les règles et leurs conséquences hors match.
 */

export interface HouseRuleDefinition {
  id: HouseRule;
  label: string;
  description: string;
  /** Effet en jeu, affiché au coach avant de signer la règle. */
  effect: string;
}

/** Moral perdu chaque semaine par un joueur dont la capacité est bridée par une règle (FRAS-01). */
export const HOUSE_RULE_WEEKLY_MORALE_PENALTY = 3;

export const HOUSE_RULES: Record<HouseRule, HouseRuleDefinition> = {
  curfew: {
    id: 'curfew',
    label: 'Couvre-feu à 22 h',
    description: 'Tout le monde au lit à 22 h. Même le kiné, qui dort pourtant déjà pendant les soins.',
    effect: 'Capacités « alcool » et « vice » : bonus et malus −15 %. Moral −3 par semaine pour les joueurs concernés.',
  },
  noAlcoholEve: {
    id: 'noAlcoholEve',
    label: "Pas d'alcool la veille",
    description: 'Eau plate la veille de match. Le pastis sans eau, ça ne compte pas comme de l’eau.',
    effect: 'Capacités « alcool » : bonus et malus −15 %. Moral −3 par semaine pour les joueurs concernés.',
  },
  barClosedToPlayers: {
    id: 'barClosedToPlayers',
    label: 'Buvette fermée aux joueurs',
    description: 'La buvette est réservée aux supporters. Les joueurs regardent la tireuse à travers la vitre.',
    effect: 'Capacités « alcool » : bonus et malus −15 %. Moral −3 par semaine pour les joueurs concernés.',
  },
  noGirlfriendsInStands: {
    id: 'noGirlfriendsInStands',
    label: 'Pas de compagnes en tribune',
    description: 'Fini les mamies, les copines et les ex de la femme du président au bord du terrain.',
    effect: 'Capacités « famille » et « vice » : bonus et malus −15 %. Moral −3 par semaine pour les joueurs concernés.',
  },
};

/** Vrai si la capacité porte un tag visé par la règle (FRAS-01). */
export function isConcernedByRule(rule: HouseRule, tags: Ability['tags']): boolean {
  return HOUSE_RULE_TAGS[rule].some((tag) => tags.includes(tag));
}

/** Moral perdu cette semaine à cause du règlement intérieur (FRAS-01). */
export function houseRuleMoralePenalty(tags: Ability['tags'], rules: readonly HouseRule[]): number {
  return rules.filter((rule) => isConcernedByRule(rule, tags)).length * HOUSE_RULE_WEEKLY_MORALE_PENALTY;
}

// ---------------------------------------------------------------------------
// Soirées d'équipe (FRAS-06)
// ---------------------------------------------------------------------------

export interface TeamNightOption {
  id: TeamNight;
  label: string;
  description: string;
  moraleDelta: number;
  /** Moral en plus pour les joueurs à capacité « alcool », qui vivent pour ça. */
  alcoholMoraleBonus: number;
  /** Fatigue ajoutée à tout l'effectif. */
  fatigueDelta: number;
}

export const TEAM_NIGHT_OPTIONS: Record<TeamNight, TeamNightOption> = {
  none: {
    id: 'none',
    label: 'Aucune soirée',
    description: 'Tisane et dodo. Les piliers de buvette font la gueule.',
    moraleDelta: 0,
    alcoholMoraleBonus: -2,
    fatigueDelta: 0,
  },
  lightDrinks: {
    id: 'lightDrinks',
    label: 'Apéro léger',
    description: 'Deux bières, des chips, au lit avant minuit. En théorie.',
    moraleDelta: 3,
    alcoholMoraleBonus: 2,
    fatigueDelta: 5,
  },
  bigNight: {
    id: 'bigNight',
    label: 'Grosse soirée',
    description: 'Karaoké, tournée générale et réveil dans le rond central. Capacités « alcool » à +50 % au match suivant.',
    moraleDelta: 6,
    alcoholMoraleBonus: 6,
    fatigueDelta: 20,
  },
};

// ---------------------------------------------------------------------------
// Amendes (FRAS-02)
// ---------------------------------------------------------------------------

/** Amendes proposées, en part du salaire hebdomadaire du joueur. */
export const FINE_SALARY_RATIOS = { light: 0.5, heavy: 1, exemplary: 2 } as const;
export type FineLevel = keyof typeof FINE_SALARY_RATIOS;

/** Une semaine de salaire retenue coûte ce moral-là. */
const MORALE_LOSS_PER_WEEK_OF_SALARY = 10;
const MIN_FINE_MORALE_LOSS = 5;
const MAX_FINE_MORALE_LOSS = 30;
const BASE_REBELLION_CHANCE = 0.1;
const REBELLION_CHANCE_PER_WEEK_OF_SALARY = 0.15;
/** Un joueur déjà au fond du trou se rebelle plus volontiers. */
const LOW_MORALE_THRESHOLD = 30;
const LOW_MORALE_REBELLION_BONUS = 0.2;
const MAX_REBELLION_CHANCE = 0.8;
const REBELLION_MORALE_PENALTY = 10;

export function fineAmount(player: Player, level: FineLevel): number {
  return Math.round(player.salary * FINE_SALARY_RATIOS[level]);
}

export interface FineResult {
  player: Player;
  /** Montant à verser au budget, via la ligne « Amendes encaissées » du bilan (CLUB-01). */
  income: number;
  rebelled: boolean;
  /** Événements de presse possibles (FRAS-03). */
  events: FrasqueEvent[];
  messages: string[];
}

export function rebellionChance(player: Player, amount: number): number {
  const weeksOfSalary = amount / Math.max(1, player.salary);
  const lowMoraleBonus = player.morale < LOW_MORALE_THRESHOLD ? LOW_MORALE_REBELLION_BONUS : 0;
  return clamp(BASE_REBELLION_CHANCE + weeksOfSalary * REBELLION_CHANCE_PER_WEEK_OF_SALARY + lowMoraleBonus, 0, MAX_REBELLION_CHANCE);
}

/** Inflige une amende (FRAS-02) : le budget encaisse, le joueur perd du moral et peut se rebeller. */
export function finePlayer(player: Player, amount: number, rng: Rng): FineResult {
  const name = playerName(player);
  const weeksOfSalary = amount / Math.max(1, player.salary);
  const moraleLoss = clamp(Math.round(weeksOfSalary * MORALE_LOSS_PER_WEEK_OF_SALARY), MIN_FINE_MORALE_LOSS, MAX_FINE_MORALE_LOSS);
  const rebelled = rng.chance(rebellionChance(player, amount));
  const totalLoss = moraleLoss + (rebelled ? REBELLION_MORALE_PENALTY : 0);
  const events: FrasqueEvent[] = [{ kind: 'fine', playerId: player.id, playerName: name, amount }];
  const messages = [`${name} paie ${amount} € d'amende (moral −${moraleLoss}).`];
  if (rebelled) {
    events.push({ kind: 'fineRebellion', playerId: player.id, playerName: name, amount });
    messages.push(`${name} se rebelle et le fait savoir à toute la buvette (moral −${REBELLION_MORALE_PENALTY} de plus).`);
  }
  return {
    player: { ...player, morale: clampGauge(player.morale - totalLoss) },
    income: amount,
    rebelled,
    events,
    messages,
  };
}
