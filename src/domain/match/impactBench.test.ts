import { describe, expect, test } from 'bun:test';
import { ABILITIES } from '../abilities/catalog';
import { impactTarget, measureAbility, playablePoints } from './impactBench';

/**
 * Garde-fou de l'équilibrage (docs/equilibrage-capacites.md) : chaque capacité rapporte ce que vaut son coût
 * en Gueulante. Le rapport complet, sur 1 000 matchs par capacité : `bun run impact`. Ici, 400 matchs par
 * capacité : la marge suit l'erreur de mesure (2,5 erreurs types), pour ne signaler qu'un vrai déséquilibre.
 */
const RUNS = 400;
const ERRORS_ALLOWED = 2.5;
const BASE_MARGIN = 0.03;

describe('impact des capacités en match (CAP-09)', () => {
  test.each(ABILITIES.map((ability) => [ability.id] as const))('%s reste dans la fourchette de son coût', (id) => {
    const ability = ABILITIES.find((entry) => entry.id === id)!;
    const report = measureAbility(id, RUNS);
    const target = impactTarget(report.cost);
    // Une condition (score, minute) ou un déclencheur rare ne se présente pas à chaque match.
    expect(report.activationRate).toBeGreaterThan(ability.trigger === 'anytime' && !ability.condition ? 0.9 : 0);
    const points = playablePoints(report);
    const share = report.pointsDelta === 0 ? 1 : points / report.pointsDelta;
    const margin = BASE_MARGIN + ERRORS_ALLOWED * report.pointsStdError * share;
    expect(points).toBeGreaterThan(target.min - margin);
    expect(points).toBeLessThan(target.max + margin);
  });
});
