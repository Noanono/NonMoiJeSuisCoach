import type { Ability } from '../../types';
import { defineAbility } from './define';

/**
 * Mythiques : changent les règles du match, et se jouent autour.
 * Le coût en Gueulante (1 à 7) est propre à chaque capacité et suit sa puissance mesurée (CAT-01).
 */
const mythic = (cost: number, spec: Parameters<typeof defineAbility>[1]): Ability => defineAbility('mythic', { ...spec, cost });

export const MYTHIC_ABILITIES: readonly Ability[] = [
  mythic(2, {
    id: 'la-coupure-pub',
    name: 'La Coupure pub',
    category: 'support',
    position: 'BENCH',
    targeting: { kind: 'team' },
    levelBoost: 0.15,
    description: 'Page de publicité : le match s’arrête dix minutes. Les effets en cours, eux, continuent de s’écouler.',
    effects: [
      { type: 'deadMinutes', duration: 10 },
      { type: 'energy', scope: 'team', value: 0.5 },
    ],
  }),
  mythic(4, {
    id: 'le-maillot-retourne',
    name: 'Le Maillot retourné',
    category: 'legendary',
    position: 'ANY',
    targeting: { kind: 'opponentTeam' },
    levelGain: 2.5,
    description: 'Tout le monde échange son maillot. Pendant un bon moment, ton équipe a le niveau de l’autre.',
    effects: [{ type: 'swapTeams', duration: 40 }],
  }),
  mythic(6, {
    id: 'le-rideau-de-fer',
    name: 'Le Rideau de fer',
    category: 'legendary',
    position: 'DEF',
    targeting: { kind: 'teammate', count: 3, line: 'DEF' },
    levelBoost: 0.25,
    description: 'La défense se met en ligne, bras dessus, bras dessous. Plus rien ne passe jusqu’au coup de sifflet.',
    effects: [
      { type: 'shield', scope: 'self', charges: 2, duration: 45 },
      { type: 'shield', scope: 'targets', charges: 2, duration: 45 },
      { type: 'modifier', scope: 'team', stat: 'defense', value: 8, duration: 90 },
      { type: 'opponentChanceMalus', value: 0.9, shots: 10 },
      { type: 'cancelAction', count: 3 },
    ],
  }),
  mythic(7, {
    id: 'la-machine-a-remonter-le-temps',
    name: 'La Machine à remonter le temps',
    category: 'legendary',
    position: 'GK',
    condition: { score: 'behind' },
    description: 'Il a bricolé la pendule du club. Les vingt dernières minutes n’ont jamais existé.',
    effects: [
      { type: 'rewind', minutes: 20 },
      { type: 'modifier', scope: 'team', stat: 'all', value: 0.6, duration: 20 },
    ],
  }),
  mythic(6, {
    id: 'le-recrutement-sauvage',
    name: 'Le Recrutement sauvage',
    category: 'legendary',
    position: 'MID',
    targeting: { kind: 'opponentTeam' },
    levelGain: 2,
    description: 'Un contrat signé sur un coin de nappe, en plein match. Leur meilleur joueur change de maillot.',
    effects: [{ type: 'poachBest' }, { type: 'modifier', scope: 'team', stat: 'all', value: 0.6, duration: 30 }],
  }),
  mythic(7, {
    id: 'le-but-qui-compte-double',
    name: 'Le But qui compte double',
    category: 'legendary',
    position: 'ATT',
    targeting: { kind: 'team' },
    description: '« Le prochain compte double ! » Comme dans la cour de récré, sauf que l’arbitre est d’accord.',
    effects: [
      { type: 'doubleGoals', duration: 25 },
      { type: 'modifier', scope: 'team', stat: 'all', value: 1.0, duration: 25 },
    ],
  }),
  mythic(7, {
    id: 'la-resurrection',
    name: 'La Résurrection',
    category: 'legendary',
    position: 'DEF',
    targeting: { kind: 'team' },
    description: 'Les exclus reviennent, les blessés gambadent. Personne n’ose demander comment.',
    effects: [
      { type: 'miracle' },
      { type: 'modifier', scope: 'team', stat: 'all', value: 0.8, duration: 25 },
    ],
  }),
  mythic(3, {
    id: 'le-docteur-miracle',
    name: 'Le Docteur Miracle',
    category: 'legendary',
    position: 'BENCH',
    targeting: { kind: 'team' },
    levelBoost: 0.08,
    description: 'Il s’assoit sur le banc avec sa mallette. À partir de là, plus personne ne reste par terre.',
    effects: [
      { type: 'fieldDoctor', reviveAfter: 2, malusFactor: 0.5 },
      { type: 'energy', scope: 'team', value: 0.9 },
    ],
  }),
];
