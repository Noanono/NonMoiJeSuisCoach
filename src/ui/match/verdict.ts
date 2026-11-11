/**
 * Textes du match en direct et du résumé (CAP-19, MATCH-06) : l'info d'abord, la blague après.
 */
import type { Consequence, EventWindow, GoalRecord, MatchState, MatchSummary, PendingPlay, Side } from '../../domain/match';
import type { AvatarPlayer } from '../kit/avatar';
import { minuteLabel } from './live';

export type Outcome = 'V' | 'N' | 'D';

/** Paire (coach, adversaire) à partir d'une paire (domicile, extérieur). */
function fromCoach(home: number, away: number, coachSide: Side): [number, number] {
  return coachSide === 'home' ? [home, away] : [away, home];
}

/** Résultat du point de vue du coach, tirs au but compris. */
export function outcomeFor(summary: MatchSummary, coachSide: Side): Outcome {
  const [own, other] = fromCoach(summary.homeGoals, summary.awayGoals, coachSide);
  if (own !== other) return own > other ? 'V' : 'D';
  if (summary.shootout) return summary.shootout.winner === coachSide ? 'V' : 'D';
  return 'N';
}

const OUTCOME_WORD: Record<Outcome, string> = { V: 'Victoire', N: 'Nul', D: 'Défaite' };

const OUTCOME_JOKE: Record<Outcome, string> = {
  V: 'La buvette ferme tard ce soir.',
  N: 'Le président a soupiré. Fort.',
  D: "Le président a appelé. Il n'a rien dit. C'est pire.",
};

/** Phrase d'ambiance de fin de match : « Défaite 0-3. Le président a appelé. » */
export function outcomeLine(summary: MatchSummary, coachSide: Side): string {
  const outcome = outcomeFor(summary, coachSide);
  const [own, other] = fromCoach(summary.homeGoals, summary.awayGoals, coachSide);
  let score = `${own}-${other}`;
  if (summary.shootout) {
    const [ownShots, otherShots] = fromCoach(summary.shootout.home, summary.shootout.away, coachSide);
    score += ` (${ownShots}-${otherShots} aux tirs au but)`;
  }
  return `${OUTCOME_WORD[outcome]} ${score}. ${OUTCOME_JOKE[outcome]}`;
}

const SET_PIECE_NAME: Record<PendingPlay['kind'], string> = {
  freeKick: 'Coup franc',
  corner: 'Corner',
  penalty: 'Penalty',
};

/** Titre du bandeau de fenêtre d'événement (CAP-19). */
export function windowTitle(window: EventWindow, pendingPlay: PendingPlay | null): string {
  const setPiece = SET_PIECE_NAME[pendingPlay?.kind ?? 'freeKick'];
  switch (window.trigger) {
    case 'ownSetPiece':
    case 'ownDeadBall':
      return `${setPiece} pour toi : quelqu'un a une idée ?`;
    case 'opponentSetPiece':
      return `${setPiece} pour eux : quelqu'un a une idée ?`;
    case 'ownFreeKick':
      return window.freeKick ? 'Coup franc pour toi : tir, centre ou combinaison ?' : "Coup franc pour toi : quelqu'un a une idée ?";
    case 'opponentFreeKick':
      return window.freeKick ? 'Coup franc contre toi : quel mur ?' : "Coup franc pour eux : quelqu'un a une idée ?";
    case 'ownPenalty':
      return "Penalty pour toi : quelqu'un veut s'en mêler ?";
    case 'opponentPenalty':
      return 'Penalty contre toi : on déconcentre le tireur ?';
    case 'afterOwnGoal':
      return "But ! Quelqu'un veut en rajouter une couche ?";
    case 'halftime':
      return "Mi-temps : le vestiaire t'écoute.";
    case 'anytime':
      return 'À toi de voir.';
  }
}

/** Ce qui reste du match pour la suite de la saison, en clair. */
export function consequenceText(consequence: Consequence, playerName: (id: string) => string): string {
  switch (consequence.type) {
    case 'injury':
      return `${playerName(consequence.playerId)} absent ${consequence.weeks} sem. : ${consequence.reason}`;
    case 'suspension':
      return `${playerName(consequence.playerId)} suspendu ${consequence.matches} match(s) : ${consequence.reason}`;
    case 'abilityRevealed':
      return `Capacité révélée chez ${playerName(consequence.playerId)}`;
  }
}

export interface GoalAlert {
  /** But pour le coach, ou encaissé. */
  own: boolean;
  title: string;
  scorer: string;
  avatar: AvatarPlayer;
  team: string;
  minute: string;
  penalty: boolean;
  /** Le but compte double. */
  double: boolean;
  /** Passeur décisif. */
  assist: string | null;
  ownName: string;
  otherName: string;
  ownGoals: number;
  otherGoals: number;
}

/** De quoi annoncer un but, score vu du coach. */
export function goalAlert(state: MatchState, goal: GoalRecord, coachSide: Side): GoalAlert {
  const own = goal.side === coachSide;
  const [coach, other] = coachSide === 'home' ? [state.home, state.away] : [state.away, state.home];
  const scoringTeam = own ? coach : other;
  const scorer = scoringTeam.players.find((player) => player.id === goal.playerId)!;
  const { age, clubId, position } = scorer.profile;
  return {
    own,
    title: goal.value > 1 ? (own ? 'But en or !' : 'But en or encaissé') : own ? 'But !' : 'But encaissé',
    scorer: scorer.name,
    avatar: { id: scorer.id, age, clubId, position },
    team: scoringTeam.name,
    minute: minuteLabel(goal.minute, goal.addedMinute),
    penalty: goal.penalty,
    double: goal.value > 1,
    assist: goal.assistId ? (scoringTeam.players.find((player) => player.id === goal.assistId)?.name ?? null) : null,
    ownName: coach.name,
    otherName: other.name,
    ownGoals: coach.goals,
    otherGoals: other.goals,
  };
}
