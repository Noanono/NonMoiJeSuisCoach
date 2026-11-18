import { describe, expect, test } from 'bun:test';
import { fetchTurnServers } from './p2p';

const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('relais TURN pour les réseaux stricts (MULTI-16)', () => {
  test('les serveurs ICE donnés par la fonction Netlify sont repris', async () => {
    const servers = [{ urls: 'turn:global.relay.metered.ca:443', username: 'u', credential: 'p' }];
    expect(await fetchTurnServers('/api/turn', reply(200, { iceServers: servers, ttl: 3600 }))).toEqual(servers);
  });

  test('relais non configuré ou injoignable : on reste en STUN seul, sans erreur', async () => {
    expect(await fetchTurnServers('/api/turn', reply(503, { iceServers: [], error: 'Relais TURN non configuré.' }))).toEqual([]);
    expect(await fetchTurnServers('/api/turn', reply(200, { autre: true }))).toEqual([]);
    const down = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect(await fetchTurnServers('/api/turn', down)).toEqual([]);
  });
});
