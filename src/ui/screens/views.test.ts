import { describe, expect, test } from 'bun:test';
import { seasonWeek } from '../../domain/league/calendar';
import type { CupState } from '../../domain/league/cup';
import type { Fixture } from '../../domain/types';
import { nextTransferWindowWeek, recentForm, sortRows, weekLabel } from './views';

function fixture(week: number, homeGoals: number, awayGoals: number, homeId = 'moi', awayId = 'eux'): Fixture {
  return {
    id: `f${week}`,
    competition: 'league',
    divisionId: 'd',
    round: week,
    week,
    homeId,
    awayId,
    result: { homeGoals, awayGoals, scorers: [] },
  };
}

describe('recentForm', () => {
  test('donne les derniers résultats du plus ancien au plus récent, vus du club', () => {
    const fixtures = [fixture(5, 0, 1), fixture(3, 2, 0), fixture(4, 1, 1, 'eux', 'moi')];
    expect(recentForm(fixtures, 'moi')).toEqual(['V', 'N', 'D']);
    expect(recentForm(fixtures, 'eux')).toEqual(['D', 'N', 'V']);
  });

  test('ignore les matchs pas encore joués et limite la longueur', () => {
    const unplayed = { ...fixture(9, 0, 0), result: null };
    const fixtures = [fixture(1, 1, 0), fixture(2, 1, 0), fixture(3, 0, 2), unplayed];
    expect(recentForm(fixtures, 'moi', 2)).toEqual(['V', 'D']);
  });
});

describe('calendrier', () => {
  test('la semaine 1 est le mercato, puis viennent les journées', () => {
    const cup: CupState = { season: 1, totalRounds: 6, byeClubIds: ['x'], fixtures: [], currentRound: 1 };
    expect(weekLabel(seasonWeek(1), cup)).toBe('Mercato ouvert');
    expect(weekLabel(seasonWeek(3), cup)).toBe('Journée 1 de championnat');
  });

  test('la prochaine fenêtre de mercato est à mi-saison, puis la saison suivante', () => {
    const midSeason = nextTransferWindowWeek(3);
    expect(midSeason).not.toBeNull();
    expect(seasonWeek(midSeason!).kind).toBe('transferWindow');
    expect(nextTransferWindowWeek(midSeason! + 2)).toBeNull();
  });
});

describe('sortRows', () => {
  test('trie les nombres et le texte dans les deux sens sans modifier l’original', () => {
    const rows = [{ name: 'Émile', note: 40 }, { name: 'Bruno', note: 62 }, { name: 'Zoé', note: 51 }];
    expect(sortRows(rows, (row) => row.note, 'desc').map((row) => row.note)).toEqual([62, 51, 40]);
    expect(sortRows(rows, (row) => row.name, 'asc').map((row) => row.name)).toEqual(['Bruno', 'Émile', 'Zoé']);
    expect(rows[0]!.name).toBe('Émile');
  });
});
