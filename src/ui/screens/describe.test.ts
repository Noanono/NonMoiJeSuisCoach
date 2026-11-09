import { describe, expect, test } from 'bun:test';
import { getAbility } from '../../domain/abilities/catalog';
import { statsAtLevel } from '../../domain/abilities/progression';
import {
  availabilityLabel,
  describeCooldown,
  describeEffect,
  describeRisk,
  describeTargeting,
  signed,
  signedPercent,
} from './describe';

describe('describeEffect (CAP-08 : effets chiffrés)', () => {
  test('un modificateur affiche le pourcentage signé, la stat, la cible et la durée', () => {
    expect(describeEffect({ type: 'modifier', scope: 'self', stat: 'all', value: 0.4, duration: 15 })).toBe(
      '+40 % à toutes les stats (lui-même) pendant 15 min',
    );
  });

  test('un malus utilise le vrai signe moins', () => {
    expect(describeEffect({ type: 'modifier', scope: 'targets', stat: 'speed', value: -0.2, duration: 10 })).toBe(
      '−20 % de vitesse (la cible) pendant 10 min',
    );
  });

  test('un malus sur les tirs adverses se lit du point de vue de l’adversaire', () => {
    expect(describeEffect({ type: 'opponentChanceMalus', value: 0.25, shots: 1 })).toBe(
      '−25 % de réussite pour le prochain tir adverse',
    );
    expect(describeEffect({ type: 'opponentChanceMalus', value: -0.2, shots: 2 })).toBe(
      '+20 % de réussite pour les 2 prochains tirs adverses',
    );
  });

  test('un carton certain ne montre pas de probabilité', () => {
    expect(describeEffect({ type: 'card', scope: 'self', card: 'yellow', chance: 1 })).toBe('Carton jaune (lui-même)');
    expect(describeEffect({ type: 'card', scope: 'self', card: 'red', chance: 0.15 })).toBe('15 % de carton rouge (lui-même)');
  });

  test('les valeurs mises à l’échelle par le niveau sont arrondies', () => {
    const butcher = getAbility('le-boucher-du-village');
    const [yellow] = statsAtLevel(butcher, 3).risks;
    expect(describeRisk(yellow!)).toBe('27 % · Carton jaune : Carton jaune (lui-même)');
  });
});

describe('recharge, ciblage et disponibilité', () => {
  test('les recharges se lisent en minutes ou en utilisations', () => {
    expect(describeCooldown({ kind: 'minutes', value: 20 })).toBe('Recharge 20 min');
    expect(describeCooldown({ kind: 'perSeason', uses: 1 })).toBe('1× par saison');
  });

  test('le ciblage indique le nombre de cibles et la portée (CAP-16, CAP-17)', () => {
    expect(describeTargeting({ kind: 'opponent', count: 2, range: 'facing' })).toBe('2 adversaires au choix, vis-à-vis');
    expect(describeTargeting({ kind: 'randomOpponent', count: 1 })).toBe('1 adversaire au hasard');
  });

  test('la disponibilité donne la blessure avant la suspension (EFF-05)', () => {
    expect(availabilityLabel({ injuryWeeks: 2, suspendedMatches: 1 })).toBe('Blessé 2 sem.');
    expect(availabilityLabel({ injuryWeeks: 0, suspendedMatches: 1 })).toBe('Suspendu 1 m.');
    expect(availabilityLabel({ injuryWeeks: 0, suspendedMatches: 0 })).toBeNull();
  });

  test('les nombres signés utilisent le vrai signe moins', () => {
    expect(signed(-3)).toBe('−3');
    expect(signed(4)).toBe('+4');
    expect(signedPercent(-0.1)).toBe('−10 %');
  });
});
