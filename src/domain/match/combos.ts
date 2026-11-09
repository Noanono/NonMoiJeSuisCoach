/**
 * Combos (CAP-15) : deux capacités compatibles d'un même camp, réussies à moins
 * de 5 minutes d'intervalle, déclenchent les effets et revers du combo.
 */
import { findCombo } from '../abilities/catalog';
import { applyRisks } from './activation';
import { comment } from './commentary';
import { applyEffects } from './effects';
import { pushEvent, requirePlayer, teamOf, type Run } from './state';
import type { ActivationRecord } from './types';

export const COMBO_WINDOW_MINUTES = 5;

/** Cherche un partenaire de combo pour l'activation qui vient de réussir, et le joue. Mute l'état. */
export function checkCombo(run: Run, record: ActivationRecord): void {
  const { state } = run;
  if (state.combos.length === 0) return;
  for (const partner of state.activations) {
    if (!isComboPartner(record, partner, state.elapsed)) continue;
    const combo = findCombo(partner.abilityId, record.abilityId, state.combos);
    if (!combo) continue;
    partner.usedInCombo = record.usedInCombo = true;
    partner.comboName = record.comboName = combo.name;
    state.combosTriggered.push({ side: record.side, name: combo.name, minute: state.minute });
    const team = teamOf(state, record.side);
    pushEvent(run, 'combo', record.side, comment(run.rng, 'combo', { team: team.name, label: combo.name }));
    const source = requirePlayer(state, record.playerId);
    const participants = [requirePlayer(state, partner.playerId), source];
    const targets = [...partner.targetIds, ...record.targetIds].map((id) => requirePlayer(state, id));
    const context = { run, side: record.side, source, participants, targets, label: combo.name, activation: record };
    applyEffects(context, combo.effects);
    applyRisks({ ...context, activation: null }, combo.risks, record);
    return;
  }
}

function isComboPartner(record: ActivationRecord, candidate: ActivationRecord, elapsed: number): boolean {
  return (
    candidate !== record &&
    candidate.side === record.side &&
    candidate.success &&
    !candidate.usedInCombo &&
    elapsed - candidate.elapsed < COMBO_WINDOW_MINUTES
  );
}
