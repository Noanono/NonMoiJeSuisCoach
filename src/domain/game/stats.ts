import { FORMATION_SLOTS, overall } from '../player/rating';
import type { Player, Position } from '../types';
import type { GameState } from './state';

/** Statistiques de la saison (UNIV-08) : classements individuels et équipe type d'une division. */

export interface LeaderRow {
  playerId: string;
  name: string;
  clubName: string;
  isHuman: boolean;
  value: number;
  /** Précision affichée : matchs joués, détail des cartons. */
  detail: string;
}

export interface SeasonLeaders {
  scorers: LeaderRow[];
  assisters: LeaderRow[];
  cards: LeaderRow[];
  /** Équipe type en 4-4-2, dans l'ordre des postes. */
  team: (LeaderRow & { position: Position })[];
}

const LEADER_LIMIT = 10;
/** Un rouge pèse autant que trois jaunes dans le classement des cartons. */
const RED_CARD_WEIGHT = 3;
/** Pour l'équipe type, il faut avoir joué au moins la moitié des matchs du joueur le plus utilisé. */
const TEAM_MIN_SHARE = 0.5;

export function divisionPlayers(state: GameState, divisionId: string): Player[] {
  const division = state.divisions.find((candidate) => candidate.id === divisionId);
  if (!division) return [];
  return division.clubIds.flatMap((clubId) => state.clubs[clubId]?.playerIds ?? []).flatMap((id) => (state.players[id] ? [state.players[id]!] : []));
}

function row(state: GameState, player: Player, value: number, detail: string): LeaderRow {
  const club = player.clubId ? state.clubs[player.clubId] : undefined;
  return {
    playerId: player.id,
    name: `${player.firstName} ${player.lastName}`,
    clubName: club?.name ?? 'Sans club',
    isHuman: player.clubId === state.humanClubId,
    value,
    detail,
  };
}

function ranked(state: GameState, players: readonly Player[], value: (player: Player) => number, detail: (player: Player) => string): LeaderRow[] {
  return players
    .filter((player) => value(player) > 0)
    .sort((a, b) => value(b) - value(a) || a.seasonStats.matches - b.seasonStats.matches)
    .slice(0, LEADER_LIMIT)
    .map((player) => row(state, player, value(player), detail(player)));
}

export function seasonLeaders(state: GameState, divisionId: string): SeasonLeaders {
  const players = divisionPlayers(state, divisionId);
  const matches = (player: Player) => `${player.seasonStats.matches} m.`;
  const mostUsed = Math.max(0, ...players.map((player) => player.seasonStats.matches));
  const regulars = players.filter((player) => player.seasonStats.matches >= Math.max(1, mostUsed * TEAM_MIN_SHARE));
  const picked = new Set<string>();
  const team = FORMATION_SLOTS['4-4-2'].flatMap((position) => {
    const best = regulars
      .filter((player) => player.position === position && !picked.has(player.id))
      .sort((a, b) => overall(b) + b.seasonStats.goals + b.seasonStats.assists - (overall(a) + a.seasonStats.goals + a.seasonStats.assists))[0];
    if (!best) return [];
    picked.add(best.id);
    return [{ ...row(state, best, overall(best), matches(best)), position }];
  });
  return {
    scorers: ranked(state, players, (player) => player.seasonStats.goals, matches),
    assisters: ranked(state, players, (player) => player.seasonStats.assists, matches),
    cards: ranked(
      state,
      players,
      (player) => player.seasonStats.yellowCards + player.seasonStats.redCards * RED_CARD_WEIGHT,
      (player) => `${player.seasonStats.yellowCards} J · ${player.seasonStats.redCards} R`,
    ),
    team,
  };
}

/** Récompenses de fin de saison pour la division du coach. */
export function seasonAwards(state: GameState, divisionId: string): string[] {
  const { scorers, assisters } = seasonLeaders(state, divisionId);
  const awards: string[] = [];
  const top = scorers[0];
  const passer = assisters[0];
  if (top) awards.push(`Soulier de bronze de la buvette : ${top.name} (${top.clubName}), ${top.value} buts`);
  if (passer) awards.push(`Meilleur passeur : ${passer.name} (${passer.clubName}), ${passer.value} passes`);
  return awards;
}
