import { describe, expect, test } from 'bun:test';
import { ANNOUNCE_TTL_MS, applyAnnouncement, freshServers, readAnnouncement, type Announcement } from './publicDirectory';
import { formatCode } from './serverCode';

const HOST = 'Ab3dEf6hIj9kLm2nOp5qRs';
const OTHER = 'Zz3dEf6hIj9kLm2nOp5qRs';
const CODE = formatCode({ secret: '0123456789ABCDEF', hostId: HOST });

function announcement(overrides: Partial<Announcement> = {}): Announcement {
  return { code: CODE, name: 'Ligue du dimanche', hostName: 'Alice', coaches: 3, max: 10, phase: 'lobby', season: null, week: null, version: 7, ...overrides };
}

describe('annuaire des serveurs publics (MULTI-13)', () => {
  test('une annonce valide de son propre hôte est retenue', () => {
    expect(readAnnouncement(JSON.stringify(announcement()), HOST)).toEqual(announcement());
  });

  test('personne n’annonce le serveur d’un autre', () => {
    expect(readAnnouncement(JSON.stringify(announcement()), OTHER)).toBeNull();
    expect(readAnnouncement(JSON.stringify({ withdraw: CODE }), OTHER)).toBeNull();
  });

  test('annonces malformées ou démesurées refusées', () => {
    expect(readAnnouncement('pas du json', HOST)).toBeNull();
    expect(readAnnouncement(42, HOST)).toBeNull();
    expect(readAnnouncement(JSON.stringify(announcement({ coaches: 999 })), HOST)).toBeNull();
    expect(readAnnouncement(JSON.stringify(announcement({ name: '   ' })), HOST)).toBeNull();
    expect(readAnnouncement(JSON.stringify({ ...announcement(), phase: 'n’importe quoi' }), HOST)).toBeNull();
    expect(readAnnouncement('x'.repeat(5000), HOST)).toBeNull();
  });

  test('textes nettoyés et bornés', () => {
    const read = readAnnouncement(JSON.stringify(announcement({ name: `  Ligue\u0007 ${'x'.repeat(100)}` })), HOST) as Announcement;
    expect(read.name.startsWith('Ligue ')).toBe(true);
    expect(read.name.length).toBeLessThanOrEqual(40);
  });

  test('une annonce remplace la précédente du même serveur ; un retrait l’enlève', () => {
    let list = applyAnnouncement([], announcement(), 0);
    list = applyAnnouncement(list, announcement({ coaches: 4 }), 10);
    expect(list).toHaveLength(1);
    expect(list[0]!.coaches).toBe(4);
    list = applyAnnouncement(list, { withdraw: CODE }, 20);
    expect(list).toHaveLength(0);
  });

  test('les serveurs muets disparaissent ; les salles d’attente passent devant', () => {
    const playing = { ...announcement({ code: formatCode({ secret: 'FEDCBA9876543210', hostId: HOST }), phase: 'playing', season: 2, week: 5 }), seenAt: 0 };
    const lobby = { ...announcement(), seenAt: 0 };
    expect(freshServers([playing, lobby], 1000).map((server) => server.phase)).toEqual(['lobby', 'playing']);
    expect(freshServers([playing, lobby], ANNOUNCE_TTL_MS + 1)).toHaveLength(0);
  });
});
