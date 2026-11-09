import type { Ability, Cooldown } from '../../types';

/** Les légendaires ne servent qu'une fois par saison et coûtent toute une gueulante (CAP-12). */
const LEGENDARY_COOLDOWN: Cooldown = { kind: 'perSeason', uses: 1 };
const LEGENDARY_COST = 3;

const SECOND_HALF = 45;
const WHOLE_MATCH = 90;
/** Forme du lendemain perdue par tout l'effectif (+30 de fatigue = −30 % de forme). */
const PASTIS_HANGOVER = 30;
const PASTIS_HANGOVER_LEVEL5 = 15;
/** Ardoise de la tournée réglée par le club. */
const ROUND_COST = 1500;
const BRAWL_FINE = 2500;
const BRAWL_SUSPENSION_MATCHES = 3;

/** Légendaires, une fois par saison (CAT-01). */
export const LEGENDARY_ABILITIES: readonly Ability[] = [
  {
    id: 'mi-temps-au-pastis',
    name: 'Mi-temps au pastis',
    rarity: 'legendary',
    category: 'legendary',
    position: 'ANY',
    targeting: { kind: 'team' },
    trigger: 'halftime',
    description: '+30 % pour toute l’équipe en 2de mi-temps',
    downside: 'Le lendemain, −30 % de forme pour tout l’effectif',
    level5Text: 'Lendemain à −15 %',
    base: {
      successChance: 1,
      effects: [{ type: 'modifier', scope: 'team', stat: 'all', value: 0.3, duration: SECOND_HALF }],
      risks: [{ chance: 1, label: 'Lendemain difficile', effects: [{ type: 'squadFatigue', value: PASTIS_HANGOVER }] }],
      cooldown: LEGENDARY_COOLDOWN,
      cost: LEGENDARY_COST,
    },
    level5: {
      risks: [
        { chance: 1, label: 'Lendemain difficile', effects: [{ type: 'squadFatigue', value: PASTIS_HANGOVER_LEVEL5 }] },
      ],
    },
    tags: ['alcohol'],
    hidden: false,
  },
  {
    id: 'la-tournee-du-patron',
    name: 'La Tournée du patron',
    rarity: 'legendary',
    category: 'legendary',
    position: 'ANY',
    targeting: { kind: 'team' },
    trigger: 'anytime',
    description: 'Le président paie sa tournée : malus d’alcool annulés et bonus doublés pour tout le match',
    downside: 'Coût important pour le budget',
    level5Text: 'Le président paie de sa poche',
    base: {
      successChance: 1,
      // Pas de primitive « doubler les bonus » : un gros bonus d'équipe sur tout le match en tient lieu.
      effects: [
        { type: 'clearMoraleMaluses' },
        { type: 'modifier', scope: 'team', stat: 'all', value: 0.25, duration: WHOLE_MATCH },
      ],
      risks: [{ chance: 1, label: 'Ardoise de la tournée', effects: [{ type: 'budget', amount: -ROUND_COST }] }],
      cooldown: LEGENDARY_COOLDOWN,
      cost: LEGENDARY_COST,
    },
    level5: { risks: [] },
    tags: ['alcohol', 'family'],
    hidden: false,
  },
  {
    id: 'la-panenka-ivre',
    name: 'La Panenka ivre',
    rarity: 'legendary',
    category: 'legendary',
    position: 'ATT',
    targeting: { kind: 'self' },
    trigger: 'ownPenalty',
    description: 'Penalty transformé à coup sûr… presque',
    downside: '5 % d’échec : moqué par tout le district, −30 % de moral pendant un mois',
    level5Text: '1 % d’échec',
    base: {
      successChance: 0.95,
      effects: [{ type: 'chanceBoost', value: 1, on: 'penalty' }],
      risks: [
        {
          chance: 0.05,
          label: 'Moqué par tout le district',
          effects: [
            { type: 'morale', scope: 'self', value: -0.3 },
            { type: 'press', headline: 'La Panenka la plus molle du district finit dans les bras du gardien' },
          ],
        },
      ],
      cooldown: LEGENDARY_COOLDOWN,
      cost: LEGENDARY_COST,
    },
    level5: {
      successChance: 0.99,
      risks: [
        {
          chance: 0.01,
          label: 'Moqué par tout le district',
          effects: [
            { type: 'morale', scope: 'self', value: -0.3 },
            { type: 'press', headline: 'La Panenka la plus molle du district finit dans les bras du gardien' },
          ],
        },
      ],
    },
    tags: ['alcohol'],
    hidden: false,
  },
  {
    id: 'la-malediction-de-meme',
    name: 'La Malédiction de mémé',
    rarity: 'legendary',
    category: 'legendary',
    position: 'BENCH',
    targeting: { kind: 'opponentTeam' },
    trigger: 'anytime',
    description: 'Mémé jette un sort : −20 % à toutes les stats adverses pendant 15 min',
    downside: '20 % que le sort se retourne contre l’équipe',
    level5Text: '5 % de retour',
    base: {
      successChance: 1,
      effects: [{ type: 'modifier', scope: 'opponents', stat: 'all', value: -0.2, duration: 15 }],
      risks: [
        {
          chance: 0.2,
          label: 'Le sort se retourne',
          effects: [{ type: 'modifier', scope: 'team', stat: 'all', value: -0.2, duration: 15 }],
        },
      ],
      cooldown: LEGENDARY_COOLDOWN,
      cost: LEGENDARY_COST,
    },
    level5: {
      risks: [
        {
          chance: 0.05,
          label: 'Le sort se retourne',
          effects: [{ type: 'modifier', scope: 'team', stat: 'all', value: -0.2, duration: 15 }],
        },
      ],
    },
    tags: ['family'],
    hidden: true,
  },
  {
    id: 'la-melee-generale',
    name: 'La Mêlée générale',
    rarity: 'legendary',
    category: 'legendary',
    position: 'ANY',
    targeting: { kind: 'opponent', count: 3, range: 'any' },
    trigger: 'anytime',
    description: 'Bagarre organisée : 3 adversaires et 1 de ses joueurs expulsés',
    downside: 'Suspensions et amende lourde, presse à scandale garantie',
    level5Text: '4 adversaires expulsés',
    base: {
      successChance: 1,
      effects: [
        { type: 'card', scope: 'targets', card: 'red', chance: 1 },
        { type: 'card', scope: 'self', card: 'red', chance: 1 },
      ],
      risks: [
        {
          chance: 1,
          label: 'Suspensions, amende et scandale',
          effects: [
            { type: 'suspension', scope: 'self', matches: BRAWL_SUSPENSION_MATCHES },
            { type: 'fine', amount: BRAWL_FINE },
            { type: 'press', headline: 'Pugilat géant au stade : la buvette transformée en infirmerie' },
          ],
        },
      ],
      cooldown: LEGENDARY_COOLDOWN,
      cost: LEGENDARY_COST,
    },
    // Le nombre de cibles est porté par `targeting`, hors de portée de la surcharge de niveau 5.
    level5: {},
    tags: ['vice'],
    hidden: true,
  },
];
