import { describe, expect, test } from 'bun:test';
import { codeHint, formatNetLog, NET_LOG_MAX, NetLog, type NetLogStorage } from './netLog';

function memoryStorage(): NetLogStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe('journal réseau local (MULTI-18)', () => {
  test('les entrées sont horodatées et survivent à un rechargement', () => {
    const storage = memoryStorage();
    let now = 1_000;
    const log = new NetLog({ storage, now: () => now });
    log.add('connexion', 'serveur K7QF…');
    now = 2_000;
    log.add('etat', 'hôte injoignable');
    const reloaded = new NetLog({ storage });
    expect(reloaded.entries()).toEqual([
      { at: 1_000, kind: 'connexion', detail: 'serveur K7QF…' },
      { at: 2_000, kind: 'etat', detail: 'hôte injoignable' },
    ]);
  });

  test(`au-delà de ${NET_LOG_MAX} entrées, les plus anciennes partent`, () => {
    const storage = memoryStorage();
    const log = new NetLog({ storage });
    for (let index = 0; index < NET_LOG_MAX + 7; index += 1) log.add('reconnexion', `tentative ${index}`);
    const entries = new NetLog({ storage }).entries();
    expect(entries).toHaveLength(NET_LOG_MAX);
    expect(entries[0].detail).toBe('tentative 7');
    expect(entries.at(-1)?.detail).toBe(`tentative ${NET_LOG_MAX + 6}`);
  });

  test('stockage illisible ou refusé : le journal marche quand même, en mémoire', () => {
    const broken = memoryStorage();
    broken.data.set('nmjsc-journal-reseau', '{pas du json');
    expect(new NetLog({ storage: broken }).entries()).toEqual([]);
    const refusing: NetLogStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    };
    const log = new NetLog({ storage: refusing });
    log.add('erreur', 'peer-connect-failed');
    expect(log.entries()).toHaveLength(1);
    const memoryOnly = new NetLog({ storage: null });
    memoryOnly.add('test', 'verdict bon');
    expect(memoryOnly.entries()).toHaveLength(1);
  });

  test('du code serveur, seuls les 4 premiers caractères restent', () => {
    expect(codeHint('K7QF3XM29ZPD4HWB')).toBe('K7QF…');
    expect(codeHint('  K7QF-3XM2-9ZPD-4HWB.abc ')).toBe('K7QF…');
  });

  test('le texte copié donne la version du jeu, le navigateur et les entrées', () => {
    const at = new Date(2026, 10, 18, 14, 5, 9).getTime();
    const text = formatNetLog([{ at, kind: 'erreur', detail: 'peer-connect-failed (coach, TURN configuré)' }], {
      version: 6,
      userAgent: 'Mozilla/5.0 Test',
      status: 'Réseau bloqué',
    });
    expect(text).toContain('Version du jeu : 6');
    expect(text).toContain('Navigateur : Mozilla/5.0 Test');
    expect(text).toContain('État actuel : Réseau bloqué');
    expect(text).toContain('2026-11-18 14:05:09  [erreur] peer-connect-failed (coach, TURN configuré)');
    expect(formatNetLog([], { version: 6, userAgent: 'x' })).toContain('aucun événement');
  });
});
