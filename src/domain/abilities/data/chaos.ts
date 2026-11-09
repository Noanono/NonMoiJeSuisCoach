import type { Ability } from '../../types';

/** Amende standard infligée au club pour un incident en tribune ou sur la pelouse. */
const CLUB_FINE = 500;

/** Chaos (CAT-01). */
export const CHAOS_ABILITIES: readonly Ability[] = [
  {
    id: 'le-streaker',
    name: 'Le Streaker',
    rarity: 'rare',
    category: 'chaos',
    position: 'BENCH',
    targeting: { kind: 'self' },
    trigger: 'anytime',
    description: 'Un pote nu envahit le terrain : l’action adverse en cours est annulée',
    downside: 'Amende pour le club et article dans la presse locale',
    level5Text: 'Utilisable 2 fois',
    base: {
      successChance: 1,
      effects: [{ type: 'cancelAction' }],
      risks: [
        {
          chance: 1,
          label: 'Amende et presse locale',
          effects: [
            { type: 'fine', amount: CLUB_FINE },
            { type: 'press', headline: 'Un supporter en tenue d’Adam traverse la pelouse : le club passe à la caisse' },
          ],
        },
      ],
      cooldown: { kind: 'perMatch', uses: 1 },
      cost: 3,
    },
    level5: { cooldown: { kind: 'perMatch', uses: 2 } },
    tags: ['vice'],
    hidden: false,
  },
  {
    id: 'le-chien-du-president',
    name: 'Le Chien du président',
    rarity: 'rare',
    category: 'chaos',
    position: 'BENCH',
    targeting: { kind: 'randomOpponent', count: 1 },
    trigger: 'anytime',
    description: 'Lâche le chien sur le terrain : un joueur est poursuivi, hors jeu 3 min',
    downside: '30 % que ce soit un de ses joueurs',
    level5Text: '90 % de viser un adversaire',
    base: {
      successChance: 0.7,
      effects: [{ type: 'knockout', scope: 'targets', duration: 3 }],
      // Le chien se trompe de camp : un seul de ses joueurs, tiré au hasard dans l'équipe.
      risks: [
        {
          chance: 0.3,
          label: 'Le chien se trompe de camp',
          effects: [{ type: 'knockout', scope: 'team', duration: 3, chance: 0.1 }],
        },
      ],
      cooldown: { kind: 'perMatch', uses: 1 },
      cost: 2,
    },
    level5: {
      successChance: 0.9,
      risks: [
        {
          chance: 0.1,
          label: 'Le chien se trompe de camp',
          effects: [{ type: 'knockout', scope: 'team', duration: 3, chance: 0.1 }],
        },
      ],
    },
    tags: ['family', 'vice'],
    hidden: true,
  },
  {
    id: 'la-coupure-de-courant',
    name: 'La Coupure de courant',
    rarity: 'rare',
    category: 'chaos',
    position: 'BENCH',
    targeting: { kind: 'self' },
    trigger: 'anytime',
    description:
      'Match en nocturne : 3 min de noir, et un but adverse marqué dans la minute précédente est annulé',
    downside: '30 % d’échec et amende pour le club',
    level5Text: '85 % de réussite',
    base: {
      successChance: 0.7,
      effects: [
        { type: 'freeze', duration: 3 },
        { type: 'cancelGoal', withinMinutes: 1 },
      ],
      risks: [{ chance: 0.3, label: 'Échec et amende', effects: [{ type: 'fine', amount: CLUB_FINE }] }],
      cooldown: { kind: 'perMatch', uses: 1 },
      cost: 3,
    },
    level5: {
      successChance: 0.85,
      risks: [{ chance: 0.15, label: 'Échec et amende', effects: [{ type: 'fine', amount: CLUB_FINE }] }],
    },
    tags: ['vice'],
    hidden: true,
  },
  {
    id: 'le-fumigene',
    name: 'Le Fumigène',
    rarity: 'common',
    category: 'chaos',
    position: 'BENCH',
    targeting: { kind: 'self' },
    trigger: 'anytime',
    description: '5 min de brouillard : −50 % sur les tirs de loin pour tout le monde',
    downside: 'Amende pour le club',
    level5Text: 'Le brouillard ne couvre que la moitié adverse',
    base: {
      successChance: 1,
      effects: [
        { type: 'modifier', scope: 'team', stat: 'shooting', value: -0.5, duration: 5 },
        { type: 'modifier', scope: 'opponents', stat: 'shooting', value: -0.5, duration: 5 },
      ],
      risks: [{ chance: 1, label: 'Amende', effects: [{ type: 'fine', amount: CLUB_FINE }] }],
      cooldown: { kind: 'perMatch', uses: 1 },
      cost: 2,
    },
    level5: { effects: [{ type: 'modifier', scope: 'opponents', stat: 'shooting', value: -0.5, duration: 5 }] },
    tags: ['vice'],
    hidden: false,
  },
  {
    id: 'les-pigeons',
    name: 'Les Pigeons',
    rarity: 'common',
    category: 'chaos',
    position: 'MID',
    targeting: { kind: 'randomOpponent', count: 1 },
    trigger: 'anytime',
    description: 'Graines dans les poches : un adversaire au hasard reçoit une fiente, −30 % de concentration 5 min',
    downside: '20 % que la fiente tombe sur lui',
    level5Text: '2 adversaires visés',
    base: {
      successChance: 1,
      effects: [{ type: 'modifier', scope: 'targets', stat: 'concentration', value: -0.3, duration: 5 }],
      risks: [
        {
          chance: 0.2,
          label: 'Fiente sur lui',
          effects: [{ type: 'modifier', scope: 'self', stat: 'concentration', value: -0.3, duration: 5 }],
        },
      ],
      cooldown: { kind: 'minutes', value: 20 },
      cost: 1,
    },
    // Le nombre de cibles est porté par `targeting`, hors de portée de la surcharge de niveau 5.
    level5: {},
    tags: [],
    hidden: false,
  },
  {
    id: 'le-rot-du-siecle',
    name: 'Le Rot du siècle',
    rarity: 'common',
    category: 'chaos',
    position: 'ANY',
    targeting: { kind: 'opponentTeam' },
    trigger: 'anytime',
    description: 'Rot monumental : −10 % de moral pour toute l’équipe adverse',
    downside: 'Carton jaune au premier contact qui suit',
    level5Text: '−20 %',
    base: {
      successChance: 1,
      effects: [{ type: 'morale', scope: 'opponents', value: -0.1 }],
      risks: [
        { chance: 1, label: 'Carton au premier contact', effects: [{ type: 'card', scope: 'self', card: 'yellow', chance: 1 }] },
      ],
      cooldown: { kind: 'perMatch', uses: 1 },
      cost: 1,
    },
    level5: { effects: [{ type: 'morale', scope: 'opponents', value: -0.2 }] },
    tags: ['vice'],
    hidden: false,
  },
];
