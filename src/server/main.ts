/**
 * Serveur de la ligue entre amis (MULTI-01 à MULTI-05), lancé sur le PC de l'hôte comme un monde Minecraft :
 * il sert le jeu aux navigateurs du réseau local, garde la partie et la sauvegarde sur son disque.
 *
 *   npm run serveur                → reprend la ligue sauvegardée, ou en prépare une nouvelle
 *   npm run serveur -- --nouvelle  → archive l'ancienne ligue et repart de zéro
 *   npm run serveur -- --port 5400 → autre port (5300 par défaut)
 *
 * Le navigateur reçoit la partie en direct (Server-Sent Events) et envoie ses commandes en POST.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { MultiplayerHub, type HubResult, type HubSnapshot } from './hub';

const args = process.argv.slice(2);
const PORT = Number(args[args.indexOf('--port') + 1]) || 5300;
const FRESH = args.includes('--nouvelle');
const ROOT = process.cwd();
const CLIENT_DIR = resolve(ROOT, 'dist');
const SAVE_DIR = resolve(ROOT, 'parties');
const SAVE_FILE = join(SAVE_DIR, 'ligue.json');
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const SAVE_DELAY_MS = 500;
const HEARTBEAT_MS = 20_000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// --- Partie ------------------------------------------------------------------

function loadHub(): MultiplayerHub {
  mkdirSync(SAVE_DIR, { recursive: true });
  if (existsSync(SAVE_FILE) && FRESH) {
    const archive = join(SAVE_DIR, `ligue-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    renameSync(SAVE_FILE, archive);
    console.log(`Ancienne ligue archivée : ${archive}`);
  }
  if (existsSync(SAVE_FILE)) {
    const snapshot = JSON.parse(readFileSync(SAVE_FILE, 'utf8')) as HubSnapshot;
    console.log(`Ligue reprise : ${snapshot.signups.length} coach(s)${snapshot.game ? `, saison ${snapshot.game.season}, semaine ${snapshot.game.week}` : ', salle d’attente'}.`);
    return new MultiplayerHub(snapshot);
  }
  console.log('Nouvelle ligue : salle d’attente ouverte.');
  return MultiplayerHub.create(Math.floor(Math.random() * 2 ** 31));
}

const hub = loadHub();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const temporary = `${SAVE_FILE}.tmp`;
    writeFileSync(temporary, JSON.stringify(hub.save()));
    renameSync(temporary, SAVE_FILE);
  }, SAVE_DELAY_MS);
}

// --- Diffusion en direct -------------------------------------------------------

interface Listener {
  coachId: string | null;
  response: ServerResponse;
}

const listeners = new Set<Listener>();

function send(listener: Listener, payload: string): void {
  listener.response.write(`data: ${payload}\n\n`);
}

/** Chaque coach reçoit la partie de son point de vue. */
function broadcast(): void {
  const cache = new Map<string | null, string>();
  for (const listener of listeners) {
    if (!cache.has(listener.coachId)) cache.set(listener.coachId, hub.messageFor(listener.coachId));
    send(listener, cache.get(listener.coachId)!);
  }
  scheduleSave();
}

/** Match en direct : seuls ses deux coachs reçoivent l'état, plusieurs fois par seconde si besoin. */
function broadcastDuel(coachIds: readonly string[]): void {
  const now = Date.now();
  for (const listener of listeners) {
    if (!listener.coachId || !coachIds.includes(listener.coachId)) continue;
    const message = hub.duelMessageFor(listener.coachId, now);
    if (message) send(listener, message);
  }
}

/** Horloge des matchs en direct (×1 imposé) : le serveur fait avancer chaque match. */
const DUEL_CLOCK_MS = 200;
setInterval(() => {
  const { changed, gameChanged } = hub.advanceDuels(Date.now());
  for (const key of changed) broadcastDuel(hub.duelCoaches(key));
  if (gameChanged) broadcast();
}, DUEL_CLOCK_MS);

function openEvents(request: IncomingMessage, response: ServerResponse, url: URL): void {
  const coachId = url.searchParams.get('coach') || null;
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const listener: Listener = { coachId, response };
  listeners.add(listener);
  if (coachId) hub.connect(coachId);
  // Retour dans un match en cours (onglet rechargé) : il reçoit l'état du match tout de suite.
  const duel = coachId ? hub.duelMessageFor(coachId, Date.now()) : null;
  if (duel) setTimeout(() => send(listener, duel), 0);
  const heartbeat = setInterval(() => response.write(': ping\n\n'), HEARTBEAT_MS);
  request.on('close', () => {
    clearInterval(heartbeat);
    listeners.delete(listener);
    if (coachId) hub.disconnect(coachId);
    broadcast();
  });
  // Les autres voient le coach passer en ligne ; lui reçoit son état complet.
  broadcast();
}

// --- API -----------------------------------------------------------------------

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error('Requête trop grosse.');
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  const body: unknown = text ? JSON.parse(text) : {};
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error('Requête invalide.');
  return body as Record<string, unknown>;
}

function reply(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
  if (request.method === 'GET' && url.pathname === '/api/events') return openEvents(request, response, url);
  if (request.method === 'GET' && url.pathname === '/api/info') return reply(response, 200, { phase: hub.phase, coaches: hub.presence() });
  if (request.method !== 'POST') return reply(response, 405, { ok: false, message: 'Méthode non autorisée.' });
  const body = await readJson(request);
  const coach = text(body.coach);
  let result: HubResult;
  if (url.pathname === '/api/duel/join' || url.pathname === '/api/duel/command') {
    const now = Date.now();
    const duel = url.pathname === '/api/duel/join' ? hub.joinDuel(coach, now) : hub.duelCommand(coach, body.name, body.args, now);
    if (duel.ok) broadcastDuel(hub.duelCoaches(duel.value.key));
    return reply(response, duel.ok ? 200 : 400, duel);
  }
  switch (url.pathname) {
    case '/api/join':
      result = hub.join({ id: coach, name: text(body.name), clubName: text(body.clubName) });
      break;
    case '/api/start':
      result = hub.start(coach);
      break;
    case '/api/command':
      result = hub.command(coach, body.name, body.args);
      break;
    case '/api/ready':
      result = hub.setReady(coach, body.ready === true);
      break;
    default:
      return reply(response, 404, { ok: false, message: 'Route inconnue.' });
  }
  if (result.ok) broadcast();
  if (result.ok && result.message) console.log(result.message);
  reply(response, result.ok ? 200 : 400, result);
}

// --- Fichiers du jeu -----------------------------------------------------------

async function serveClient(response: ServerResponse, url: URL): Promise<void> {
  const requested = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  let file = resolve(CLIENT_DIR, requested || 'index.html');
  if (!file.startsWith(CLIENT_DIR + sep) && file !== CLIENT_DIR) return reply(response, 403, { ok: false });
  if (!existsSync(file) || !extname(file)) file = join(CLIENT_DIR, 'index.html');
  try {
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Jeu introuvable : lance « npm run serveur », qui construit le jeu avant de démarrer.');
  }
}

// --- Démarrage -----------------------------------------------------------------

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const handler = url.pathname.startsWith('/api/') ? handleApi(request, response, url) : serveClient(response, url);
  handler.catch((error: unknown) => {
    if (!response.headersSent) reply(response, 400, { ok: false, message: error instanceof Error ? error.message : String(error) });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
    .map((entry) => `http://${entry!.address}:${PORT}`);
  console.log('');
  console.log('  Non, moi je suis coach : serveur de la ligue entre amis');
  console.log(`  Sur ce PC        : http://localhost:${PORT}`);
  for (const address of addresses) console.log(`  Pour tes amis    : ${address}`);
  console.log(`  Sauvegarde       : ${SAVE_FILE}`);
  console.log('  Ctrl+C pour arrêter (la ligue est sauvegardée en continu).');
  console.log('');
});

function shutdown(): void {
  if (saveTimer) clearTimeout(saveTimer);
  writeFileSync(SAVE_FILE, JSON.stringify(hub.save()));
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
