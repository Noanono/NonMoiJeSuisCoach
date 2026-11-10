import { describe, expect, test } from 'bun:test';
import { makePlayer } from '../testing/fixtures';
import { MAX_POINTS_BEYOND_POTENTIAL, trainingMatchBonus, trainingRate, trainPlayer } from './training';

const striker = (overrides = {}) => makePlayer({ age: 20, potential: 85, training: { focus: 'shooting', progress: 0 }, ...overrides });

function weeks(player: ReturnType<typeof makePlayer>, count: number) {
  let current = player;
  for (let week = 0; week < count; week++) current = trainPlayer(current);
  return current;
}

describe('entraînement (TRAIN-01 à TRAIN-05)', () => {
  test('le programme fait monter l’attribut travaillé, et lui seul', () => {
    const before = striker();
    const after = weeks(before, 6);
    expect(after.attributes.shooting).toBe(before.attributes.shooting + 2);
    expect(after.attributes.speed).toBe(before.attributes.speed);
  });

  test('les jeunes progressent plus vite que les vétérans', () => {
    expect(trainingRate(striker())).toBeGreaterThan(trainingRate(striker({ age: 33 })));
  });

  test('on peut dépasser son potentiel, moins vite et dans une limite', () => {
    const atPotential = striker({ potential: 69 });
    expect(trainingRate(atPotential)).toBeLessThan(trainingRate(striker()));
    expect(trainingRate(atPotential)).toBeGreaterThan(0);
    expect(trainingRate(striker({ potential: 69 - MAX_POINTS_BEYOND_POTENTIAL }))).toBe(0);
  });

  test('un programme de capacité donne de l’expérience et fait monter de niveau', () => {
    const after = weeks(makePlayer({ age: 20, potential: 85, training: { focus: 'ability', progress: 0 } }), 55);
    expect(after.ability.xp).toBeGreaterThan(0);
    expect(after.ability.level).toBe(2);
  });

  test('un blessé ne s’entraîne pas', () => {
    const injured = striker({ injuryWeeks: 2, training: { focus: 'shooting', progress: 0.9 } });
    expect(trainPlayer(injured)).toBe(injured);
  });

  test('le programme donne un bonus au prochain match, pas le travail de capacité', () => {
    expect(trainingMatchBonus('defense')).toEqual({ stat: 'defense', value: 0.05 });
    expect(trainingMatchBonus('ability')).toBeNull();
  });
});
