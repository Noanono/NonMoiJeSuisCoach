/**
 * Commandes du coach entre deux matchs. Chacune modifie la partie en place
 * et renvoie un message lisible pour l'interface.
 */
import { getAbility } from '../abilities/catalog';
import { applyDialogueChoice, DIALOGUES } from '../club/dialogues';
import { acceptOffer, askingPrice, buyPlayer, marketListings, sellPlayer, type MarketListing, type TransferResult } from '../club/transfers';
import { askingSalary } from '../club/valuation';
import { isTransferWindowOpen } from '../league/calendar';
import { autoLineup, MAX_BENCH_SIZE, validateLineup, type LineupError } from '../league/lineup';
import { FORMATION_SLOTS, isAvailable, overall, ratingAtPosition } from '../player/rating';
import { defaultTrainingFocus } from '../club/training';
import { FACILITIES, facilitiesOf, upgradeCost } from '../club/facilities';
import type { FacilityId, Instructions, Lineup, TrainingFocus } from '../types';
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

/** Programme d'entraînement d'un joueur (TRAIN-02). La progression en cours repart de zéro si l'axe change. */
export function setTrainingFocus(state: GameState, playerId: string, focus: TrainingFocus): void {
  const player = state.players[playerId];
  if (!player || player.clubId !== state.humanClubId || player.training.focus === focus) return;
  state.players[playerId] = { ...player, training: { focus, progress: 0 } };
}

/** Remet à chacun le programme de son poste. */
export function resetTrainingFocus(state: GameState): void {
  for (const player of humanSquad(state)) setTrainingFocus(state, player.id, defaultTrainingFocus(player.position));
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
  if (result.ok) refillLineup(state, lineup, playerId);
  return result;
}

/** Offre d'un club IA (CLUB-03). */
export function answerOffer(state: GameState, offerId: string, accept: boolean): ActionResult {
  const offer = state.offers.find((candidate) => candidate.id === offerId);
  if (!offer) return refused('Cette offre a expiré. Le club adverse a acheté un barbecue à la place.');
  state.offers = state.offers.filter((candidate) => candidate.id !== offerId);
  if (!accept) return done('Offre refusée.');
  const lineup = humanClub(state).lineup;
  const result = applyTransfer(state, acceptOffer({ clubs: state.clubs, players: state.players }, offer, { week: state.week, windowOpen: transferWindowOpen(state) }));
  if (result.ok) refillLineup(state, lineup, offer.playerId);
  return result;
}

/**
 * Après un départ, on ne touche qu'à la place laissée vide : un titulaire parti est remplacé poste
 * pour poste par le meilleur joueur disponible hors du onze, un remplaçant parti par le meilleur de
 * la tribune. Le reste de la composition du coach ne bouge pas.
 */
function refillLineup(state: GameState, previous: Lineup | null, departedId: string): void {
  const squad = humanSquad(state);
  if (!previous) {
    setLineup(state, autoLineup(squad, '4-4-2'));
    return;
  }
  const byId = new Map(squad.map((player) => [player.id, player]));
  const starters = [...previous.starters];
  let bench = previous.bench.filter((id) => id !== departedId && byId.has(id));
  const slot = starters.indexOf(departedId);
  if (slot >= 0) {
    const position = FORMATION_SLOTS[previous.formation][slot]!;
    const replacement = squad
      .filter((player) => !starters.includes(player.id) && isAvailable(player))
      .sort((a, b) => ratingAtPosition(b, position) - ratingAtPosition(a, position))[0];
    starters[slot] = replacement?.id ?? '';
    bench = bench.filter((id) => id !== replacement?.id);
  }
  const used = new Set([...starters, ...bench]);
  const stands = squad.filter((player) => !used.has(player.id) && isAvailable(player)).sort((a, b) => overall(b) - overall(a));
  while (bench.length < Math.min(previous.bench.length, MAX_BENCH_SIZE) && stands.length > 0) bench.push(stands.shift()!.id);
  setLineup(state, { ...previous, starters, bench });
}

/** Réponse au dialogue de la semaine (CLUB-06). */
export function answerDialogue(state: GameState, choiceId: string): ActionResult {
  const pending = state.dialogue;
  const dialogue = pending && DIALOGUES.find((candidate) => candidate.id === pending.dialogueId);
  if (!pending || !dialogue) return refused('Personne ne t’attend. Profites-en.');
  const result = applyDialogueChoice({ outlook: outlookOf(state), squad: humanSquad(state) }, dialogue, choiceId);
  writeOutlook(state, result.outlook);
  replacePlayers(state, result.squad);
  state.dialogue = null;
  return done(result.outcome);
}

/** Améliore une installation du club (CLUB-09), payée sur le budget. */
export function upgradeFacility(state: GameState, facilityId: FacilityId): ActionResult {
  const club = humanClub(state);
  const facilities = facilitiesOf(club);
  const level = facilities[facilityId];
  const cost = upgradeCost(level);
  const label = FACILITIES[facilityId].label;
  if (cost === null) return refused(`${label} : déjà au niveau maximum.`);
  if (club.budget < cost) return refused(`Pas assez d'argent : il manque ${(cost - club.budget).toLocaleString('fr-FR')} €.`);
  club.budget -= cost;
  club.facilities = { ...facilities, [facilityId]: level + 1 };
  return done(`${label} passe au niveau ${level + 1}. Le président coupe le ruban avec des ciseaux à bouts ronds.`);
}
