import type { Ability } from '../../types';
import { defineAbility } from './define';

/** Rares (CAT-01) : plus fortes que les communes, avec une petite mécanique en plus. */
const rare = (spec: Parameters<typeof defineAbility>[1]): Ability => defineAbility('rare', spec);

const UNTIL_END_OF_EFFECT = 15;

export const RARE_ABILITIES: readonly Ability[] = [
  rare({
    id: 'le-gardien-kamikaze',
    name: 'Le Gardien kamikaze',
    category: 'defense',
    position: 'GK',
    description: 'Sort de sa surface sans regarder, en hurlant.',
    effects: [{ type: 'cancelAction', count: 2 }, { type: 'gauge', value: 1 }],
  }),
  rare({
    id: 'le-gardien-fumeur',
    name: 'Le Gardien fumeur',
    category: 'defense',
    position: 'GK',
    description: 'Pause clope au poteau. Plus il encaisse, plus il se concentre.',
    effects: [{ type: 'scaledModifier', scope: 'self', stat: 'goalkeeping', base: 0.5, perUnit: 0.3, per: 'concededGoal', duration: 23 }],
  }),
  rare({
    id: 'le-bus-de-l-amicale',
    name: 'Le Bus de l’amicale',
    category: 'defense',
    position: 'DEF',
    targeting: { kind: 'team' },
    description: 'Toute l’équipe recule et se gare devant la cage.',
    effects: [
      { type: 'modifier', scope: 'team', stat: 'defense', value: 0.7, duration: UNTIL_END_OF_EFFECT },
      { type: 'cleanSheetGauge', value: 2, duration: UNTIL_END_OF_EFFECT },
    ],
  }),
  rare({
    id: 'le-boucher-du-village',
    name: 'Le Boucher du village',
    category: 'sabotage',
    position: 'DEF',
    targeting: { kind: 'opponent', count: 1 },
    description: 'Tacle par derrière, comme au marché : au poids.',
    effects: [{ type: 'knockout', scope: 'targets', duration: 23 }],
  }),
  rare({
    id: 'le-vomisseur',
    name: 'Le Vomisseur',
    category: 'sabotage',
    position: 'MID',
    targeting: { kind: 'zone' },
    description: 'Le déjeuner remonte. Tout le monde glisse autour de lui.',
    effects: [{ type: 'knockout', scope: 'zoneOpponents', duration: 5 }],
  }),
  rare({
    id: 'le-retraite-de-42-ans',
    name: 'Le Retraité de 42 ans',
    category: 'attack',
    position: 'MID',
    targeting: { kind: 'team' },
    description: 'Il ne court plus, mais il voit tout : deux passes de génie.',
    effects: [
      { type: 'chanceBoost', value: 0.4 },
      { type: 'chanceBoost', value: 0.4 },
    ],
  }),
  rare({
    id: 'le-pique-assiette',
    name: 'Le Pique-assiette',
    category: 'sabotage',
    position: 'MID',
    description: 'Il pique la voix du coach adverse, en plus de ses chips.',
    effects: [{ type: 'stealGauge', value: 2 }],
  }),
  rare({
    id: 'le-sombrero-bourre',
    name: 'Le Sombrero bourré',
    category: 'attack',
    position: 'ATT',
    description: 'Dribble en titubant et se retrouve seul devant la cage.',
    effects: [{ type: 'chanceBoost', value: 0.5, carrier: true }],
  }),
  rare({
    id: 'le-revenant-de-la-feria',
    name: 'Le Revenant de la Feria',
    category: 'attack',
    position: 'ATT',
    description: 'La gueule de bois se dissipe : plus il est tard, plus il est fort.',
    effects: [{ type: 'scaledModifier', scope: 'self', stat: 'shooting', base: 0, perUnit: 0.01, per: 'minute', duration: 23 }],
  }),
  rare({
    id: 'le-chef-de-chant',
    name: 'Le Chef de chant',
    category: 'support',
    position: 'ANY',
    targeting: { kind: 'team' },
    description: 'Chant de buvette repris par toute l’équipe, tant que ça marque.',
    effects: [{ type: 'modifier', scope: 'team', stat: 'all', value: 0.2, duration: UNTIL_END_OF_EFFECT, extendOnGoal: 5 }],
  }),
  rare({
    id: 'le-capitaine-gueulard',
    name: 'Le Capitaine gueulard',
    category: 'support',
    position: 'ANY',
    targeting: { kind: 'team' },
    description: 'Il hurle si fort que tout le monde oublie ses malheurs.',
    effects: [{ type: 'clearMaluses', bonusGauge: 1, threshold: 3 }],
  }),
  rare({
    id: 'le-chien-du-president',
    name: 'Le Chien du président',
    category: 'sabotage',
    position: 'BENCH',
    targeting: { kind: 'opponent', count: 1 },
    description: 'Lâché sur la pelouse, il change de victime quand il s’ennuie.',
    effects: [{ type: 'knockout', scope: 'targets', duration: 8, chaseDuration: 8 }],
  }),
];
