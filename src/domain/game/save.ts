import { createSaveStore, type SaveStorage, type SaveStore } from '../save/saveSlots';
import { chooseRival } from './season';
import { humanClub } from './selectors';
import { GAME_VERSION, type GameState } from './state';
import { withRng } from './week';

/** Sauvegardes locales de la partie (TECH-03, TECH-04). */
export function createGameSaves(storage: SaveStorage): SaveStore<GameState> {
  return createSaveStore<GameState>(storage, {
    keyPrefix: 'nmjsc',
    version: GAME_VERSION,
    validate: isGameState,
    migrate: migrateGame,
  });
}

function isGameState(data: unknown): data is GameState {
  return typeof data === 'object' && data !== null && 'humanClubId' in data && 'players' in data;
}

/**
 * Version 3 → 4 : difficulté, rival, offres d'emploi et passes décisives.
 * Les installations absentes valent zéro : rien à écrire pour elles.
 */
export function migrateGame(data: unknown, fromVersion: number): GameState | null {
  if (fromVersion !== 3 || !isGameState(data)) return null;
  const state = data as GameState;
  state.version = GAME_VERSION;
  state.difficulty ??= 'normal';
  state.jobOffers ??= [];
  for (const player of Object.values(state.players)) player.seasonStats.assists ??= 0;
  if (state.rivalId === undefined) state.rivalId = withRng(state, (rng) => chooseRival(state, rng));
  return state;
}

export function saveMeta(state: GameState): { clubName: string; season: number; week: number } {
  return { clubName: humanClub(state).name, season: state.season, week: state.week };
}
