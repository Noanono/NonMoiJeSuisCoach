/**
 * Commandes du coach entre deux matchs. Chacune modifie la partie en place
 * et renvoie un message lisible pour l'interface.
 */
import { ABILITIES, getAbility } from '../abilities/catalog';
import { drawRerollOptions, rerollPrice } from '../club/abilityReroll';
import { applyDialogueChoice, DIALOGUES, localizeDialogue } from '../club/dialogues';
import { acceptOffer, askingPrice, buyPlayer, marketListings, sellPlayer, type MarketListing, type TransferResult } from '../club/transfers';
import { askingSalary } from '../club/valuation';
import { isTransferWindowOpen } from '../league/calendar';
import { autoLineup, MAX_BENCH_SIZE, validateLineup, type LineupError } from '../league/lineup';
import { FORMATION_SLOTS, isAvailable, overall, ratingAtPosition } from '../player/rating';
import { defaultTrainingFocus } from '../club/training';
import { FACILITIES, facilitiesOf, upgradeCost } from '../club/facilities';
import type { FacilityId, Instructions, Lineup, TrainingFocus } from '../types';
import { humanClub, humanDivision, humanSquad, outlookOf, replacePlayers, writeOutlook } from './selectors';
import type { CoachOffer, GameState } from './state';
import { asCoachOfClub, coachOfClub, isMultiplayer } from './coaches';
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
  if (isCoachPlayer(state, playerId)) return refused('Ce joueur appartient à un autre coach : fais-lui une offre.');
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

// --- Offres entre coachs (MULTI-08) --------------------------------------------------

/** Validité d'une offre entre coachs, comme celles des clubs IA. */
export const COACH_OFFER_WEEKS = 2;

/** Joueur d'un autre coach de la ligue : on ne l'achète pas, on fait une offre. */
export function isCoachPlayer(state: GameState, playerId: string): boolean {
  const clubId = state.players[playerId]?.clubId;
  return isMultiplayer(state) && clubId !== null && clubId !== undefined && clubId !== state.humanClubId && state.clubs[clubId]?.isHuman === true;
}

function coachName(state: GameState, clubId: string): string {
  const coachId = coachOfClub(state, clubId);
  return state.coaches?.find((coach) => coach.id === coachId)?.name ?? state.clubs[clubId]?.name ?? 'un coach';
}

function playerLabel(state: GameState, playerId: string): string {
  const player = state.players[playerId];
  return player ? `${player.firstName} ${player.lastName}` : 'un joueur';
}

const euros = (amount: number) => `${amount.toLocaleString('fr-FR')} €`;

/** Offres reçues par le coach au focus, et celles qu'il a envoyées. */
export function coachOffersReceived(state: GameState): CoachOffer[] {
  return (state.coachOffers ?? []).filter((offer) => offer.toClubId === state.humanClubId);
}

export function coachOffersSent(state: GameState): CoachOffer[] {
  return (state.coachOffers ?? []).filter((offer) => offer.fromClubId === state.humanClubId);
}

/** Le coach propose un montant libre pour le joueur d'un autre coach ; l'offre arrive chez lui. */
export function makeCoachOffer(state: GameState, playerId: string, amount: number): ActionResult {
  if (!isCoachPlayer(state, playerId)) return refused('On ne fait une offre que sur le joueur d’un autre coach.');
  if (!transferWindowOpen(state)) return refused('Le mercato est fermé : reviens pendant la fenêtre des transferts.');
  const price = Math.round(amount);
  if (!Number.isFinite(price) || price <= 0) return refused('Propose un montant, même symbolique.');
  if (humanClub(state).budget < price) return refused(`Pas assez d'argent : il manque ${euros(price - humanClub(state).budget)}.`);
  const sellerId = state.players[playerId]!.clubId!;
  const offer: CoachOffer = {
    id: `coach-offer-${state.season}-${state.week}-${playerId}-${state.humanClubId}`,
    playerId,
    fromClubId: state.humanClubId,
    toClubId: sellerId,
    amount: price,
    expiresWeek: state.week + COACH_OFFER_WEEKS,
  };
  // Une nouvelle offre sur le même joueur remplace la précédente.
  state.coachOffers = [...(state.coachOffers ?? []).filter((other) => !(other.playerId === playerId && other.fromClubId === state.humanClubId)), offer];
  const buyer = coachName(state, state.humanClubId);
  const target = playerLabel(state, playerId);
  asCoachOfClub(state, sellerId, () => state.news.push(`Offre de ${buyer} : ${euros(price)} pour ${target}. À toi de voir.`));
  return done(`Offre envoyée à ${coachName(state, sellerId)} : ${euros(price)} pour ${target}. Elle tient ${COACH_OFFER_WEEKS} semaines.`);
}

/** L'acheteur retire son offre. */
export function cancelCoachOffer(state: GameState, offerId: string): ActionResult {
  const offer = (state.coachOffers ?? []).find((candidate) => candidate.id === offerId);
  if (!offer || offer.fromClubId !== state.humanClubId) return refused('Cette offre n’est pas à toi.');
  state.coachOffers = state.coachOffers!.filter((candidate) => candidate.id !== offerId);
  return done('Offre retirée.');
}

/** Le vendeur accepte ou refuse : accepté, le joueur part et l'argent change de club. */
export function answerCoachOffer(state: GameState, offerId: string, accept: boolean): ActionResult {
  const offer = (state.coachOffers ?? []).find((candidate) => candidate.id === offerId);
  if (!offer || offer.toClubId !== state.humanClubId) return refused('Cette offre a expiré ou ne t’est pas adressée.');
  const buyer = coachName(state, offer.fromClubId);
  const seller = coachName(state, offer.toClubId);
  const target = playerLabel(state, offer.playerId);
  state.coachOffers = state.coachOffers!.filter((candidate) => candidate.id !== offerId);
  if (!accept) {
    asCoachOfClub(state, offer.fromClubId, () => state.news.push(`${seller} refuse ton offre de ${euros(offer.amount)} pour ${target}.`));
    return done(`Offre de ${buyer} refusée.`);
  }
  if (state.players[offer.playerId]?.clubId !== state.humanClubId) return refused('Ce joueur n’est plus chez toi.');
  const lineup = humanClub(state).lineup;
  const result = applyTransfer(
    state,
    buyPlayer({ clubs: state.clubs, players: state.players }, { buyerId: offer.fromClubId, playerId: offer.playerId, price: offer.amount, windowOpen: transferWindowOpen(state) }),
  );
  if (!result.ok) {
    // Offre impossible (budget de l'acheteur, effectif) : elle reste en place.
    state.coachOffers = [...state.coachOffers!, offer];
    return result;
  }
  // Les autres offres sur ce joueur tombent.
  state.coachOffers = state.coachOffers!.filter((candidate) => candidate.playerId !== offer.playerId);
  state.offers = state.offers.filter((candidate) => candidate.playerId !== offer.playerId);
  refillLineup(state, lineup, offer.playerId);
  asCoachOfClub(state, offer.fromClubId, () => state.news.push(`${seller} accepte ! ${target} te rejoint pour ${euros(offer.amount)}.`));
  return done(`${target} part chez ${buyer} pour ${euros(offer.amount)}.`);
}

/** Offres entre coachs encore valables la semaine qui vient (mercato ouvert, joueur toujours là). */
export function pruneCoachOffers(state: GameState, nextWeek: number, windowOpen: boolean): void {
  if (!state.coachOffers) return;
  state.coachOffers = windowOpen
    ? state.coachOffers.filter((offer) => offer.expiresWeek >= nextWeek && state.players[offer.playerId]?.clubId === offer.toClubId)
    : [];
}

/** Réponse au dialogue de la semaine (CLUB-06). */
export function answerDialogue(state: GameState, choiceId: string): ActionResult {
  const pending = state.dialogue;
  const found = pending && DIALOGUES.find((candidate) => candidate.id === pending.dialogueId);
  if (!pending || !found) return refused('Personne ne t’attend. Profites-en.');
  const dialogue = localizeDialogue(found, humanDivision(state).tier);
  const result = applyDialogueChoice({ outlook: outlookOf(state), squad: humanSquad(state) }, dialogue, choiceId);
  writeOutlook(state, result.outlook);
  replacePlayers(state, result.squad);
  state.dialogue = null;
  return done(result.outcome);
}

/** Reroll en attente, oublié si le joueur a quitté le club entre-temps. */
export function pendingReroll(state: GameState): GameState['abilityReroll'] {
  const offer = state.abilityReroll ?? null;
  if (offer && state.players[offer.playerId]?.clubId !== state.humanClubId) {
    state.abilityReroll = null;
    return null;
  }
  return offer;
}

/** Prix du reroll de la capacité d'un joueur du coach, `null` si sa capacité est encore cachée. */
export function abilityRerollPrice(state: GameState, playerId: string): number | null {
  const player = state.players[playerId];
  if (!player || !player.ability.revealed) return null;
  return rerollPrice(player, getAbility(player.ability.abilityId).rarity, humanDivision(state).tier);
}

/** Paie le reroll (CAP-23) : 3 capacités sont tirées, le coach choisit ensuite avec `chooseRerolledAbility`. */
export function rerollAbility(state: GameState, playerId: string): ActionResult {
  const player = state.players[playerId];
  if (!player || player.clubId !== state.humanClubId) return refused('Ce joueur n’est pas chez toi.');
  const pending = pendingReroll(state);
  if (pending) {
    const name = state.players[pending.playerId]!.lastName;
    return refused(pending.playerId === playerId ? 'Déjà payé : choisis parmi les 3 capacités proposées.' : `Choisis d'abord la nouvelle capacité de ${name}.`);
  }
  const price = abilityRerollPrice(state, playerId);
  if (price === null) return refused('Capacité encore cachée : fais-le jouer pour la découvrir avant de la changer.');
  const club = humanClub(state);
  if (club.budget < price) return refused(`Pas assez d'argent : il manque ${(price - club.budget).toLocaleString('fr-FR')} €.`);
  const rarity = getAbility(player.ability.abilityId).rarity;
  const excluded = new Set(humanSquad(state).map((member) => member.ability.abilityId));
  const options = withRng(state, (rng) => drawRerollOptions(rng, player, rarity, ABILITIES, excluded));
  if (options.length === 0) return refused('Aucune autre capacité disponible pour ce poste.');
  club.budget -= price;
  state.abilityReroll = { playerId, abilityIds: options.map((ability) => ability.id), price };
  const bonus = options.some((ability) => ability.rarity !== rarity) ? ' Coup de chance : une rareté au-dessus dans le lot !' : '';
  return done(`${price.toLocaleString('fr-FR')} € payés. Le préparateur mental propose ${options.length} capacités à ${player.lastName}.${bonus}`);
}

/** Choix après un reroll payé : une des capacités proposées, au niveau 1, ou `null` pour garder l'ancienne. */
export function chooseRerolledAbility(state: GameState, abilityId: string | null): ActionResult {
  const offer = pendingReroll(state);
  if (!offer) return refused('Aucun reroll en attente.');
  const player = state.players[offer.playerId]!;
  if (abilityId !== null && !offer.abilityIds.includes(abilityId)) return refused('Cette capacité ne faisait pas partie des propositions.');
  state.abilityReroll = null;
  if (abilityId === null) return done(`${player.lastName} garde sa capacité. L'argent, lui, ne revient pas.`);
  state.players[player.id] = { ...player, ability: { abilityId, level: 1, xp: 0, revealed: true } };
  return done(`${player.lastName} apprend « ${getAbility(abilityId).name} ». Il repart au niveau 1.`);
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
