import { createSaveStore, type SaveStorage, type SaveStore } from '../save/saveSlots';
import { humanClub } from './selectors';
import { GAME_VERSION, type GameState } from './state';

/** Sauvegardes locales de la partie (TECH-03, TECH-04). */
export function createGameSaves(storage: SaveStorage): SaveStore<GameState> {
  return createSaveStore<GameState>(storage, {
    keyPrefix: 'nmjsc',
    version: GAME_VERSION,
    validate: (data): data is GameState =>
      typeof data === 'object' && data !== null && 'humanClubId' in data && 'players' in data,
  });
}

export function saveMeta(state: GameState): { clubName: string; season: number; week: number } {
  return { clubName: humanClub(state).name, season: state.season, week: state.week };
}
