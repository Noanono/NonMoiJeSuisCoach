/**
 * @deprecated Serveur de la ligue entre amis sur le réseau local (MULTI-01 à MULTI-09). Remplacé par le
 * pair-à-pair dans le navigateur (MULTI-11) : il reste fonctionnel pour l'instant, mais sera supprimé.
 *
 *   npm run serveur                → démarre sans ligue ouverte : l'hôte en choisit une dans son navigateur
 *   npm run serveur -- --port 5400 → autre port (5300 par défaut)
 *
 * L'hôte est le navigateur ouvert sur ce PC (http://localhost) : lui seul choisit la ligue ouverte.
 * Le navigateur reçoit la partie en direct (Server-Sent Events) et envoie ses commandes en POST.
 * Toute la logique est dans `HostEngine` ; ce fichier ne fait que la brancher sur HTTP et le disque.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import type { HubSnapshot } from './hub';
import { HostEngine, isClientRoute, type Listener, type SlotStore } from './hostEngine';

const args = process.argv.slice(2);
const PORT = Number(args[args.indexOf('--port') + 1]) || 5300;
const ROOT = process.cwd();
const CLIENT_DIR = resolve(ROOT, 'dist');
const SAVE_DIR = resolve(ROOT, 'parties');
const TRASH_DIR = join(SAVE_DIR, 'corbeille');
const slotFile = (slot: number) => join(SAVE_DIR, `ligue-${slot}.json`);
/** Ancienne sauvegarde unique, d'avant les emplacements : elle devient la ligue 1. */
const LEGACY_FILE = join(SAVE_DIR, 'ligue.json');
const MAX_BODY_BYTES = 5 * 1024 * 1024;
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

// --- Ligues sur le disque ----------------------------------------------------------

mkdirSync(SAVE_DIR, { recursive: true });
if (existsSync(LEGACY_FILE) && !existsSync(slotFile(1))) {
  renameSync(LEGACY_FILE, slotFile(1));
  console.log('Ta ligue existante est maintenant la ligue 1.');
}

const diskStore: SlotStore = {
  async read(slot) {
    if (!existsSync(slotFile(slot))) return null;
    return JSON.parse(readFileSync(slotFile(slot), 'utf8')) as HubSnapshot;
  },
  async write(slot, snapshot) {
    const file = slotFile(slot);
    const temporary = `${file}.tmp`;
    writeFileSync(temporary, JSON.stringify(snapshot));
    renameSync(temporary, file);
  },
  async trash(slot) {
    mkdirSync(TRASH_DIR, { recursive: true });
    renameSync(slotFile(slot), join(TRASH_DIR, `ligue-${slot}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
  },
  async savedAt(slot) {
    return existsSync(slotFile(slot)) ? statSync(slotFile(slot)).mtimeMs : null;
  },
};

const engine = new HostEngine(diskStore, { log: (message) => console.log(message) });
engine.startClock();

// --- Diffusion en direct (Server-Sent Events) -------------------------------------------

function openEvents(request: IncomingMessage, response: ServerResponse, url: URL): void {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const listener: Listener = {
    coachId: url.searchParams.get('coach') || null,
    send: (payload) => response.write(`data: ${payload}\n\n`),
    close: () => response.end(),
  };
  const detach = engine.attach(listener);
  const heartbeat = setInterval(() => response.write(': ping\n\n'), HEARTBEAT_MS);
  request.on('close', () => {
    clearInterval(heartbeat);
    detach();
  });
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

/** L'hôte : le navigateur ouvert sur le PC du serveur. */
function isHost(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress ?? '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
  if (request.method === 'GET' && url.pathname === '/api/events') return openEvents(request, response, url);
  if (request.method === 'GET' && url.pathname === '/api/info') return reply(response, 200, { host: isHost(request), league: engine.league() });
  if (url.pathname.startsWith('/api/host/') && !isHost(request)) return reply(response, 403, { ok: false, message: 'Réservé à l’hôte, sur le PC du serveur.' });
  if (request.method === 'GET' && url.pathname === '/api/host/slots') return reply(response, 200, { slots: await engine.slots() });
  if (request.method !== 'POST') return reply(response, 405, { ok: false, message: 'Méthode non autorisée.' });
  const body = await readJson(request);
  if (url.pathname === '/api/host/claim-code') {
    const result = engine.createClaimCode(text(body.coachId));
    return reply(response, result.ok ? 200 : 400, result);
  }
  if (url.pathname === '/api/claim') {
    const result = await engine.claim(text(body.code));
    return reply(response, result.ok ? 200 : 400, result);
  }
  if (url.pathname === '/api/host/open' || url.pathname === '/api/host/delete') {
    const slot = Number(body.slot);
    const result = url.pathname === '/api/host/open' ? await engine.open(slot) : await engine.remove(slot);
    if (result.ok && result.message && url.pathname === '/api/host/delete') console.log(result.message);
    return reply(response, result.ok ? 200 : 400, result);
  }
  const route = url.pathname.slice('/api/'.length);
  if (!isClientRoute(route)) return reply(response, 404, { ok: false, message: 'Route inconnue.' });
  // Seul l'hôte lance la ligue (MULTI-15).
  if (route === 'start' && !isHost(request)) return reply(response, 403, { ok: false, message: 'Seul l’hôte lance la ligue.' });
  const result = engine.handle(route, text(body.coach), body);
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
  console.log('  Non, moi je suis coach : serveur de la ligue entre amis (réseau local, OBSOLÈTE)');
  console.log('  Ce mode sera supprimé : héberge plutôt depuis le site (« Héberger une partie », en pair-à-pair).');
  console.log(`  Sur ce PC        : http://localhost:${PORT}`);
  for (const address of addresses) console.log(`  Pour tes amis    : ${address}`);
  console.log(`  Ligues           : ${SAVE_DIR} (3 emplacements)`);
  console.log('  Ouvre http://localhost:' + PORT + ' sur ce PC et choisis la ligue à lancer (« Héberger une partie »).');
  console.log('  Ctrl+C pour arrêter (la ligue est sauvegardée en continu).');
  console.log('');
});

function shutdown(): void {
  void engine.flush().then(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
