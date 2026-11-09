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
export { canEnter, canLeave, MAX_SUBSTITUTIONS, substitutePlayer, substitutionsLeft } from './substitutions';
export { summarize, toMatchResult } from './summary';
export { simulateQuick } from './quick';
export { activeEffects, type ActiveEffectView } from './queries';
export { GAUGE_MAX, GAUGE_START } from './state';
export type * from './types';
