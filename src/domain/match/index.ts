/**
 * Moteur de match (MATCH-01 à MATCH-07, CAP-03 à CAP-20) : API publique.
 */
export { createMatch } from './state';
export { tick, isPaused, setInstructions } from './simulation';
export {
  previewActivation,
  startActivation,
  selectTarget,
  confirmActivation,
  cancelActivation,
} from './activation';
export { dismissEventWindow } from './windows';
export {
  chooseFreeKickOption,
  chooseKeeperDive,
  choosePenaltyStyle,
  chooseWall,
  defaultFreeKickOption,
  defaultWall,
  FREE_KICK_CONVERSION,
  FREE_KICK_DISTANCE_LABEL,
  freeKickChances,
  type FreeKickChance,
  WALL_FACTOR,
} from './plays';
export { canEnter, canLeave, canMoveToLine, canReposition, canSwapPositions, MAX_SUBSTITUTIONS, moveToLine, substitutePlayer, substitutionsLeft, swapPositions } from './substitutions';
export { expectedAgainstDive, expectedPenaltyChance, KEEPER_HABIT_LABEL, KEEPER_STAY_CHANCE, keeperHabit, PENALTY_STYLE_LABEL } from './penaltyKick';
export { summarize, toMatchResult } from './summary';
export { simulateQuick } from './quick';
export { activeEffects, type ActiveEffectView } from './queries';
export { GAUGE_MAX, GAUGE_START } from './state';
export type * from './types';
