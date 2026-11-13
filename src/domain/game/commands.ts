/**
 * Commandes du coach par leur nom (MULTI-05) : en solo, le navigateur les exécute sur sa partie ;
 * en multi, il les envoie au serveur, qui les exécute du point de vue du coach qui les a envoyées.
 * Seules ces commandes peuvent modifier une partie partagée.
 */
import type { MatchSummary } from '../match/types';
import type { FacilityId, Instructions, Lineup, TrainingFocus } from '../types';
import {
  answerCoachOffer,
  answerDialogue,
  answerOffer,
  cancelCoachOffer,
  makeCoachOffer,
  autoPickLineup,
  buy,
  chooseRerolledAbility,
  rerollAbility,
  resetTrainingFocus,
  sellNow,
  setInstructions,
  setLineup,
  setTrainingFocus,
  upgradeFacility,
} from './actions';
import { acceptJob } from './career';
import { applyHumanMatchSummary } from './matches';
import type { GameState } from './state';

export const GAME_COMMANDS = {
  setLineup: (state: GameState, lineup: Lineup) => setLineup(state, lineup),
  autoPickLineup: (state: GameState) => autoPickLineup(state),
  setInstructions: (state: GameState, instructions: Instructions) => setInstructions(state, instructions),
  setTrainingFocus: (state: GameState, playerId: string, focus: TrainingFocus) => setTrainingFocus(state, playerId, focus),
  resetTrainingFocus: (state: GameState) => resetTrainingFocus(state),
  buy: (state: GameState, playerId: string) => buy(state, playerId),
  sellNow: (state: GameState, playerId: string) => sellNow(state, playerId),
  answerOffer: (state: GameState, offerId: string, accept: boolean) => answerOffer(state, offerId, accept),
  answerDialogue: (state: GameState, choiceId: string) => answerDialogue(state, choiceId),
  upgradeFacility: (state: GameState, facilityId: FacilityId) => upgradeFacility(state, facilityId),
  rerollAbility: (state: GameState, playerId: string) => rerollAbility(state, playerId),
  chooseRerolledAbility: (state: GameState, abilityId: string | null) => chooseRerolledAbility(state, abilityId),
  acceptJob: (state: GameState, clubId: string) => acceptJob(state, clubId),
  submitMatch: (state: GameState, summary: MatchSummary) => applyHumanMatchSummary(state, summary),
  makeCoachOffer: (state: GameState, playerId: string, amount: number) => makeCoachOffer(state, playerId, amount),
  cancelCoachOffer: (state: GameState, offerId: string) => cancelCoachOffer(state, offerId),
  answerCoachOffer: (state: GameState, offerId: string, accept: boolean) => answerCoachOffer(state, offerId, accept),
} as const;

export type GameCommands = typeof GAME_COMMANDS;
export type CommandName = keyof GameCommands;
/** Arguments d'une commande, sans la partie. */
export type CommandArgs<Name extends CommandName> = Parameters<GameCommands[Name]> extends [GameState, ...infer Rest] ? Rest : never;
export type CommandResult<Name extends CommandName> = ReturnType<GameCommands[Name]>;

export function isCommandName(name: unknown): name is CommandName {
  return typeof name === 'string' && Object.hasOwn(GAME_COMMANDS, name);
}

/** Exécute une commande sur la partie (du point de vue du coach au focus). */
export function runCommand<Name extends CommandName>(state: GameState, name: Name, args: CommandArgs<Name>): CommandResult<Name> {
  const command = GAME_COMMANDS[name] as (state: GameState, ...rest: unknown[]) => CommandResult<Name>;
  return command(state, ...(args as unknown[]));
}
