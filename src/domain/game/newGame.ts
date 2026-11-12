import { ABILITIES } from '../abilities/catalog';
import { NEUTRAL_SPONSOR_MOOD } from '../club/model';
import { createRng } from '../core/rng';
import { generateWorld } from '../world/generateWorld';
import { DIFFICULTIES, type Difficulty } from './difficulty';
import { startSeason } from './season';
import { GAME_VERSION, type GameState } from './state';

export interface NewGameOptions {
  seed: number;
  clubName?: string;
  difficulty?: Difficulty;
}

/** Nouvelle partie : le coach débarque dans un club de district (UNIV-02). */
export function newGame({ seed, clubName, difficulty = 'normal' }: NewGameOptions): GameState {
  const world = generateWorld({ seed, abilityPool: ABILITIES, humanClubName: clubName });
  const human = Object.values(world.clubs).find((club) => club.isHuman);
  if (!human) throw new Error('Le monde généré n’a pas de club pour le coach');
  const rng = createRng(seed ^ 0x9e3779b9);
  const settings = DIFFICULTIES[difficulty];
  human.budget = Math.round(human.budget * settings.budgetFactor);

  const state: GameState = {
    version: GAME_VERSION,
    rngState: 0,
    season: 1,
    week: 1,
    humanClubId: human.id,
    clubs: world.clubs,
    players: world.players,
    divisions: world.divisions,
    fixtures: [],
    cup: { season: 1, totalRounds: 0, byeClubIds: [], fixtures: [], currentRound: 0 },
    outlook: { presidentConfidence: settings.startConfidence, sponsorMood: NEUTRAL_SPONSOR_MOOD },
    objective: { league: 'survival', targetPosition: 0, cupRoundsToWin: 0, speech: '' },
    offers: [],
    dialogue: null,
    recentDialogueIds: [],
    abilityReroll: null,
    lastFinance: [],
    lastAppearances: [],
    streak: { wins: 0, losses: 0 },
    news: [`Bienvenue à ${human.name}. Terrain boueux, buvette en préfabriqué, vestiaires qui fuient. C'est chez toi.`],
    history: [],
    status: 'playing',
    difficulty,
    jobOffers: [],
    rivalId: null,
  };
  for (const playerId of human.playerIds) state.players[playerId]!.ability.revealed = true;
  startSeason(state, rng);
  state.rngState = rng.state();
  return state;
}
