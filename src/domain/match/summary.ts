/**
 * Résumé de fin de match (MATCH-06) et résultat pour le calendrier.
 */
import type { MatchResult } from '../types';
import { xpForActivation } from '../abilities/progression';
import { computeXpGains } from './impact';
import { findPlayer, teamOf } from './state';
import type { AbilityReport, ActivationRecord, MatchState, MatchSummary, PlayerReport, TeamState } from './types';

const DECISIVE_IMPACT = 0.6;
const USEFUL_IMPACT = 0.3;

export function summarize(state: MatchState): MatchSummary {
  const nameOf = (playerId: string) => findPlayer(state, playerId)?.name ?? '?';
  return {
    homeName: state.home.name,
    awayName: state.away.name,
    homeGoals: state.home.goals,
    awayGoals: state.away.goals,
    shootout: state.shootout,
    goals: state.goals.filter((goal) => !goal.cancelled).map((goal) => ({ ...goal, playerName: nameOf(goal.playerId) })),
    cards: state.cards.map((card) => ({ ...card, playerName: nameOf(card.playerId) })),
    injuries: state.injuries.map((injury) => ({ ...injury, playerName: nameOf(injury.playerId) })),
    abilities: state.activations.map((record) => abilityReport(state, record)),
    combos: state.combosTriggered.slice(),
    consequences: { home: state.home.consequences.slice(), away: state.away.consequences.slice() },
    xpGains: state.status === 'finished' ? { ...state.xpGains } : computeXpGains(state),
    players: [...playerReports(state.home), ...playerReports(state.away)],
  };
}

function abilityReport(state: MatchState, record: ActivationRecord): AbilityReport {
  return {
    side: record.side,
    playerId: record.playerId,
    playerName: findPlayer(state, record.playerId)?.name ?? '?',
    abilityId: record.abilityId,
    abilityName: record.abilityName,
    minute: record.minute,
    byAi: record.byAi,
    success: record.success,
    impact: record.impact,
    xp: record.success ? xpForActivation(record.impact) : 0,
    combo: record.comboName,
    text: impactText(record),
  };
}

function impactText(record: ActivationRecord): string {
  const risks = record.risks.length > 0 ? ` Revers : ${record.risks.join(', ')}.` : '';
  if (!record.success) return `Raté, personne n'a rien vu.${risks}`;
  const verdict =
    record.impact >= DECISIVE_IMPACT ? 'Décisif' : record.impact >= USEFUL_IMPACT ? 'Utile' : 'Anecdotique';
  const notes = record.notes.length > 0 ? ` : ${record.notes.join(', ')}` : '';
  return `${verdict}${notes}.${risks}`;
}

function playerReports(team: TeamState): PlayerReport[] {
  return team.players.map((player) => ({
    playerId: player.id,
    side: player.side,
    name: player.name,
    played: player.line !== null,
    goals: player.goals,
    yellowCards: player.yellowCards,
    sentOff: player.sentOff,
    injured: player.injured,
    fatigue: Math.round(player.profile.fatigue),
    morale: Math.round(player.profile.morale),
    abilityRevealed: player.abilityRevealed,
    seasonUses: player.seasonUses,
  }));
}

/**
 * Résultat pour le calendrier. Les buts contre son camp ne figurent pas dans `scorers`
 * (le joueur fautif n'a pas marqué pour son club) mais comptent dans le score.
 */
export function toMatchResult(state: MatchState): MatchResult {
  const result: MatchResult = {
    homeGoals: state.home.goals,
    awayGoals: state.away.goals,
    scorers: state.goals
      .filter((goal) => !goal.cancelled && !goal.ownGoal)
      .map((goal) => ({ playerId: goal.playerId, clubId: teamOf(state, goal.side).clubId, minute: goal.minute })),
  };
  if (state.shootout) result.penaltyWinnerId = teamOf(state, state.shootout.winner).clubId;
  return result;
}
