import type { Ability } from '../../types';
import { defineAbility } from './define';

/** Légendaires (CAT-01) : peuvent renverser un match, autant de fois que la jauge le permet. */
const legendary = (spec: Omit<Parameters<typeof defineAbility>[1], 'category'>): Ability =>
  defineAbility('legendary', { ...spec, category: 'legendary' });

/** Délai pendant lequel La Coupure de courant peut encore effacer un but. */
const BLACKOUT_WINDOW_MINUTES = 5;

export const LEGENDARY_ABILITIES: readonly Ability[] = [
  legendary({
    id: 'la-panenka-ivre',
    name: 'La Panenka ivre',
    position: 'ATT',
    description: 'Il se présente seul, titube, pique le ballon. Le stade retient son souffle.',
    effects: [{ type: 'instantChance', chance: 0.9 }, { type: 'modifier', scope: 'team', stat: 'all', value: 0.2, duration: 10 }],
  }),
  legendary({
    id: 'l-echange-de-maillots',
    name: 'L’Échange de maillots',
    position: 'ANY',
    targeting: { kind: 'opponentTeam' },
    description: 'À la faveur d’une embrouille, plus personne ne sait qui joue pour qui.',
    effects: [{ type: 'swapTeams', duration: 60 }],
  }),
  legendary({
    id: 'la-melee-generale',
    name: 'La Mêlée générale',
    position: 'ANY',
    targeting: { kind: 'opponent', count: 3 },
    description: 'Bagarre organisée : il entraîne trois adversaires, et il y reste aussi.',
    effects: [
      { type: 'knockout', scope: 'targets', duration: 40 },
      { type: 'knockout', scope: 'self', duration: 15 },
    ],
  }),
  legendary({
    id: 'la-coupure-de-courant',
    name: 'La Coupure de courant',
    position: 'BENCH',
    requiresRecentOpponentGoal: BLACKOUT_WINDOW_MINUTES,
    description: 'Quelqu’un a trébuché sur le disjoncteur. Quel but ?',
    effects: [{ type: 'cancelGoal', withinMinutes: BLACKOUT_WINDOW_MINUTES }, { type: 'modifier', scope: 'opponents', stat: 'concentration', value: -0.2, duration: 10 }],
  }),
  legendary({
    id: 'la-malediction-de-meme',
    name: 'La Malédiction de mémé',
    position: 'BENCH',
    targeting: { kind: 'opponentTeam' },
    description: 'Mémé jette un sort depuis la tribune. Personne n’ose la regarder.',
    effects: [{ type: 'modifier', scope: 'opponents', stat: 'all', value: -0.45, duration: 25 }],
  }),

  // --- Coups de pied arrêtés -------------------------------------------------
  legendary({
    id: 'le-plongeon-d-oscar',
    name: 'Le Plongeon d’Oscar',
    position: 'ANY',
    trigger: 'ownFreeKick',
    description: 'S’écroule dans la surface avant même que le coup franc soit tiré. L’arbitre, ému, montre le point blanc.',
    effects: [{ type: 'turnIntoPenalty' }, { type: 'modifier', scope: 'opponents', stat: 'all', value: -0.3, duration: 15 }],
  }),
  legendary({
    id: 'la-panenka-de-legende',
    name: 'La Panenka de légende',
    position: 'ATT',
    trigger: 'ownPenalty',
    description: 'Une pichenette au milieu, le gardien déjà au sol. Le stade entier repart en courant.',
    effects: [{ type: 'chanceBoost', value: 0.25 }, { type: 'modifier', scope: 'team', stat: 'all', value: 0.8, duration: 25 }],
  }),
];
