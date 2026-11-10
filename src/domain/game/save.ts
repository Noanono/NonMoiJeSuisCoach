import { careerXpAtAge, levelForXp, XP_THRESHOLDS } from '../abilities/progression';
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

/** Met à niveau une ancienne sauvegarde, étape par étape (3 → 4 → 5). */
export function migrateGame(data: unknown, fromVersion: number): GameState | null {
  if (fromVersion < 3 || fromVersion >= GAME_VERSION || !isGameState(data)) return null;
  const state = data as GameState;
  if (fromVersion <= 3) toVersion4(state);
  if (fromVersion <= 4) toVersion5(state);
  state.version = GAME_VERSION;
  return state;
}

/**
 * Version 3 → 4 : difficulté, rival, offres d'emploi et passes décisives.
 * Les installations absentes valent zéro : rien à écrire pour elles.
 */
function toVersion4(state: GameState): void {
  state.difficulty ??= 'normal';
  state.jobOffers ??= [];
  for (const player of Object.values(state.players)) player.seasonStats.assists ??= 0;
  if (state.rivalId === undefined) state.rivalId = withRng(state, (rng) => chooseRival(state, rng));
}

/**
 * Version 4 → 5 : paliers d'XP bien plus hauts (CAP-10). Les joueurs du coach gardent leur niveau,
 * leur XP est portée au palier de ce niveau ; les autres reçoivent l'XP de carrière de leur âge.
 */
function toVersion5(state: GameState): void {
  withRng(state, (rng) => {
    for (const player of Object.values(state.players)) {
      const ability = player.ability;
      const floor = XP_THRESHOLDS[ability.level - 1] ?? 0;
      const career = player.clubId === state.humanClubId ? 0 : careerXpAtAge(rng, player.age);
      ability.xp = Math.max(ability.xp, floor, career);
      ability.level = Math.max(ability.level, levelForXp(ability.xp));
    }
  });
}

export function saveMeta(state: GameState): { clubName: string; season: number; week: number } {
  return { clubName: humanClub(state).name, season: state.season, week: state.week };
}
