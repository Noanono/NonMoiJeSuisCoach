import type { Combo } from '../../types';

/** Durée couvrant le reste du match quelle que soit la minute du combo. */
const UNTIL_FULL_TIME = 90;
/** Recette de la buvette quand le barbecue s'improvise au bord du terrain. */
const BARBECUE_BUVETTE_BONUS = 400;
const DRAMA_PRESIDENT_CONFIDENCE = -15;

/**
 * Combos (CAP-15, CAT-01). Dans un combo, `self` désigne les deux porteurs des capacités
 * et `targets` les cibles déjà choisies pour ces capacités.
 */
export const COMBO_DEFINITIONS: readonly Combo[] = [
  {
    id: 'zone-chimique',
    name: 'Zone chimique',
    abilityIds: ['le-vomisseur', 'le-peteur'],
    description: 'La surface adverse est évacuée 1 min : occasion franche quasi garantie',
    downside: 'Les deux sont bannis de la soirée d’équipe : −10 % de moral',
    effects: [{ type: 'chanceBoost', value: 0.8, on: 'nextChance' }],
    risks: [{ chance: 1, label: 'Bannis de la soirée', effects: [{ type: 'morale', scope: 'self', value: -0.1 }] }],
  },
  {
    id: 'drame-conjugal',
    name: 'Drame conjugal',
    abilityIds: ['le-beau-gosse', 'l-ex-de-la-femme-du-president'],
    description: '+20 % à toutes les stats pour les deux pendant 15 min',
    downside: 'Le président apprend tout : confiance −15',
    effects: [{ type: 'modifier', scope: 'self', stat: 'all', value: 0.2, duration: 15 }],
    risks: [
      {
        chance: 1,
        label: 'Le président apprend tout',
        effects: [{ type: 'presidentConfidence', value: DRAMA_PRESIDENT_CONFIDENCE }],
      },
    ],
  },
  {
    id: 'les-freres-picon',
    name: 'Les Frères Picon',
    abilityIds: ['pilier-de-buvette', 'flasque-dans-la-chaussette'],
    description: '+50 % pour les deux pendant 10 min',
    downside: 'Les deux s’effondrent ensuite à −50 %',
    effects: [{ type: 'modifier', scope: 'self', stat: 'all', value: 0.5, duration: 10 }],
    risks: [
      {
        chance: 1,
        label: 'Effondrement',
        effects: [{ type: 'modifier', scope: 'self', stat: 'all', value: -0.5, duration: UNTIL_FULL_TIME }],
      },
    ],
  },
  {
    id: 'le-barbecue',
    name: 'Le Barbecue',
    abilityIds: ['le-boucher-du-village', 'le-lanceur-de-saucisson'],
    description: 'Adversaire blessé, action annulée, et la buvette rapporte un bonus au budget',
    downside: 'Double risque de carton',
    effects: [
      { type: 'injury', scope: 'targets', weeks: 1 },
      { type: 'cancelAction' },
      { type: 'budget', amount: BARBECUE_BUVETTE_BONUS },
    ],
    // Risques du Boucher du village, doublés.
    risks: [
      { chance: 0.6, label: 'Carton jaune', effects: [{ type: 'card', scope: 'self', card: 'yellow', chance: 1 }] },
      { chance: 0.1, label: 'Carton rouge', effects: [{ type: 'card', scope: 'self', card: 'red', chance: 1 }] },
    ],
  },
  {
    id: 'bagarre-generale',
    name: 'Bagarre générale',
    abilityIds: ['le-chambreur', 'la-bouche-d-egout'],
    description: '60 % que l’adversaire perde 2 joueurs',
    downside: 'Sinon, 2 rouges chez soi',
    // Les deux exclus adverses : le vis-à-vis chambré et le capitaine venu s'en mêler.
    effects: [
      { type: 'card', scope: 'targets', card: 'red', chance: 0.6 },
      { type: 'card', scope: 'opponentCaptain', card: 'red', chance: 0.6 },
    ],
    risks: [
      { chance: 0.4, label: 'Deux rouges chez toi', effects: [{ type: 'card', scope: 'self', card: 'red', chance: 1 }] },
    ],
  },
  {
    id: 'brouillard-total',
    name: 'Brouillard total',
    abilityIds: ['le-fumigene', 'le-gardien-fumeur'],
    description: 'Le gardien adverse ne voit plus rien : −60 % d’arrêts pendant 3 min',
    downside: 'Son propre gardien tousse : −20 % de réflexes',
    effects: [{ type: 'modifier', scope: 'opponentKeeper', stat: 'goalkeeping', value: -0.6, duration: 3 }],
    risks: [
      {
        chance: 1,
        label: 'Ton gardien tousse',
        effects: [{ type: 'modifier', scope: 'ownKeeper', stat: 'goalkeeping', value: -0.2, duration: 3 }],
      },
    ],
  },
  {
    id: 'nuit-blanche',
    name: 'Nuit blanche',
    abilityIds: ['le-dj-du-vestiaire', 'le-chef-de-chant'],
    description: '+20 % pour toute l’équipe pendant 10 min',
    downside: 'Puis −10 % pendant 10 min',
    effects: [{ type: 'modifier', scope: 'team', stat: 'all', value: 0.2, duration: 10 }],
    risks: [
      {
        chance: 1,
        label: 'Gueule de bois',
        effects: [{ type: 'modifier', scope: 'team', stat: 'all', value: -0.1, duration: 10 }],
      },
    ],
  },
];
