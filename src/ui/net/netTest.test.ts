import { describe, expect, test } from 'bun:test';
import { runNetTest, STUN_SERVERS, type NetTestDeps } from './netTest';

const TURN = [{ urls: 'turn:global.relay.metered.ca:443', username: 'u', credential: 'p' }];

function deps(options: { open?: number; turn?: typeof TURN; srflx?: boolean; relay?: boolean; throws?: boolean } = {}): NetTestDeps & { configs: RTCConfiguration[] } {
  const configs: RTCConfiguration[] = [];
  return {
    configs,
    relays: async () => {
      if (options.throws) throw new Error('trystero introuvable');
      return { open: options.open ?? 10, total: 10 };
    },
    turnServers: async () => options.turn ?? TURN,
    findCandidate: async (config, type) => {
      configs.push(config);
      return type === 'srflx' ? (options.srflx ?? true) : (options.relay ?? true);
    },
  };
}

describe('test réseau de l’écran « Rejoindre » (MULTI-18)', () => {
  test('tout répond : verdict bon, sans conseil', async () => {
    const result = await runNetTest(deps());
    expect(result.verdict).toBe('bon');
    expect(result.relays).toMatchObject({ status: 'ok', open: 10, total: 10 });
    expect(result.stun.status).toBe('ok');
    expect(result.turn).toMatchObject({ status: 'ok', configured: true });
    expect(result.relays.advice ?? result.stun.advice ?? result.turn.advice).toBeUndefined();
    expect(result.summary).toBe('verdict bon · relais 10/10 · STUN ok · TURN ok');
  });

  test('STUN sur les serveurs publics, TURN en relais seul avec les identifiants reçus', async () => {
    const probe = deps();
    await runNetTest(probe);
    expect(probe.configs).toContainEqual({ iceServers: STUN_SERVERS });
    expect(probe.configs).toContainEqual({ iceServers: TURN, iceTransportPolicy: 'relay' });
  });

  test('aucun relais Nostr : verdict mauvais, avec un conseil', async () => {
    const result = await runNetTest(deps({ open: 0 }));
    expect(result.relays.status).toBe('echec');
    expect(result.relays.advice).toContain('bloqueur');
    expect(result.verdict).toBe('mauvais');
  });

  test('quelques relais seulement : partiel, verdict moyen', async () => {
    const result = await runNetTest(deps({ open: 2 }));
    expect(result.relays.status).toBe('partiel');
    expect(result.relays.advice).toBeDefined();
    expect(result.verdict).toBe('moyen');
  });

  test('TURN non configuré : on ne tente pas de candidat relay', async () => {
    const probe = deps({ turn: [] });
    const result = await runNetTest(probe);
    expect(result.turn).toMatchObject({ status: 'echec', configured: false });
    expect(probe.configs.some((config) => config.iceTransportPolicy === 'relay')).toBe(false);
    expect(result.verdict).toBe('moyen');
    expect(result.summary).toContain('TURN non configuré');
  });

  test('ni STUN ni TURN : on trouvera l’hôte sans pouvoir s’y relier', async () => {
    const result = await runNetTest(deps({ srflx: false, relay: false }));
    expect(result.stun.advice).toBeDefined();
    expect(result.turn).toMatchObject({ status: 'echec', configured: true });
    expect(result.verdict).toBe('mauvais');
  });

  test('STUN bloqué mais TURN joignable : ça passe par le relais', async () => {
    const result = await runNetTest(deps({ srflx: false }));
    expect(result.verdict).toBe('moyen');
  });

  test('une vérification qui plante compte comme un échec, sans faire planter le test', async () => {
    const result = await runNetTest(deps({ throws: true }));
    expect(result.relays).toMatchObject({ status: 'echec', open: 0 });
    expect(result.verdict).toBe('mauvais');
  });
});
