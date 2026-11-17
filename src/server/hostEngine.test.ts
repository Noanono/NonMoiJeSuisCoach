import { describe, expect, test } from 'bun:test';
import type { HubSnapshot } from './hub';
import { HostEngine, type Listener, type SlotStore } from './hostEngine';

/** Emplacements en mémoire, à la place du disque ou d'IndexedDB. */
function memoryStore(): SlotStore & { data: Map<number, HubSnapshot>; trashed: number[] } {
  const data = new Map<number, HubSnapshot>();
  const trashed: number[] = [];
  return {
    data,
    trashed,
    async read(slot) {
      const saved = data.get(slot);
      return saved ? structuredClone(saved) : null;
    },
    async write(slot, snapshot) {
      data.set(slot, structuredClone(snapshot));
    },
    async trash(slot) {
      data.delete(slot);
      trashed.push(slot);
    },
    async savedAt(slot) {
      return data.has(slot) ? 1 : null;
    },
  };
}

interface FakeListener extends Listener {
  messages: Record<string, unknown>[];
  closed: boolean;
}

function listener(coachId: string | null): FakeListener {
  const fake: FakeListener = {
    coachId,
    messages: [],
    closed: false,
    send: (payload) => fake.messages.push(JSON.parse(payload) as Record<string, unknown>),
    close: () => (fake.closed = true),
  };
  return fake;
}

const last = (fake: FakeListener) => fake.messages.at(-1)!;
const SECRET_A = 'a'.repeat(64);
const SECRET_B = 'b'.repeat(64);

async function openedEngine(): Promise<{ engine: HostEngine; store: ReturnType<typeof memoryStore> }> {
  const store = memoryStore();
  const engine = new HostEngine(store, { saveDelayMs: 0 });
  const opened = await engine.open(1);
  expect(opened.ok).toBe(true);
  return { engine, store };
}

describe('HostEngine', () => {
  test('sans ligue ouverte, un navigateur est renvoyé à l’accueil', () => {
    const engine = new HostEngine(memoryStore());
    const fake = listener('a');
    engine.attach(fake);
    expect(last(fake).type).toBe('closed');
    expect(fake.closed).toBe(true);
  });

  test('ouvrir un emplacement vide crée la ligue et la sauvegarde', async () => {
    const { engine, store } = await openedEngine();
    expect(engine.activeSlot).toBe(1);
    expect(store.data.has(1)).toBe(true);
    const slots = await engine.slots();
    expect(slots.map((slot) => slot.status)).toEqual(['ok', 'empty', 'empty']);
    expect(slots[0]!.active).toBe(true);
  });

  test('salle d’attente, lancement, puis la partie arrive en entier et ensuite par différences', async () => {
    const { engine } = await openedEngine();
    const alice = listener('a');
    const bob = listener('b');
    engine.attach(alice);
    engine.attach(bob);
    expect(last(alice).type).toBe('lobby');
    expect(engine.handle('join', 'a', { name: 'Alice', clubName: 'Les Gros Mollets' }).ok).toBe(true);
    expect(engine.handle('join', 'b', { name: 'Bob', clubName: 'Racing Pastis' }).ok).toBe(true);
    expect(engine.handle('start', 'a', {}).ok).toBe(true);
    expect(last(alice).type).toBe('game');
    expect(last(bob).type).toBe('game');
    expect(engine.handle('ready', 'a', { ready: false }).ok).toBe(true);
    // Rien n'a changé dans la partie d'Alice : au plus une différence, jamais la partie entière.
    expect(alice.messages.filter((message) => message.type === 'game')).toHaveLength(1);
  });

  test('une route inconnue du hub est refusée proprement', async () => {
    const { engine } = await openedEngine();
    expect(engine.handle('command', 'inconnu', { name: 'x', args: [] }).ok).toBe(false);
  });

  test('changer de ligue renvoie tout le monde à l’accueil', async () => {
    const { engine } = await openedEngine();
    const alice = listener('a');
    engine.attach(alice);
    expect((await engine.open(2)).ok).toBe(true);
    expect(last(alice).type).toBe('closed');
    expect(alice.closed).toBe(true);
  });

  test('on ne supprime pas la ligue ouverte ; une autre part à la corbeille', async () => {
    const { engine, store } = await openedEngine();
    expect((await engine.remove(1)).ok).toBe(false);
    await engine.open(2);
    expect((await engine.remove(1)).ok).toBe(true);
    expect(store.trashed).toEqual([1]);
    expect((await engine.remove(3)).ok).toBe(false);
  });

  describe('identité des coachs (MULTI-14)', () => {
    test('un nouveau coach enregistre son secret, puis doit toujours présenter le même', async () => {
      const { engine } = await openedEngine();
      expect((await engine.authenticate('a', SECRET_A)).ok).toBe(true);
      expect(engine.handle('join', 'a', { name: 'Alice', clubName: 'Les Gros Mollets' }).ok).toBe(true);
      expect((await engine.authenticate('a', SECRET_A)).ok).toBe(true);
      expect((await engine.authenticate('a', SECRET_B)).ok).toBe(false);
    });

    test('un secret trop court est refusé', async () => {
      const { engine } = await openedEngine();
      expect((await engine.authenticate('a', 'court')).ok).toBe(false);
    });

    test('un coach inscrit sans secret ne peut pas être pris au premier venu', async () => {
      const { engine } = await openedEngine();
      engine.handle('join', 'a', { name: 'Alice', clubName: 'Les Gros Mollets' });
      expect((await engine.authenticate('a', SECRET_B)).ok).toBe(false);
    });

    test('les secrets sont sauvegardés avec la ligue (empreintes seulement)', async () => {
      const { engine, store } = await openedEngine();
      await engine.authenticate('a', SECRET_A);
      await engine.flush();
      const saved = store.data.get(1)!.secrets!;
      expect(Object.keys(saved)).toEqual(['a']);
      expect(saved.a).not.toBe(SECRET_A);
      expect(saved.a).toHaveLength(64);
    });
  });

  describe('code de reprise (C10)', () => {
    test('le code donne l’identité et un nouveau secret ; l’ancien ne vaut plus rien', async () => {
      const { engine } = await openedEngine();
      await engine.authenticate('a', SECRET_A);
      engine.handle('join', 'a', { name: 'Alice', clubName: 'Les Gros Mollets' });
      const given = engine.createClaimCode('a');
      expect(given.ok).toBe(true);
      const code = given.ok ? given.value.code : '';
      expect(code).toMatch(/^\d{6}$/);
      const claimed = await engine.claim(code);
      expect(claimed.ok).toBe(true);
      if (!claimed.ok) return;
      expect(claimed.value.coachId).toBe('a');
      expect((await engine.authenticate('a', claimed.value.secret)).ok).toBe(true);
      expect((await engine.authenticate('a', SECRET_A)).ok).toBe(false);
      // Usage unique.
      expect((await engine.claim(code)).ok).toBe(false);
    });

    test('un coach inconnu n’a pas de code', async () => {
      const { engine } = await openedEngine();
      expect(engine.createClaimCode('personne').ok).toBe(false);
    });

    test('kick renvoie à l’accueil les navigateurs du coach repris', async () => {
      const { engine } = await openedEngine();
      const old = listener('a');
      const other = listener('b');
      engine.attach(old);
      engine.attach(other);
      engine.kick('a', 'Repris ailleurs.');
      expect(last(old).type).toBe('closed');
      expect(old.closed).toBe(true);
      expect(other.closed).toBe(false);
    });
  });
});
