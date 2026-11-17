/**
 * Match amical contre une équipe étrangère (UNIV-10) : un par saison, pendant le premier mercato, contre une
 * nation tirée au sort. L'adversaire est un peu plus fort que le onze du coach. Une victoire lui rapporte un
 * jeune de cette nation, un peu meilleur qu'un jeune de son centre de formation, avec une capacité étrangère.
 * Rien au classement ; la fatigue, les blessures et l'XP de capacité comptent.
 */
import { ABILITIES, getAbility } from '../abilities/catalog';
import { AI_STYLE_PLAN } from '../club/aiStyle';
import { facilitiesOf, facilityBonus } from '../club/facilities';
import { MAX_SQUAD_SIZE } from '../club/transfers';
import { clamp, type Rng } from '../core/rng';
import { isTransferWindowOpen, SEASON_WEEKS } from '../league/calendar';
import { autoLineup } from '../league/lineup';
import { createMatch } from '../match';
import type { MatchState, MatchSummary, TeamSheet } from '../match/types';
import { overall } from '../player/rating';
import type { Attributes, Player, Position } from '../types';
import { foreignClubId, NATION_IDS, NATIONS, type Nation, type NationId } from '../world/nations';
import { generatePlayer, SQUAD_COMPOSITION } from '../world/playerGenerator';
import { gainXp } from '../abilities/progression';
import { teamSheet, humanLineupErrors } from './matches';
import { clubPlayers, humanClub, humanFixtureAt, humanSquad } from './selectors';
import type { GameState } from './state';

export interface FriendlyMatch {
  season: number;
  week: number;
  nationId: NationId;
  status: 'pending' | 'won' | 'drawn' | 'lost' | 'declined';
  /** Buts du coach, puis de l'équipe étrangère. */
  score?: [number, number];
  /** Le jeune offert après une victoire. */
  giftId?: string;
}

/** L'équipe étrangère a de 5 à 8 points de plus que le onze du coach. */
const STRENGTH_GAP = { min: 5, max: 8 } as const;
/** Chaque joueur étranger varie autour de ce niveau. */
const PLAYER_SPREAD = 3;
const MAX_ATTRIBUTE = 99;
const MIN_ATTRIBUTE = 1;
/** Jeune offert : un peu meilleur qu'un jeune du centre de formation (qui part 5 points sous la réputation). */
const GIFT_REPUTATION_GAP = 2;
const GIFT_AGE = { min: 17, max: 19 } as const;
const GIFT_POTENTIAL_GAIN = { min: 18, max: 36 } as const;

/** Programme l'amical de la saison : la première semaine de mercato sans match du coach, contre une nation au hasard. */
export function scheduleFriendly(state: GameState, rng: Rng): void {
  let week = 0;
  for (let candidate = 1; candidate <= SEASON_WEEKS && week === 0; candidate++) {
    if (isTransferWindowOpen(candidate) && !humanFixtureAt(state, candidate)) week = candidate;
  }
  if (week === 0) {
    state.friendly = null;
    return;
  }
  const nation = NATIONS[rng.pick(NATION_IDS)];
  state.friendly = { season: state.season, week, nationId: nation.id, status: 'pending' };
  state.news.push(`Match amical en semaine ${week} : ${nation.clubName} (${nation.country}) débarque au stade. ${nation.motto}`);
}

/** L'amical de la semaine, s'il reste à jouer. */
export function pendingFriendly(state: GameState): FriendlyMatch | null {
  const friendly = state.friendly;
  return friendly && friendly.status === 'pending' && friendly.season === state.season && friendly.week === state.week ? friendly : null;
}

/** Note moyenne du onze aligné par le coach (ou de ses 11 meilleurs). */
function coachLevel(state: GameState): number {
  const lineup = humanClub(state).lineup;
  const starters = lineup ? lineup.starters.map((id) => state.players[id]).filter((player): player is Player => player !== undefined) : [];
  const pool = starters.length >= 11 ? starters : [...humanSquad(state)].sort((a, b) => overall(b) - overall(a)).slice(0, 11);
  return pool.reduce((sum, player) => sum + overall(player), 0) / Math.max(1, pool.length);
}

function shiftTo(attributes: Attributes, delta: number): Attributes {
  return Object.fromEntries(Object.entries(attributes).map(([name, value]) => [name, clamp(Math.round(value + delta), MIN_ATTRIBUTE, MAX_ATTRIBUTE)])) as Attributes;
}

/** Nom tiré dans le pays : prénom et nom, ou un seul nom pour le Brésil. */
function nationName(rng: Rng, nation: Nation): { firstName: string; lastName: string } {
  const first = rng.pick(nation.firstNames);
  return nation.lastNames.length > 0 ? { firstName: first, lastName: rng.pick(nation.lastNames) } : { firstName: '', lastName: first };
}

/** Un joueur de la nation, au niveau visé. */
function nationPlayer(rng: Rng, nation: Nation, position: Position, level: number, id: string, clubId: string | null, age?: number): Player {
  const base = generatePlayer({ rng, position, reputation: level, clubId, abilityPool: ABILITIES, excludedAbilityIds: [], ...(age !== undefined ? { age } : {}) });
  const target = level + rng.int(-PLAYER_SPREAD, PLAYER_SPREAD);
  const attributes = shiftTo(base.attributes, target - overall(base));
  return { ...base, id, ...nationName(rng, nation), attributes, nationality: nation.id };
}

/**
 * Capacité du pays pour ce joueur : sur le banc, celle qui se joue depuis le banc si la nation en a une ;
 * sur le terrain, celle de son poste, sinon celle de tous postes, sinon l'autre (pas une capacité de banc).
 */
function nationAbilityFor(nation: Nation, player: Player, onBench: boolean): string {
  const abilities = nation.abilityIds.map((id) => getAbility(id));
  const benchAbility = abilities.find((ability) => ability.position === 'BENCH');
  const fieldAbilities = abilities.filter((ability) => ability.position !== 'BENCH');
  if (onBench && benchAbility) return benchAbility.id;
  const fitting = fieldAbilities.find((ability) => ability.position === player.position) ?? fieldAbilities.find((ability) => ability.position === 'ANY') ?? fieldAbilities[0];
  return (fitting ?? abilities[0]!).id;
}

/** L'équipe étrangère, construite pour ce match : à hauteur du coach, plus 5 à 8 points. */
export function foreignTeamSheet(state: GameState, nationId: NationId, rng: Rng): TeamSheet {
  const nation = NATIONS[nationId];
  const level = Math.round(coachLevel(state)) + rng.int(STRENGTH_GAP.min, STRENGTH_GAP.max);
  const clubId = foreignClubId(nation.id);
  const players: Player[] = [];
  for (const position of Object.keys(SQUAD_COMPOSITION) as Position[]) {
    for (let index = 0; index < SQUAD_COMPOSITION[position]; index++) {
      players.push(nationPlayer(rng, nation, position, level, `${clubId}-${state.season}-${players.length}`, clubId));
    }
  }
  const plan = AI_STYLE_PLAN[nation.style];
  const lineup = autoLineup(players, plan.formation, plan.instructions);
  const byId = new Map(players.map((player) => [player.id, player]));
  const starters = lineup.starters.map((id) => byId.get(id)!).filter(Boolean);
  const bench = lineup.bench.map((id) => byId.get(id)!).filter(Boolean);
  // Tous les joueurs, remplaçants compris, portent une capacité de leur pays, et seulement celles-là.
  const benchIds = new Set(bench.map((player) => player.id));
  for (const player of [...starters, ...bench]) {
    const abilityId = nationAbilityFor(nation, player, benchIds.has(player.id));
    player.ability = { abilityId, level: 1, xp: 0, revealed: true };
  }
  const captain = starters.reduce((best, player) => (overall(player) > overall(best) ? player : best), starters[0]!);
  return { clubId, name: nation.clubName, starters, bench, formation: lineup.formation, instructions: lineup.instructions, captainId: captain.id, isHuman: false, aiStyle: nation.style };
}

/** Prépare l'amical de la semaine : le coach reçoit, contre l'équipe étrangère. */
export function startFriendlyMatch(state: GameState, rng: Rng): MatchState {
  const friendly = pendingFriendly(state);
  if (!friendly) throw new Error('Pas de match amical cette semaine.');
  const errors = humanLineupErrors(state);
  if (errors.length > 0) throw new Error(errors[0]!.message);
  return createMatch({
    home: teamSheet(state, state.humanClubId),
    away: foreignTeamSheet(state, friendly.nationId, rng),
    seed: rng.int(1, 2 ** 31 - 2),
    knockout: false,
  });
}

/** Reporte l'amical : fatigue, blessures et XP des joueurs du coach ; un jeune offert en cas de victoire. */
export function applyFriendlySummary(state: GameState, summary: MatchSummary, rng: Rng): void {
  const friendly = pendingFriendly(state);
  if (!friendly) throw new Error('Pas de match amical à reporter.');
  const nation = NATIONS[friendly.nationId];
  for (const report of summary.players) {
    const player = state.players[report.playerId];
    if (!player || player.clubId !== state.humanClubId) continue;
    const xp = summary.xpGains[player.id] ?? 0;
    if (xp > 0) player.ability = gainXp(player.ability, xp);
    if (report.played) player.fatigue = report.fatigue;
  }
  for (const injury of summary.injuries) {
    const player = state.players[injury.playerId];
    if (player && player.clubId === state.humanClubId) player.injuryWeeks = Math.max(player.injuryWeeks, injury.weeks);
  }
  const [own, theirs] = [summary.homeGoals, summary.awayGoals];
  friendly.score = [own, theirs];
  friendly.status = own > theirs ? 'won' : own === theirs ? 'drawn' : 'lost';
  if (friendly.status !== 'won') {
    state.news.push(`Amical : ${own}-${theirs} contre ${nation.clubName}. ${friendly.status === 'drawn' ? 'Match nul, poignées de main et échange de fanions.' : 'Défaite, mais la buvette a battu son record de recettes.'}`);
    return;
  }
  const gift = offerYoungster(state, nation, rng);
  if (!gift) {
    state.news.push(`Amical gagné ${own}-${theirs} contre ${nation.clubName} ! Ils voulaient t'offrir un jeune, mais le vestiaire est plein.`);
    return;
  }
  friendly.giftId = gift.id;
  const name = gift.firstName ? `${gift.firstName} ${gift.lastName}` : gift.lastName;
  state.news.push(`Amical gagné ${own}-${theirs} contre ${nation.clubName} ! Beaux joueurs, ils t'offrent un de leurs jeunes : ${name}, ${gift.age} ans, avec ${getAbility(gift.ability.abilityId).name}.`);
}

/** Le jeune offert : un poste où porter une capacité de son pays, un peu meilleur qu'un jeune du centre. */
function offerYoungster(state: GameState, nation: Nation, rng: Rng): Player | null {
  const club = humanClub(state);
  if (clubPlayers(state, club.id).length >= MAX_SQUAD_SIZE) return null;
  const ability = getAbility(rng.pick(nation.abilityIds));
  const positions: Position[] = ability.position === 'BENCH' || ability.position === 'ANY' ? ['DEF', 'MID', 'ATT'] : [ability.position];
  const position = rng.pick(positions);
  const boost = facilityBonus.youth(facilitiesOf(club));
  const level = club.reputation - GIFT_REPUTATION_GAP + boost.rating;
  const player = nationPlayer(rng, nation, position, level, `gift-${nation.id}-${state.season}-${rng.int(1, 1_000_000)}`, club.id, rng.int(GIFT_AGE.min, GIFT_AGE.max));
  const rating = overall(player);
  const gift: Player = {
    ...player,
    potential: clamp(rating + rng.int(GIFT_POTENTIAL_GAIN.min, GIFT_POTENTIAL_GAIN.max) + boost.potential, rating, MAX_ATTRIBUTE),
    overallAtSeasonStart: rating,
    ability: { abilityId: ability.id, level: 1, xp: 0, revealed: true },
  };
  state.players[gift.id] = gift;
  club.playerIds.push(gift.id);
  return gift;
}

/** Le coach laisse passer l'amical (ou la semaine avance sans qu'il soit joué). */
export function declineFriendly(state: GameState): void {
  const friendly = pendingFriendly(state);
  if (!friendly) return;
  friendly.status = 'declined';
  state.news.push(`Amical annulé : ${NATIONS[friendly.nationId].clubName} repart avec ses valises. Le président a déjà revendu les places.`);
}
