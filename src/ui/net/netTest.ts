/**
 * Test réseau de l'écran « Rejoindre » (MULTI-18) : avant même de rejoindre, le joueur sait si son réseau
 * laisse passer le multijoueur, et quoi faire sinon. Trois vérifications, menées en parallèle :
 * - les relais Nostr (mise en relation) : combien des 10 relais utilisés par la ligue répondent ;
 * - le STUN (connexion directe) : le navigateur découvre son adresse publique (candidat ICE `srflx`) ;
 * - le TURN (secours des réseaux stricts) : des identifiants arrivent et le relais donne un candidat `relay`.
 * Les accès au navigateur passent par `NetTestDeps`, qu'un test remplace par des imitations.
 */
import type { TurnServerConfig } from 'trystero';

export type CheckStatus = 'ok' | 'partiel' | 'echec';

export interface NetCheck {
  status: CheckStatus;
  /** Ce qu'on a vu, en clair. */
  detail: string;
  /** Que faire, quand ça ne va pas. */
  advice?: string;
}

export interface NetTestResult {
  relays: NetCheck & { open: number; total: number };
  stun: NetCheck;
  turn: NetCheck & { configured: boolean };
  /** Bilan d'ensemble : `mauvais` si on ne pourra sans doute rejoindre personne depuis ce réseau. */
  verdict: 'bon' | 'moyen' | 'mauvais';
  summary: string;
}

export interface NetTestDeps {
  /** Relais Nostr joignables, sur ceux qu'utilise la ligue. */
  relays(): Promise<{ open: number; total: number }>;
  /** Serveurs TURN fournis par `/api/turn` (vide : pas de relais). */
  turnServers(): Promise<TurnServerConfig[]>;
  /** Une connexion WebRTC locale avec cette configuration obtient-elle un candidat ICE de ce type ? */
  findCandidate(config: RTCConfiguration, type: 'srflx' | 'relay'): Promise<boolean>;
}

/** Les serveurs STUN publics que Trystero utilise par défaut. */
export const STUN_SERVERS: RTCIceServer[] = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
].map((urls) => ({ urls }));

/** Au moins autant de relais joignables pour dire que la mise en relation est solide. */
const RELAYS_GOOD = 5;

async function safely<T>(task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

function checkRelays({ open, total }: { open: number; total: number }): NetTestResult['relays'] {
  const detail = `${open} relais sur ${total} répondent.`;
  if (open > 0 && open >= Math.min(RELAYS_GOOD, total)) return { status: 'ok', detail, open, total };
  if (open > 0) {
    return {
      status: 'partiel',
      detail,
      advice: 'Ça peut passer, mais si l’hôte reste introuvable, essaie un autre réseau (le partage de connexion de ton téléphone, par exemple).',
      open,
      total,
    };
  }
  return {
    status: 'echec',
    detail,
    advice:
      'Aucun relais ne répond : ton réseau (école, entreprise, pare-feu) ou un bloqueur de pubs filtre les WebSockets. Désactive le bloqueur sur ce site ou change de réseau.',
    open,
    total,
  };
}

function checkStun(found: boolean): NetCheck {
  if (found) return { status: 'ok', detail: 'Ton navigateur voit son adresse publique : la connexion directe est possible.' };
  return {
    status: 'echec',
    detail: 'Pas d’adresse publique trouvée : ton réseau bloque l’UDP ou le STUN.',
    advice: 'La connexion directe va coincer : il faudra passer par le relais TURN. Si lui non plus ne marche pas, change de réseau.',
  };
}

function checkTurn(configured: boolean, found: boolean): NetTestResult['turn'] {
  if (!configured) {
    return {
      status: 'echec',
      configured,
      detail: 'Relais TURN indisponible (pas d’identifiants reçus).',
      advice: 'Sans lui, deux réseaux stricts (4G, box en mode strict) ne se relient pas. Réessaie plus tard, ou joue depuis un réseau plus ouvert.',
    };
  }
  if (found) return { status: 'ok', configured, detail: 'Le relais TURN répond : même un réseau strict passera par lui.' };
  return {
    status: 'echec',
    configured,
    detail: 'Identifiants reçus, mais le relais TURN ne répond pas depuis ton réseau.',
    advice: 'Ton réseau filtre aussi le relais (ports 80 et 443 compris). Essaie le partage de connexion de ton téléphone.',
  };
}

const SHORT: Record<CheckStatus, string> = { ok: 'ok', partiel: 'partiel', echec: 'échec' };

export async function runNetTest(deps: NetTestDeps): Promise<NetTestResult> {
  const [relayCount, stunFound, turn] = await Promise.all([
    safely(() => deps.relays(), { open: 0, total: 0 }),
    safely(() => deps.findCandidate({ iceServers: STUN_SERVERS }, 'srflx'), false),
    (async () => {
      const servers = await safely(() => deps.turnServers(), []);
      if (servers.length === 0) return { configured: false, found: false };
      const found = await safely(() => deps.findCandidate({ iceServers: servers, iceTransportPolicy: 'relay' }, 'relay'), false);
      return { configured: true, found };
    })(),
  ]);
  const relays = checkRelays(relayCount);
  const stun = checkStun(stunFound);
  const turnCheck = checkTurn(turn.configured, turn.found);
  // Sans relais Nostr, on ne trouve personne ; sans STUN ni TURN, on trouve l'hôte mais on ne s'y relie pas.
  const verdict =
    relays.status === 'echec' || (stun.status !== 'ok' && turnCheck.status !== 'ok')
      ? 'mauvais'
      : relays.status === 'ok' && stun.status === 'ok' && turnCheck.status === 'ok'
        ? 'bon'
        : 'moyen';
  const summary =
    `verdict ${verdict} · relais ${relays.open}/${relays.total} · STUN ${SHORT[stun.status]} · ` +
    `TURN ${turn.configured ? SHORT[turnCheck.status] : 'non configuré'}`;
  return { relays, stun, turn: turnCheck, verdict, summary };
}

/** Attend qu'un candidat ICE du type voulu apparaisse, ou que la collecte se termine, ou le délai. */
export async function findCandidate(config: RTCConfiguration, type: 'srflx' | 'relay', timeoutMs = 6_000): Promise<boolean> {
  const connection = new RTCPeerConnection(config);
  try {
    // Un canal de données suffit pour que le navigateur collecte des candidats, sans micro ni caméra.
    connection.createDataChannel('test-reseau');
    const found = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      const finish = (value: boolean) => {
        clearTimeout(timer);
        resolve(value);
      };
      connection.onicecandidate = (event) => {
        if (!event.candidate) return finish(false);
        const candidateType = event.candidate.type ?? / typ (\w+)/.exec(event.candidate.candidate)?.[1];
        if (candidateType === type) finish(true);
      };
      connection.onicegatheringstatechange = () => {
        if (connection.iceGatheringState === 'complete') finish(false);
      };
    });
    await connection.setLocalDescription(await connection.createOffer());
    return await found;
  } finally {
    connection.close();
  }
}

/** Les vraies dépendances, dans le navigateur. */
export async function browserNetTestDeps(): Promise<NetTestDeps> {
  const p2p = await import('./p2p');
  return {
    relays: () => p2p.probeRelays(),
    turnServers: () => p2p.turnServers(),
    findCandidate: (config, type) => findCandidate(config, type),
  };
}
