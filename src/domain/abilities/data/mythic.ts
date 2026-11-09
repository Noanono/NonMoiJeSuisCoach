import type { Ability } from '../../types';
import { defineAbility } from './define';

/** Mythiques (CAT-01) : elles changent les règles du match, une seule fois par rencontre. */
const mythic = (spec: Omit<Parameters<typeof defineAbility>[1], 'category'>): Ability =>
  defineAbility('mythic', { ...spec, category: 'legendary' });

export const MYTHIC_ABILITIES: readonly Ability[] = [
  mythic({
    id: 'le-transfert-du-parking',
    name: 'Le Transfert du parking',
    position: 'MID',
    targeting: { kind: 'opponentTeam' },
    description: 'Une enveloppe, une poignée de main sur le parking, et leur star enfile ton maillot.',
    effects: [{ type: 'poachBest' }],
  }),
  mythic({
    id: 'le-but-en-or-massif',
    name: 'Le But en or massif',
    position: 'ATT',
    targeting: { kind: 'team' },
    description: 'Le président promet une prime en lingots : toute l’équipe se met à courir.',
    effects: [
      { type: 'doubleGoals', duration: 15 },
      { type: 'modifier', scope: 'team', stat: 'all', value: 0.3, duration: 15 },
    ],
  }),
  mythic({
    id: 'le-kebab-du-siecle',
    name: 'Le Kebab du siècle',
    position: 'BENCH',
    targeting: { kind: 'randomOpponent', count: 6 },
    description: 'Offert au vestiaire adverse, sauce maison. La file d’attente aux toilettes est historique.',
    effects: [{ type: 'knockout', scope: 'targets', duration: 15 }],
  }),
  mythic({
    id: 'le-miracle-du-kine',
    name: 'Le Miracle du kiné',
    position: 'DEF',
    targeting: { kind: 'team' },
    description: 'Une pommade inconnue de la science. Même l’arbitre revient sur sa décision.',
    effects: [
      { type: 'miracle' },
      { type: 'modifier', scope: 'team', stat: 'all', value: 0.3, duration: 15 },
    ],
  }),
];
