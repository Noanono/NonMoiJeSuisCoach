import type { Ability, Player } from '../types';
import { clamp } from '../core/rng';

/**
 * Types et outils partagés par la gestion du club (CLUB-*, EFF-04, EFF-05).
 * Les fonctions du dossier renvoient de nouvelles valeurs, jamais de mutation.
 */

/** Résout une capacité à partir de son identifiant (en jeu : `getAbility` du catalogue). */
export type AbilityLookup = (abilityId: string) => Pick<Ability, 'rarity'>;

export type MatchOutcome = 'win' | 'draw' | 'loss';

/** Jauges du club hors effectif : budget en euros, confiance du président et humeur des sponsors de 0 à 100. */
export interface ClubOutlook {
  budget: number;
  presidentConfidence: number;
  sponsorMood: number;
}

export const GAUGE_MIN = 0;
export const GAUGE_MAX = 100;
/** Humeur des sponsors au démarrage d'une partie : ni ravis, ni fâchés. */
export const NEUTRAL_SPONSOR_MOOD = 50;

/** Conséquence chiffrée d'un choix, interprétée par `applyConsequences`. `fatigue` ne sert qu'à récupérer. */
export interface Consequence {
  kind: 'presidentConfidence' | 'budget' | 'sponsorMood' | 'fatigue';
  value: number;
}

export function clampGauge(value: number): number {
  return clamp(Math.round(value), GAUGE_MIN, GAUGE_MAX);
}

export function playerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`;
}

export interface ConsequenceTarget {
  outlook: ClubOutlook;
  squad: readonly Player[];
}

export interface ConsequenceResult {
  outlook: ClubOutlook;
  squad: Player[];
  messages: string[];
}

const CONSEQUENCE_LABEL: Record<Consequence['kind'], string> = {
  presidentConfidence: 'Confiance du président',
  budget: 'Budget',
  sponsorMood: 'Humeur des sponsors',
  fatigue: "Fatigue de l'effectif",
};

/** Applique une liste de conséquences et renvoie le nouvel état avec une ligne lisible par conséquence. */
export function applyConsequences(target: ConsequenceTarget, consequences: readonly Consequence[]): ConsequenceResult {
  let outlook = { ...target.outlook };
  let squad = [...target.squad];
  const messages: string[] = [];
  for (const consequence of consequences) {
    const { value } = consequence;
    switch (consequence.kind) {
      case 'presidentConfidence':
        outlook = { ...outlook, presidentConfidence: clampGauge(outlook.presidentConfidence + value) };
        break;
      case 'sponsorMood':
        outlook = { ...outlook, sponsorMood: clampGauge(outlook.sponsorMood + value) };
        break;
      case 'budget':
        outlook = { ...outlook, budget: outlook.budget + value };
        break;
      case 'fatigue':
        squad = squad.map((player) => ({ ...player, fatigue: clampGauge(player.fatigue + value) }));
        break;
    }
    messages.push(describeConsequence(consequence));
  }
  return { outlook, squad, messages };
}

export function describeConsequence({ kind, value }: Consequence): string {
  const sign = value < 0 ? '−' : '+';
  const unit = kind === 'budget' ? ' €' : '';
  return `${CONSEQUENCE_LABEL[kind]} ${sign}${Math.abs(value)}${unit}`;
}
