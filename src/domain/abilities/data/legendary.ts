import type { Ability } from '../../types';
import { defineAbility } from './define';

/**
 * Légendaires : plusieurs mécaniques qui se combinent, à préparer.
 * Le coût en Gueulante (1 à 7) est propre à chaque capacité et suit sa puissance mesurée (CAT-01).
 */
const legendary = (cost: number, spec: Parameters<typeof defineAbility>[1]): Ability => defineAbility('legendary', { ...spec, cost });

export const LEGENDARY_ABILITIES: readonly Ability[] = [
  legendary(3, {
    id: 'le-gardien-libero',
    name: 'Le Gardien libéro',
    category: 'attack',
    position: 'GK',
    description: 'Il monte sur le corner, puis reste devant. Ça finit en but… d’un côté ou de l’autre.',
    effects: [
      {
        type: 'gamble',
        chance: 0.6,
        success: [
          { type: 'instantChance', chance: 0.95 },
          { type: 'modifier', scope: 'team', stat: 'all', value: 0.3, duration: 15 },
        ],
        failure: [{ type: 'opponentChance', chance: 0.35 }],
      },
    ],
  }),
  legendary(4, {
    id: 'le-gardien-forteresse',
    name: 'Le Gardien-forteresse',
    category: 'defense',
    position: 'GK',
    targeting: { kind: 'teammate', count: 2 },
    levelBoost: 0.06,
    description: 'Il a tendu une corde à linge devant la cage, et il y abrite deux copains. Rien ne passe, ni ballon ni sortilège.',
    effects: [
      { type: 'shield', scope: 'self', charges: 2, duration: 45 },
      { type: 'shield', scope: 'targets', charges: 2, duration: 45 },
      { type: 'modifier', scope: 'self', stat: 'goalkeeping', value: 9, duration: 60 },
      { type: 'modifier', scope: 'team', stat: 'defense', value: 3.5, duration: 45 },
    ],
  }),
  legendary(3, {
    id: 'le-mur-humain',
    name: 'Le Mur humain',
    category: 'defense',
    position: 'DEF',
    targeting: { kind: 'teammate', count: 2, line: 'DEF' },
    description: 'Deux défenseurs derrière lui, bras croisés. Sur eux, rien ne prend, pas même les sorts du sorcier d’en face.',
    effects: [
      { type: 'shield', scope: 'self', charges: 1, duration: 35 },
      { type: 'shield', scope: 'targets', charges: 1, duration: 35 },
      { type: 'modifier', scope: 'team', stat: 'defense', value: 1.5, duration: 25 },
      { type: 'opponentChanceMalus', value: 0.6, shots: 2 },
    ],
  }),
  legendary(3, {
    id: 'le-car-a-deux-etages',
    name: 'Le Car à deux étages',
    category: 'defense',
    position: 'DEF',
    targeting: { kind: 'team' },
    fixedDuration: true,
    levelBoost: 0.11,
    description: 'On gare le car devant le but. Si rien ne rentre, le coach retrouve de la voix.',
    effects: [
      { type: 'modifier', scope: 'team', stat: 'defense', value: 3.0, duration: 45 },
      { type: 'cleanSheetGauge', value: 3, duration: 45 },
    ],
  }),
  legendary(5, {
    id: 'le-marquage-de-l-enfer',
    name: 'Le Marquage de l’enfer',
    category: 'sabotage',
    position: 'DEF',
    targeting: { kind: 'opponent', count: 2 },
    description: 'Deux joueurs, un seul défenseur, et aucun des deux ne touche un ballon. Mets-le au sol et tout s’écroule.',
    effects: [{ type: 'mark', stat: 'all', value: -0.9, duration: 45 }],
  }),
  legendary(3, {
    id: 'le-copieur',
    name: 'Le Copieur',
    category: 'support',
    position: 'MID',
    description: 'Il regarde ce que fait l’autre, et il fait pareil. En mieux, dit-il.',
    effects: [
      { type: 'copyLast' },
      { type: 'modifier', scope: 'team', stat: 'all', value: 0.15, duration: 20 },
    ],
  }),
  legendary(3, {
    id: 'le-voleur-de-sifflet',
    name: 'Le Voleur de sifflet',
    category: 'sabotage',
    position: 'MID',
    levelGain: 0.45,
    description: 'Il a piqué le sifflet du coach adverse. L’autre mime, c’est moins efficace.',
    effects: [
      { type: 'stealGauge', value: 2 },
      { type: 'modifier', scope: 'opponents', stat: 'concentration', value: -0.35, duration: 18 },
    ],
  }),
  legendary(3, {
    id: 'la-celebration-interdite',
    name: 'La Célébration interdite',
    category: 'attack',
    position: 'ATT',
    trigger: 'afterOwnGoal',
    targeting: { kind: 'team' },
    description: 'Il enlève son maillot, son short, et court vers la buvette. L’équipe est galvanisée, l’adversaire traumatisé.',
    effects: [
      { type: 'modifier', scope: 'team', stat: 'all', value: 0.2, duration: 20 },
      { type: 'modifier', scope: 'opponents', stat: 'concentration', value: -0.2, duration: 20 },
    ],
  }),
  legendary(5, {
    id: 'la-remontada-du-dimanche',
    name: 'La Remontada du dimanche',
    category: 'attack',
    position: 'ATT',
    targeting: { kind: 'team' },
    condition: { score: 'behind' },
    levelGain: 0.3,
    description: 'Mené, il fait un discours de film américain. Plus le score est lourd, plus ça marche.',
    effects: [{ type: 'scaledModifier', scope: 'team', stat: 'all', base: 0.1, perUnit: 0.35, per: 'goalDeficit', duration: 40 }],
  }),
  legendary(5, {
    id: 'le-double-ou-rien',
    name: 'Le Double ou rien',
    category: 'attack',
    position: 'ATT',
    description: 'Il parie sa prime de match sur un retourné acrobatique.',
    effects: [
      {
        type: 'gamble',
        chance: 0.6,
        success: [
          { type: 'instantChance', chance: 0.95 },
          { type: 'modifier', scope: 'team', stat: 'all', value: 0.8, duration: 25 },
        ],
        failure: [{ type: 'opponentChance', chance: 0.4 }],
      },
    ],
  }),
  legendary(5, {
    id: 'le-discours-de-la-mi-temps',
    name: 'Le Discours de la mi-temps',
    category: 'support',
    position: 'ANY',
    trigger: 'halftime',
    targeting: { kind: 'team' },
    description: 'Il cite Napoléon, sa grand-mère et un épisode de série. Ils rentrent sur le terrain en pleurant.',
    effects: [
      { type: 'modifier', scope: 'team', stat: 'all', value: 0.42, duration: 45 },
      { type: 'energy', scope: 'team', value: 0.4 },
    ],
  }),
  legendary(3, {
    id: 'le-remede-de-grand-mere',
    name: 'Le Remède de grand-mère',
    category: 'support',
    position: 'ANY',
    trigger: 'halftime',
    targeting: { kind: 'team' },
    levelBoost: 0.08,
    description: 'Une cuillère à la pause, pour tout le monde. Ça pique, ça réveille, et plus rien ne les fait tomber.',
    effects: [
      { type: 'energy', scope: 'team', value: 0.75 },
      { type: 'clearMaluses', bonusGauge: 0, threshold: 0 },
      { type: 'steady', scope: 'team', duration: 15 },
    ],
  }),
  legendary(5, {
    id: 'le-penalty-imaginaire',
    name: 'Le Penalty imaginaire',
    category: 'attack',
    position: 'ANY',
    trigger: 'ownFreeKick',
    description: 'Il s’écroule à trente mètres en se tenant le visage. L’arbitre montre le point de penalty.',
    effects: [
      { type: 'turnIntoPenalty' },
      { type: 'modifier', scope: 'opponents', stat: 'all', value: -0.35, duration: 15 },
    ],
  }),
  legendary(5, {
    id: 'le-coup-de-sifflet-tardif',
    name: 'Le Coup de sifflet tardif',
    category: 'attack',
    position: 'BENCH',
    condition: { score: 'notAhead', fromMinute: 80 },
    description: 'L’arbitre est son beau-frère. Le match finira quand on aura marqué.',
    effects: [
      { type: 'addedTime', minutes: 8 },
      { type: 'modifier', scope: 'team', stat: 'all', value: 0.7, duration: 20 },
    ],
  }),
  legendary(5, {
    id: 'le-tifo-geant',
    name: 'Le Tifo géant',
    category: 'support',
    position: 'BENCH',
    targeting: { kind: 'team' },
    description: 'Toute la tribune déplie la bâche. Plus il y a de monde derrière, plus ça pousse.',
    effects: [{ type: 'overcharge', scope: 'team', stat: 'all', perPoint: 0.11, duration: 25 }],
  }),
  legendary(5, {
    id: 'les-plombs-qui-sautent',
    name: 'Les Plombs qui sautent',
    category: 'defense',
    position: 'BENCH',
    requiresRecentOpponentGoal: 5,
    description: 'Il branche la friteuse et le projecteur sur la même prise. Le dernier but n’a jamais existé.',
    effects: [
      { type: 'cancelGoal', withinMinutes: 5 },
      { type: 'modifier', scope: 'opponents', stat: 'concentration', value: -0.2, duration: 10 },
    ],
  }),
];
