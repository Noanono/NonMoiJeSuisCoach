/**
 * Mesure l'impact réel de chaque capacité en match et affiche un tableau Markdown.
 * Usage : bun scripts/ability-impact.ts [matchs par capacité, 1000 par défaut]
 */
import { ABILITIES } from '../src/domain/abilities/catalog';
import { impactTable, measureAbility } from '../src/domain/match/impactBench';

const runs = Number(process.argv[2] ?? 1000);
console.log(impactTable(ABILITIES.map((ability) => measureAbility(ability.id, runs))));
