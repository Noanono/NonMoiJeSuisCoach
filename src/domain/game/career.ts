import { NEUTRAL_SPONSOR_MOOD } from '../club/model';
import { seasonObjective } from '../club/president';
import { DIFFICULTIES } from './difficulty';
import { chooseRival } from './season';
import { divisionOf, humanClub } from './selectors';
import type { GameState } from './state';
import { finishWeek, withRng } from './week';

/**
 * Rebond après un licenciement (CLUB-05) : le coach signe dans un des clubs qui l'ont appelé.
 * Il reprend leur effectif, leur budget et leur place au classement, puis la semaine interrompue se termine.
 */
export function acceptJob(state: GameState, clubId: string): boolean {
  if (state.status !== 'fired' || !state.jobOffers.includes(clubId)) return false;
  const previous = humanClub(state);
  const next = state.clubs[clubId]!;
  previous.isHuman = false;
  next.isHuman = true;
  state.humanClubId = next.id;
  state.status = 'playing';
  state.jobOffers = [];
  state.offers = [];
  state.dialogue = null;
  state.lastAppearances = [];
  state.lastFinance = [];
  state.streak = { wins: 0, losses: 0 };
  state.outlook = { presidentConfidence: DIFFICULTIES[state.difficulty].startConfidence, sponsorMood: NEUTRAL_SPONSOR_MOOD };
  for (const playerId of next.playerIds) {
    const player = state.players[playerId];
    if (player) player.ability.revealed = true;
  }
  state.news = [`Tu signes à ${next.name}. Nouveau vestiaire, nouvelles odeurs, même passion.`];
  withRng(state, (rng) => {
    state.objective = seasonObjective({ club: next, division: divisionOf(state, next.id), clubs: state.clubs, rng });
    state.rivalId = chooseRival(state, rng);
    state.news.push(`Le président : « ${state.objective.speech} »`);
    finishWeek(state, rng);
  });
  return true;
}
