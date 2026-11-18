import type { Ability } from '../../types';
import { defineAbility } from './define';

/**
 * Étrangères (UNIV-10) : deux capacités typiques par nation étrangère, entre rare et mythique en puissance.
 * Jamais tirées au hasard : seuls les joueurs de ces nations les portent, et un club n'en aligne que
 * 1 à 3 selon sa division (CAP-24).
 */
const foreign = (cost: number, spec: Parameters<typeof defineAbility>[1]): Ability => defineAbility('foreign', { ...spec, cost });

export const FOREIGN_ABILITIES: readonly Ability[] = [
  // --- Chine ---------------------------------------------------------------
  foreign(5, {
    id: 'la-grande-muraille',
    name: 'La Grande Muraille',
    category: 'defense',
    position: 'DEF',
    targeting: { kind: 'team' },
    levelBoost: 0.12,
    description: 'Elle a tenu deux mille ans, elle tiendra bien jusqu’à la mi-temps. Les attaquants la longent sans jamais trouver la porte.',
    effects: [
      { type: 'modifier', scope: 'team', stat: 'defense', value: 4.5, duration: 30 },
      { type: 'opponentChanceMalus', value: 0.6, shots: 4 },
      { type: 'cancelAction', count: 3 },
    ],
  }),
  foreign(4, {
    id: 'made-in-china',
    name: 'Made in China',
    category: 'support',
    position: 'MID',
    targeting: { kind: 'team' },
    description: 'Il refait exactement ce que vient de faire l’adversaire, en moins cher. La notice est en mandarin, mais ça marche.',
    effects: [
      { type: 'copyLast' },
      { type: 'modifier', scope: 'team', stat: 'all', value: 0.45, duration: 20 },
    ],
  }),
  // --- Algérie -------------------------------------------------------------
  foreign(4, {
    id: 'le-the-a-la-menthe',
    name: 'Le Thé à la menthe',
    category: 'support',
    position: 'BENCH',
    targeting: { kind: 'team' },
    description: 'Versé de très haut, très sucré, très chaud. Les jambes repartent, les dents un peu moins.',
    effects: [
      { type: 'energy', scope: 'team', value: 0.6 },
      { type: 'modifier', scope: 'team', stat: 'all', value: 0.4, duration: 20 },
    ],
  }),
  foreign(4, {
    id: 'le-sirocco',
    name: 'Le Sirocco',
    category: 'sabotage',
    position: 'ANY',
    targeting: { kind: 'opponentTeam' },
    levelGain: 0.3,
    description: 'Vent de sable sur la pelouse. En face, on court les yeux plissés et la bouche pleine de désert.',
    effects: [
      { type: 'modifier', scope: 'opponents', stat: 'speed', value: -0.32, duration: 20 },
      { type: 'modifier', scope: 'opponents', stat: 'concentration', value: -0.17, duration: 20 },
    ],
  }),
  // --- Sénégal -------------------------------------------------------------
  foreign(5, {
    id: 'la-lutte-senegalaise',
    name: 'La Lutte sénégalaise',
    category: 'sabotage',
    position: 'DEF',
    targeting: { kind: 'opponent', count: 3 },
    description: 'Champion de lutte le dimanche à Dakar. Ses adversaires vérifient ensuite qu’ils ont encore leurs deux épaules.',
    effects: [{ type: 'knockout', scope: 'targets', duration: 35 }],
  }),
  foreign(4, {
    id: 'la-teranga',
    name: 'La Teranga',
    category: 'sabotage',
    position: 'BENCH',
    targeting: { kind: 'opponentTeam' },
    description: 'Ils offrent le thiéboudienne à l’équipe adverse. Trois assiettes chacun : impossible de refuser, impossible de courir après.',
    effects: [
      { type: 'drain', scope: 'opponents', value: 25 },
      { type: 'modifier', scope: 'team', stat: 'all', value: 0.2, duration: 15 },
    ],
  }),
  // --- Brésil --------------------------------------------------------------
  foreign(4, {
    id: 'le-jogo-bonito',
    name: 'Le Jogo Bonito',
    category: 'attack',
    position: 'ATT',
    description: 'Grand pont, roulette, coup du foulard, et un clin d’œil au public avant de tirer.',
    effects: [
      { type: 'instantChance', chance: 0.6 },
      { type: 'modifier', scope: 'team', stat: 'technique', value: 0.3, duration: 15 },
    ],
  }),
  foreign(5, {
    id: 'le-carnaval',
    name: 'Le Carnaval',
    category: 'legendary',
    position: 'ANY',
    targeting: { kind: 'team' },
    description: 'La batucada descend du virage, les plumes volent : toute la gueulante part dans la fête, et l’adversaire ne sait plus où regarder.',
    effects: [
      { type: 'overcharge', scope: 'team', stat: 'all', perPoint: 0.1, duration: 20 },
      { type: 'modifier', scope: 'opponents', stat: 'concentration', value: -0.3, duration: 15 },
    ],
  }),
];
