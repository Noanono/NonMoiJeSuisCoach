/**
 * Textes du match en direct et du résumé (CAP-19, MATCH-06) : l'info d'abord, la blague après.
 */
import type { Consequence, EventWindow, GoalRecord, MatchState, MatchSummary, PendingPlay, Side } from '../../domain/match';
import type { AvatarPlayer } from '../kit/avatar';
import { minuteLabel } from './live';
import { t, td, type MessageKey } from '../../i18n/t';

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

const OUTCOME_KEY: Record<Outcome, 'win' | 'draw' | 'loss'> = { V: 'win', N: 'draw', D: 'loss' };

/** Phrase d'ambiance de fin de match : « Défaite 0-3. Le président a appelé. » */
export function outcomeLine(summary: MatchSummary, coachSide: Side): string {
  const outcome = outcomeFor(summary, coachSide);
  const [own, other] = fromCoach(summary.homeGoals, summary.awayGoals, coachSide);
  let score = `${own}-${other}`;
  if (summary.shootout) {
    const [ownShots, otherShots] = fromCoach(summary.shootout.home, summary.shootout.away, coachSide);
    score += t('verdict.shootout', { own: ownShots, other: otherShots });
  }
  return `${t(`form.${OUTCOME_KEY[outcome]}`)} ${score}. ${t(`verdict.joke.${OUTCOME_KEY[outcome]}`)}`;
}

const SET_PIECE_NAME: Record<PendingPlay['kind'], MessageKey> = {
  freeKick: 'verdict.setPiece.freeKick',
  corner: 'verdict.setPiece.corner',
  penalty: 'verdict.setPiece.penalty',
};

/** Titre du bandeau de fenêtre d'événement (CAP-19). */
export function windowTitle(window: EventWindow, pendingPlay: PendingPlay | null): string {
  if (window.keeper) return t('verdict.window.keeper');
  const setPiece = t(SET_PIECE_NAME[pendingPlay?.kind ?? 'freeKick']);
  switch (window.trigger) {
    case 'ownSetPiece':
    case 'ownDeadBall':
      return t('verdict.window.ownSetPiece', { setPiece });
    case 'opponentSetPiece':
      return t('verdict.window.opponentSetPiece', { setPiece });
    case 'ownFreeKick':
      return window.freeKick ? t('verdict.window.ownFreeKickChoice') : t('verdict.window.ownFreeKick');
    case 'opponentFreeKick':
      return window.freeKick ? t('verdict.window.opponentFreeKickChoice') : t('verdict.window.opponentFreeKick');
    case 'ownPenalty':
      return t('verdict.window.ownPenalty');
    case 'opponentPenalty':
      return t('verdict.window.opponentPenalty');
    case 'afterOwnGoal':
      return t('verdict.window.afterOwnGoal');
    case 'halftime':
      return t('verdict.window.halftime');
    case 'anytime':
      return t('verdict.window.anytime');
  }
}

/** Ce qui reste du match pour la suite de la saison, en clair. */
export function consequenceText(consequence: Consequence, playerName: (id: string) => string): string {
  switch (consequence.type) {
    case 'injury':
      return t('verdict.injury', { player: playerName(consequence.playerId), weeks: consequence.weeks, reason: td(consequence.reason) });
    case 'suspension':
      return t('verdict.suspension', { player: playerName(consequence.playerId), matches: consequence.matches, reason: td(consequence.reason) });
    case 'abilityRevealed':
      return t('verdict.revealed', { player: playerName(consequence.playerId) });
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
  const { age, clubId, position, nationality } = scorer.profile;
  return {
    own,
    title: goal.value > 1 ? (own ? t('verdict.goal.goldenOwn') : t('verdict.goal.goldenConceded')) : own ? t('verdict.goal.own') : t('verdict.goal.conceded'),
    scorer: scorer.name,
    avatar: { id: scorer.id, age, clubId, position, nationality },
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
