import { describe, expect, test } from 'bun:test';
import {
  availabilityLabel,
  describeEffect,
  describeLevel5,
  describeTargeting,
  signed,
  signedPercent,
} from './describe';

/** Les textes utilisent des espaces insécables : on compare sans s'en soucier. */
const plain = (text: string) => text.replaceAll(' ', ' ');

describe('describeEffect (CAP-08 : effets chiffrés)', () => {
  test('un modificateur affiche le pourcentage signé, la stat, la cible et la durée', () => {
    expect(plain(describeEffect({ type: 'modifier', scope: 'self', stat: 'all', value: 0.4, duration: 15 }))).toBe(
      '+40 % à toutes les stats (lui-même) pendant 15 min',
    );
  });

  test('un malus utilise le vrai signe moins', () => {
    expect(plain(describeEffect({ type: 'modifier', scope: 'targets', stat: 'speed', value: -0.2, duration: 10 }))).toBe(
      '−20 % de vitesse (la cible) pendant 10 min',
    );
  });

  test('un malus sur les tirs adverses se lit du point de vue de l’adversaire', () => {
    expect(plain(describeEffect({ type: 'opponentChanceMalus', value: 0.25, shots: 1 }))).toBe(
      '−25 % de réussite pour le prochain tir adverse',
    );
  });

  test('les mécaniques des rares se lisent en clair', () => {
    expect(plain(describeEffect({ type: 'cleanSheetGauge', value: 2, duration: 10 }))).toBe(
      '+2 points de Gueulante si aucun but encaissé pendant 10 min',
    );
    expect(plain(describeEffect({ type: 'scaledModifier', scope: 'self', stat: 'shooting', base: 0, perUnit: 0.01, per: 'minute', duration: 15 }))).toBe(
      '+1 % au tir par minute jouée (lui-même) pendant 15 min',
    );
    expect(plain(describeEffect({ type: 'knockout', scope: 'targets', duration: 5, chaseDuration: 5 }))).toBe(
      'Hors jeu 5 min : la cible, puis un autre adversaire 5 min',
    );
  });
});

describe('niveau 5, ciblage et disponibilité', () => {
  test('le bonus de niveau 5 se lit en clair', () => {
    expect(describeLevel5('extraTarget')).toBe('Une cible de plus.');
  });

  test('le ciblage indique le nombre de cibles et la ligne visée (CAP-16, CAP-17)', () => {
    expect(describeTargeting({ kind: 'opponent', count: 2 })).toBe('2 adversaires au choix');
    expect(describeTargeting({ kind: 'opponent', count: 1, line: 'ATT' })).toBe('1 attaquant au choix');
    expect(describeTargeting({ kind: 'randomOpponent', count: 1 })).toBe('1 adversaire au hasard');
  });

  test('la disponibilité donne la blessure avant la suspension (EFF-05)', () => {
    expect(plain(availabilityLabel({ injuryWeeks: 2, suspendedMatches: 1 })!)).toBe('Blessé 2 sem.');
    expect(plain(availabilityLabel({ injuryWeeks: 0, suspendedMatches: 1 })!)).toBe('Suspendu 1 m.');
    expect(availabilityLabel({ injuryWeeks: 0, suspendedMatches: 0 })).toBeNull();
  });

  test('les nombres signés utilisent le vrai signe moins', () => {
    expect(signed(-3)).toBe('−3');
    expect(signed(4)).toBe('+4');
    expect(plain(signedPercent(-0.1))).toBe('−10 %');
  });
});
