import { describe, expect, test } from 'bun:test';
import { CLUB_IDENTITIES, DIVISION_NAMES, STADIUM_NAMES } from './names';

describe('univers parodique (UNIV-01)', () => {
  test('au moins 48 clubs aux noms uniques', () => {
    expect(CLUB_IDENTITIES.length).toBeGreaterThanOrEqual(48);
    expect(new Set(CLUB_IDENTITIES.map((club) => club.name)).size).toBe(CLUB_IDENTITIES.length);
  });

  test('abréviations uniques de 3 ou 4 lettres', () => {
    expect(new Set(CLUB_IDENTITIES.map((club) => club.shortName)).size).toBe(CLUB_IDENTITIES.length);
    for (const { shortName } of CLUB_IDENTITIES) expect(shortName).toMatch(/^[A-Z]{3,4}$/);
  });

  test('4 divisions, du haut vers le district (UNIV-03)', () => {
    expect(DIVISION_NAMES).toHaveLength(4);
    expect(DIVISION_NAMES[DIVISION_NAMES.length - 1]).toContain('District');
    expect(STADIUM_NAMES.length).toBeGreaterThan(0);
  });
});
