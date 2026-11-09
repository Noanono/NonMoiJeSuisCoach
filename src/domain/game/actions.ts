/**
 * Commandes du coach entre deux matchs. Chacune modifie la partie en place
 * et renvoie un message lisible pour l'interface.
 */
import { getAbility } from '../abilities/catalog';
import { applyDialogueChoice, DIALOGUES } from '../club/dialogues';
import { finePlayer, fineAmount, type FineLevel } from '../club/discipline';
import { applyPressArticle, writeArticle } from '../club/press';
import { acceptOffer, askingPrice, buyPlayer, marketListings, rejectOffer, sellPlayer, type MarketListing, type TransferResult } from '../club/transfers';
import { askingSalary } from '../club/valuation';
import { isTransferWindowOpen } from '../league/calendar';
import { autoLineup, validateLineup, type LineupError } from '../league/lineup';
import type { HouseRule, Instructions, Lineup, TeamNight } from '../types';
import { humanClub, humanSquad, outlookOf, replacePlayers, writeOutlook } from './selectors';
import type { GameState } from './state';
import { withRng } from './week';

/** Une vente express rapporte moins que la valeur du joueur. */
const QUICK_SALE_RATIO = 0.8;

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const done = (message: string): ActionResult => ({ ok: true, message });
const refused = (message: string): ActionResult => ({ ok: false, message });

/** Onze, banc et formation (EFF-03). La composition est enregistrée même invalide, pour pouvoir la corriger. */
export function setLineup(state: GameState, lineup: Lineup): LineupError[] {
  humanClub(state).lineup = lineup;
  return validateLineup(lineup, humanSquad(state));
}

/** L'adjoint compose le meilleur onze disponible dans la formation actuelle (EFF-03). */
export function autoPickLineup(state: GameState): LineupError[] {
  const current = humanClub(state).lineup;
  return setLineup(state, autoLineup(humanSquad(state), current?.formation ?? '4-4-2', current?.instructions));
}

/** Consignes tactiques (MATCH-05). */
export function setInstructions(state: GameState, instructions: Instructions): void {
  const club = humanClub(state);
  if (club.lineup) club.lineup = { ...club.lineup, instructions };
}

/** Règlement intérieur (FRAS-01) : appliqué au moral chaque semaine et aux capacités en match. */
export function toggleHouseRule(state: GameState, rule: HouseRule): void {
  state.houseRules = state.houseRules.includes(rule)
    ? state.houseRules.filter((existing) => existing !== rule)
    : [...state.houseRules, rule];
  state.abilityContext = { ...state.abilityContext, houseRules: state.houseRules };
}

/** Soirée d'équipe de la semaine (FRAS-06) : elle compte pour le prochain match. */
export function chooseTeamNight(state: GameState, night: TeamNight): void {
  state.teamNight = night;
  state.abilityContext = { ...state.abilityContext, teamNight: night };
}

/** Amende (FRAS-02) : encaissée au bilan de la semaine, le joueur perd du moral et peut se rebeller. */
export function fine(state: GameState, playerId: string, level: FineLevel): ActionResult {
  const player = state.players[playerId];
  if (!player || player.clubId !== state.humanClubId) return refused('Ce joueur n’est pas chez toi.');
  return withRng(state, (rng) => {
    const result = finePlayer(player, fineAmount(player, level), rng);
    state.players[playerId] = result.player;
    state.finesCollected += result.income;
    let outlook = outlookOf(state);
    for (const event of result.events) {
      const article = writeArticle(event, { week: state.week, season: state.season, clubName: humanClub(state).name, rng });
      state.press.unshift(article);
      outlook = applyPressArticle(outlook, article);
    }
    writeOutlook(state, outlook);
    return done(result.messages.join(' '));
  });
}

export function transferWindowOpen(state: GameState): boolean {
  return isTransferWindowOpen(state.week);
}

export function market(state: GameState): MarketListing[] {
  return marketListings({ clubs: state.clubs, players: state.players }, state.humanClubId, getAbility);
}

function applyTransfer(state: GameState, result: TransferResult): ActionResult {
  if (!result.ok) return refused(result.message);
  state.clubs = result.world.clubs;
  state.players = result.world.players;
  return done(result.messages.join(' '));
}

/** Achat au mercato (CLUB-02), au prix demandé. */
export function buy(state: GameState, playerId: string): ActionResult {
  const player = state.players[playerId];
  if (!player) return refused('Ce joueur n’existe pas. Ton adjoint a encore inventé un nom.');
  const rarity = getAbility(player.ability.abilityId).rarity;
  return applyTransfer(
    state,
    buyPlayer(
      { clubs: state.clubs, players: state.players },
      {
        buyerId: state.humanClubId,
        playerId,
        price: askingPrice(player, rarity),
        salary: askingSalary(player, rarity),
        windowOpen: transferWindowOpen(state),
      },
    ),
  );
}

/** Vente express à un club IA qui a les moyens (CLUB-02). */
export function sellNow(state: GameState, playerId: string): ActionResult {
  const player = state.players[playerId];
  if (!player || player.clubId !== state.humanClubId) return refused('Ce joueur n’est pas chez toi.');
  const price = Math.round(askingPrice(player, getAbility(player.ability.abilityId).rarity) * QUICK_SALE_RATIO);
  const buyers = Object.values(state.clubs).filter((club) => !club.isHuman && club.budget >= price);
  if (buyers.length === 0) return refused('Personne ne veut de lui. Pour l’instant.');
  const buyer = withRng(state, (rng) => rng.pick(buyers));
  const lineup = humanClub(state).lineup;
  const result = applyTransfer(
    state,
    sellPlayer({ clubs: state.clubs, players: state.players }, { playerId, toClubId: buyer.id, price, windowOpen: transferWindowOpen(state) }),
  );
  if (result.ok) refillLineup(state, lineup);
  return result;
}

/** Offre d'un club IA (CLUB-03). */
export function answerOffer(state: GameState, offerId: string, accept: boolean): ActionResult {
  const offer = state.offers.find((candidate) => candidate.id === offerId);
  if (!offer) return refused('Cette offre a expiré. Le club adverse a acheté un barbecue à la place.');
  state.offers = state.offers.filter((candidate) => candidate.id !== offerId);
  const world = { clubs: state.clubs, players: state.players };
  if (!accept) {
    const rejection = rejectOffer(world, offer);
    state.clubs = rejection.world.clubs;
    state.players = rejection.world.players;
    return done(rejection.messages.join(' '));
  }
  const lineup = humanClub(state).lineup;
  const result = applyTransfer(state, acceptOffer(world, offer, { week: state.week, windowOpen: transferWindowOpen(state) }));
  if (result.ok) refillLineup(state, lineup);
  return result;
}

/** Après un départ, l'adjoint recompose le onze en gardant la formation et les consignes du coach. */
function refillLineup(state: GameState, previous: Lineup | null): void {
  setLineup(state, autoLineup(humanSquad(state), previous?.formation ?? '4-4-2', previous?.instructions));
}

/** Réponse au dialogue de la semaine (CLUB-06). */
export function answerDialogue(state: GameState, choiceId: string): ActionResult {
  const pending = state.dialogue;
  const dialogue = pending && DIALOGUES.find((candidate) => candidate.id === pending.dialogueId);
  if (!pending || !dialogue) return refused('Personne ne t’attend. Profites-en.');
  const result = applyDialogueChoice(
    { outlook: outlookOf(state), squad: humanSquad(state), ...(pending.playerId ? { playerId: pending.playerId } : {}) },
    dialogue,
    choiceId,
  );
  writeOutlook(state, result.outlook);
  replacePlayers(state, result.squad);
  state.dialogue = null;
  return done(result.outcome);
}
