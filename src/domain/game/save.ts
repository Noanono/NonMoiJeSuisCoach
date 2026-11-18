import { ABILITIES } from '../abilities/catalog';
import { careerXpAtAge, levelForXp, XP_THRESHOLDS } from '../abilities/progression';
import type { Rng } from '../core/rng';
import type { Ability, Player, Rarity } from '../types';
import { isAbilityCompatible } from '../world/playerGenerator';
import { LEGACY_ABILITY_RARITY } from './legacyAbilities';
import { createSaveStore, SAVE_SLOTS, type SaveStorage, type SaveStore } from '../save/saveSlots';
import { chooseRival } from './season';
import { humanClub } from './selectors';
import { GAME_VERSION, type GameState } from './state';
import { withRng } from './week';

const GAME_SAVE_PREFIX = 'nmjsc';

/** Clés de stockage des emplacements de partie : le stockage du compte CrazyGames les précharge (PLAT-03). */
export const GAME_SAVE_KEYS: readonly string[] = SAVE_SLOTS.map((slot) => `${GAME_SAVE_PREFIX}${slot}`);

/** Sauvegardes locales de la partie (TECH-03, TECH-04). */
export function createGameSaves(storage: SaveStorage): SaveStore<GameState> {
  return createSaveStore<GameState>(storage, {
    keyPrefix: GAME_SAVE_PREFIX,
    version: GAME_VERSION,
    validate: isGameState,
    migrate: migrateGame,
  });
}

function isGameState(data: unknown): data is GameState {
  return typeof data === 'object' && data !== null && 'humanClubId' in data && 'players' in data;
}

/** Met à niveau une ancienne sauvegarde, étape par étape (3 → 4 → 5 → 6). */
export function migrateGame(data: unknown, fromVersion: number): GameState | null {
  if (fromVersion < 3 || fromVersion >= GAME_VERSION || !isGameState(data)) return null;
  const state = data as GameState;
  if (fromVersion <= 3) toVersion4(state);
  if (fromVersion <= 4) toVersion5(state);
  if (fromVersion <= 5) toVersion6(state);
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

/**
 * Version 5 → 6 : nouveau catalogue de capacités. Chaque joueur dont la capacité a disparu en reçoit
 * une nouvelle de la même rareté, compatible avec son poste et absente de son effectif (CAP-02).
 * Il garde son niveau et son XP. Les rerolls en attente reçoivent aussi de nouvelles options.
 */
function toVersion6(state: GameState): void {
  const known = new Set(ABILITIES.map((ability) => ability.id));
  withRng(state, (rng) => {
    const clubAbilities = new Map<string | null, Set<string>>();
    const usedBy = (clubId: string | null) => {
      let used = clubAbilities.get(clubId);
      if (!used) {
        used = new Set(Object.values(state.players).filter((player) => player.clubId === clubId && known.has(player.ability.abilityId)).map((player) => player.ability.abilityId));
        clubAbilities.set(clubId, used);
      }
      return used;
    };
    for (const player of Object.values(state.players)) {
      if (known.has(player.ability.abilityId)) continue;
      const used = usedBy(player.clubId);
      const replacement = replacementFor(rng, player, LEGACY_ABILITY_RARITY[player.ability.abilityId] ?? 'common', used);
      used.add(replacement.id);
      player.ability = { ...player.ability, abilityId: replacement.id, revealed: player.ability.revealed || !replacement.hidden };
    }
    const offers = [state.abilityReroll, ...(state.coaches ?? []).map((coach) => coach.abilityReroll)];
    for (const offer of offers) {
      if (!offer) continue;
      const player = state.players[offer.playerId];
      if (!player) continue;
      const taken = new Set([player.ability.abilityId, ...offer.abilityIds.filter((id) => known.has(id))]);
      offer.abilityIds = offer.abilityIds.map((id) => {
        if (known.has(id)) return id;
        const replacement = replacementFor(rng, player, LEGACY_ABILITY_RARITY[id] ?? 'common', taken);
        taken.add(replacement.id);
        return replacement.id;
      });
    }
  });
}

/** Nouvelle capacité de cette rareté pour ce joueur ; à défaut, la plus proche disponible. */
function replacementFor(rng: Rng, player: Player, rarity: Rarity, excluded: ReadonlySet<string>): Ability {
  const compatible = ABILITIES.filter((ability) => ability.rarity !== 'foreign' && isAbilityCompatible(ability, player.position));
  const free = compatible.filter((ability) => !excluded.has(ability.id));
  const sameRarity = free.filter((ability) => ability.rarity === rarity);
  return rng.pick(sameRarity.length > 0 ? sameRarity : free.length > 0 ? free : compatible);
}

export function saveMeta(state: GameState): { clubName: string; season: number; week: number } {
  return { clubName: humanClub(state).name, season: state.season, week: state.week };
}
