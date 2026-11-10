import { describe, expect, test } from 'bun:test';
import { ABILITIES } from '../abilities/catalog';
import { IMPACT_TARGETS, measureAbility, SITUATIONAL_ABILITIES } from './impactBench';

/**
 * Garde-fou de l'équilibrage (docs/equilibrage-capacites.md). Le rapport complet, sur 1 000 matchs
 * par capacité : `bun run impact`. Ici, 150 matchs par capacité : la mesure est bruitée, d'où la marge.
 */
const RUNS = 150;
const NOISE_MARGIN = 0.15;

describe('impact des capacités en match (CAP-09)', () => {
  test.each(ABILITIES.map((ability) => [ability.id] as const))('%s reste dans la fourchette de sa rareté', (id) => {
    const ability = ABILITIES.find((entry) => entry.id === id)!;
    const report = measureAbility(id, RUNS);
    const target = IMPACT_TARGETS[ability.rarity];
    // Un déclencheur rare (penalty adverse…) ne se présente pas à chaque match.
    expect(report.activationRate).toBeGreaterThan(ability.trigger === 'anytime' ? 0.9 : 0);
    expect(report.pointsDelta).toBeGreaterThan(target.min - NOISE_MARGIN);
    if (!SITUATIONAL_ABILITIES.includes(id)) expect(report.pointsDelta).toBeLessThan(target.max + NOISE_MARGIN);
  });
});
