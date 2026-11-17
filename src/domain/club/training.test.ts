import { describe, expect, test } from 'bun:test';
import { makePlayer } from '../testing/fixtures';
import { xpForActivation } from '../abilities/progression';
import { abilityTrainingXp, MAX_POINTS_BEYOND_POTENTIAL, passiveAbilityXp, passiveAttributeRate, trainingMatchBonus, trainingRate, trainPlayer } from './training';
import { overall } from '../player/rating';

const striker = (overrides = {}) => makePlayer({ age: 20, potential: 85, training: { focus: 'shooting', progress: 0 }, ...overrides });

function weeks(player: ReturnType<typeof makePlayer>, count: number) {
  let current = player;
  for (let week = 0; week < count; week++) current = trainPlayer(current);
  return current;
}

describe('entraînement (TRAIN-01 à TRAIN-05)', () => {
  test('le programme fait monter l’attribut travaillé, bien plus vite que le reste', () => {
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
    const after = weeks(makePlayer({ age: 20, potential: 85, training: { focus: 'ability', progress: 0 } }), 5);
    expect(after.ability.xp).toBe(300);
    expect(after.ability.level).toBe(2);
  });

  test('l’entraînement de capacité va bien plus vite qu’un match, à tout âge et même au-delà du potentiel', () => {
    const typicalActivation = xpForActivation(0.5);
    expect(abilityTrainingXp(makePlayer({ age: 20 }))).toBeGreaterThanOrEqual(2 * xpForActivation(1));
    expect(abilityTrainingXp(makePlayer({ age: 34, potential: 30 }))).toBeGreaterThan(typicalActivation);
    expect(abilityTrainingXp(makePlayer({ age: 20 }), 1.5)).toBe(90);
  });

  test('un blessé ne s’entraîne pas', () => {
    const injured = striker({ injuryWeeks: 2, training: { focus: 'shooting', progress: 0.9 } });
    expect(trainPlayer(injured)).toBe(injured);
  });

  test('le programme donne un bonus au prochain match, pas le travail de capacité', () => {
    expect(trainingMatchBonus('defense')).toEqual({ stat: 'defense', value: 0.05 });
    expect(trainingMatchBonus('ability')).toBeNull();
  });

  test('hors programme, le joueur progresse un peu : ses stats de poste et sa capacité', () => {
    const before = striker();
    const after = weeks(before, 28);
    // Programme tir : la stat travaillée monte vite, les autres stats du poste un peu.
    const others = (player: typeof before) => player.attributes.speed + player.attributes.technique + player.attributes.physical;
    expect(after.attributes.shooting - before.attributes.shooting).toBeGreaterThan(others(after) - others(before));
    expect(others(after)).toBeGreaterThan(others(before));
    expect(after.attributes.goalkeeping).toBe(before.attributes.goalkeeping);
    expect(after.ability.xp).toBeGreaterThan(before.ability.xp);
    expect(passiveAttributeRate(before)).toBeCloseTo(trainingRate(before) / 4);
  });

  test('travailler sa capacité fait quand même progresser un peu la note', () => {
    const before = striker({ training: { focus: 'ability', progress: 0 } });
    const after = weeks(before, 28);
    expect(overall(after)).toBeGreaterThan(overall(before));
    expect(passiveAbilityXp(before)).toBe(0);
  });

  test('passé le plafond du potentiel, plus rien ne monte hors programme non plus', () => {
    const capped = striker({ potential: 69 - MAX_POINTS_BEYOND_POTENTIAL });
    expect(passiveAttributeRate(capped)).toBe(0);
  });
});
