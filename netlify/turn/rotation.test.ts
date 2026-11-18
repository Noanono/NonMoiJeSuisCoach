import { describe, expect, test } from 'bun:test';
import {
  allowedOrigin,
  LIFETIME_S,
  needsRotation,
  parseIceServers,
  pickCredential,
  PROPAGATION_MS,
  ROTATE_AFTER_MS,
  withCredential,
  type StoredCredential,
} from './rotation';

const HOUR = 3600 * 1000;
const credential = (apiKey: string, createdAt: number): StoredCredential => ({ apiKey, createdAt, expiresAt: createdAt + LIFETIME_S * 1000 });

describe('rotation des identifiants TURN (MULTI-16)', () => {
  test('sans identifiant, on en crée un et on le sert tout de suite', () => {
    const empty = { credentials: [] };
    expect(needsRotation(empty, 0)).toBe(true);
    const state = withCredential(empty, credential('a', 0), 0);
    expect(pickCredential(state, 0)?.apiKey).toBe('a');
  });

  test('au bout de 24 h, un nouveau est créé mais l’ancien reste servi pendant la propagation', () => {
    let state = withCredential({ credentials: [] }, credential('a', 0), 0);
    expect(needsRotation(state, ROTATE_AFTER_MS - 1)).toBe(false);
    const now = ROTATE_AFTER_MS;
    expect(needsRotation(state, now)).toBe(true);
    state = withCredential(state, credential('b', now), now);
    expect(needsRotation(state, now)).toBe(false);
    expect(pickCredential(state, now)?.apiKey).toBe('a');
    expect(pickCredential(state, now + PROPAGATION_MS)?.apiKey).toBe('b');
  });

  test('on ne sert jamais un identifiant à quelques heures de son expiration', () => {
    const state = { credentials: [credential('a', 0)] };
    expect(pickCredential(state, 47 * HOUR)).toBeNull();
    expect(needsRotation(state, 43 * HOUR)).toBe(true);
  });

  test('les identifiants expirés sont oubliés', () => {
    const state = withCredential({ credentials: [credential('a', 0)] }, credential('c', 49 * HOUR), 49 * HOUR);
    expect(state.credentials.map((entry) => entry.apiKey)).toEqual(['c']);
  });
});

describe('accès au relais', () => {
  test('la version CrazyGames et le dev local peuvent demander des identifiants, pas les autres sites', () => {
    expect(allowedOrigin('https://games.crazygames.com')).toBe('https://games.crazygames.com');
    expect(allowedOrigin('https://www.crazygames.fr')).toBe('https://www.crazygames.fr');
    expect(allowedOrigin('http://localhost:5173')).toBe('http://localhost:5173');
    expect(allowedOrigin('https://crazygames.com.pirate.example')).toBeNull();
    expect(allowedOrigin('https://exemple.com')).toBeNull();
    expect(allowedOrigin(null)).toBeNull();
  });

  test('seuls des serveurs STUN et TURN bien formés sont transmis', () => {
    const servers = parseIceServers([
      { urls: 'stun:stun.relay.metered.ca:80' },
      { urls: 'turn:global.relay.metered.ca:443', username: 'u', credential: 'p' },
      { urls: 'https://pas-un-relais.example' },
      'texte',
    ]);
    expect(servers.map((server) => server.urls)).toEqual(['stun:stun.relay.metered.ca:80', 'turn:global.relay.metered.ca:443']);
    expect(parseIceServers({ error: 'Invalid API Key' })).toEqual([]);
  });
});
