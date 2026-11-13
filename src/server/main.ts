/**
 * Serveur de la ligue entre amis (MULTI-01 à MULTI-09), lancé sur le PC de l'hôte comme un monde Minecraft :
 * il sert le jeu aux navigateurs du réseau local, garde jusqu'à 3 ligues et les sauvegarde sur son disque.
 *
 *   npm run serveur                → démarre sans ligue ouverte : l'hôte en choisit une dans son navigateur
 *   npm run serveur -- --port 5400 → autre port (5300 par défaut)
 *
 * L'hôte est le navigateur ouvert sur ce PC (http://localhost) : lui seul choisit la ligue ouverte.
 * Le navigateur reçoit la partie en direct (Server-Sent Events) et envoie ses commandes en POST.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { MultiplayerHub, summarizeLeague, type HubResult, type HubSnapshot, type SlotInfo } from './hub';

const args = process.argv.slice(2);
const PORT = Number(args[args.indexOf('--port') + 1]) || 5300;
const ROOT = process.cwd();
const CLIENT_DIR = resolve(ROOT, 'dist');
const SAVE_DIR = resolve(ROOT, 'parties');
const TRASH_DIR = join(SAVE_DIR, 'corbeille');
/** Emplacements de ligue de l'hôte, comme les vestiaires du solo (MULTI-09). */
const SLOTS = [1, 2, 3] as const;
const slotFile = (slot: number) => join(SAVE_DIR, `ligue-${slot}.json`);
/** Ancienne sauvegarde unique, d'avant les emplacements : elle devient la ligue 1. */
const LEGACY_FILE = join(SAVE_DIR, 'ligue.json');
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

mkdirSync(SAVE_DIR, { recursive: true });
if (existsSync(LEGACY_FILE) && !existsSync(slotFile(1))) {
  renameSync(LEGACY_FILE, slotFile(1));
  console.log('Ta ligue existante est maintenant la ligue 1.');
}

function readSlot(slot: number): HubSnapshot | null {
  if (!existsSync(slotFile(slot))) return null;
  return JSON.parse(readFileSync(slotFile(slot), 'utf8')) as HubSnapshot;
}

/** Ligue ouverte par l'hôte ; aucune au démarrage. */
let hub: MultiplayerHub | null = null;
let activeSlot: number | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function writeActive(): void {
  if (!hub || activeSlot === null) return;
  const file = slotFile(activeSlot);
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, JSON.stringify(hub.save()));
  renameSync(temporary, file);
}

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    writeActive();
  }, SAVE_DELAY_MS);
}

/** Écrit tout de suite la ligue ouverte (avant d'en changer ou d'arrêter le serveur). */
function flushSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  writeActive();
}

function slotInfo(slot: number): SlotInfo {
  const active = slot === activeSlot;
  try {
    const snapshot = active && hub ? hub.save() : readSlot(slot);
    if (!snapshot) return { slot, status: 'empty', active, savedAt: null, league: null };
    const savedAt = existsSync(slotFile(slot)) ? statSync(slotFile(slot)).mtimeMs : null;
    return { slot, status: 'ok', active, savedAt, league: summarizeLeague(snapshot) };
  } catch {
    return { slot, status: 'error', active, savedAt: null, league: null };
  }
}

/** L'hôte ouvre une ligue (la reprend, ou en crée une neuve) ; les joueurs de l'ancienne reviennent à l'accueil. */
function openSlot(slot: number): HubResult<{ slot: number }> {
  if (!SLOTS.includes(slot as (typeof SLOTS)[number])) return { ok: false, message: 'Emplacement inconnu.' };
  if (slot === activeSlot) return { ok: true, value: { slot } };
  let snapshot: HubSnapshot | null;
  try {
    snapshot = readSlot(slot);
  } catch {
    return { ok: false, message: 'Sauvegarde illisible : supprime-la pour libérer la place.' };
  }
  flushSave();
  closeAll('L’hôte a ouvert une autre ligue.');
  hub = snapshot ? new MultiplayerHub(snapshot) : MultiplayerHub.create(Math.floor(Math.random() * 2 ** 31));
  activeSlot = slot;
  if (!snapshot) writeActive();
  const message = snapshot ? `Ligue ${slot} reprise.` : `Ligue ${slot} créée : salle d’attente ouverte.`;
  console.log(message);
  return { ok: true, value: { slot }, message };
}

/** Supprimer une ligue la range dans parties/corbeille (rien n'est effacé pour de bon). */
function deleteSlot(slot: number): HubResult<null> {
  if (slot === activeSlot) return { ok: false, message: 'Cette ligue est ouverte : ouvre-en une autre avant de la supprimer.' };
  if (!existsSync(slotFile(slot))) return { ok: false, message: 'Emplacement déjà vide.' };
  mkdirSync(TRASH_DIR, { recursive: true });
  renameSync(slotFile(slot), join(TRASH_DIR, `ligue-${slot}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
  return { ok: true, value: null, message: `Ligue ${slot} rangée dans parties/corbeille.` };
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

/** Ligue fermée ou remplacée : chacun revient à l'accueil. */
function closeAll(message: string): void {
  for (const listener of listeners) {
    send(listener, JSON.stringify({ type: 'closed', message }));
    listener.response.end();
  }
  listeners.clear();
}

/** Chaque coach reçoit la partie de son point de vue. */
function broadcast(): void {
  if (!hub) return;
  const cache = new Map<string | null, string>();
  for (const listener of listeners) {
    if (!cache.has(listener.coachId)) cache.set(listener.coachId, hub.messageFor(listener.coachId));
    send(listener, cache.get(listener.coachId)!);
  }
  scheduleSave();
}

/** Match en direct : seuls ses deux coachs reçoivent l'état, plusieurs fois par seconde si besoin. */
function broadcastDuel(coachIds: readonly string[]): void {
  if (!hub) return;
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
  if (!hub) return;
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
  const hub = currentHub();
  if (!hub) {
    send(listener, JSON.stringify({ type: 'closed', message: 'L’hôte n’a pas encore ouvert de ligue.' }));
    response.end();
    return;
  }
  listeners.add(listener);
  if (coachId) hub.connect(coachId);
  // Retour dans un match en cours (onglet rechargé) : il reçoit l'état du match tout de suite.
  const duel = coachId ? hub.duelMessageFor(coachId, Date.now()) : null;
  if (duel) setTimeout(() => send(listener, duel), 0);
  const heartbeat = setInterval(() => response.write(': ping\n\n'), HEARTBEAT_MS);
  request.on('close', () => {
    clearInterval(heartbeat);
    if (!listeners.delete(listener)) return;
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

/** L'hôte : le navigateur ouvert sur le PC du serveur. */
function isHost(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress ?? '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

/** Pour les fonctions qui en ont besoin (TypeScript ne suit pas les `let` à travers les closures). */
function currentHub(): MultiplayerHub | null {
  return hub;
}

async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
  if (request.method === 'GET' && url.pathname === '/api/events') return openEvents(request, response, url);
  if (request.method === 'GET' && url.pathname === '/api/info') {
    const open = currentHub();
    const league = open && activeSlot !== null ? { slot: activeSlot, ...summarizeLeague(open.save()), coaches: open.presence() } : null;
    return reply(response, 200, { host: isHost(request), league });
  }
  if (url.pathname.startsWith('/api/host/') && !isHost(request)) return reply(response, 403, { ok: false, message: 'Réservé à l’hôte, sur le PC du serveur.' });
  if (request.method === 'GET' && url.pathname === '/api/host/slots') return reply(response, 200, { slots: SLOTS.map(slotInfo) });
  if (request.method !== 'POST') return reply(response, 405, { ok: false, message: 'Méthode non autorisée.' });
  const body = await readJson(request);
  if (url.pathname === '/api/host/open' || url.pathname === '/api/host/delete') {
    const slot = Number(body.slot);
    const result = url.pathname === '/api/host/open' ? openSlot(slot) : deleteSlot(slot);
    if (result.ok && result.message) console.log(result.message);
    return reply(response, result.ok ? 200 : 400, result);
  }
  const hub = currentHub();
  if (!hub) return reply(response, 409, { ok: false, message: 'L’hôte n’a pas encore ouvert de ligue.' });
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
  console.log(`  Ligues           : ${SAVE_DIR} (3 emplacements)`);
  console.log('  Ouvre http://localhost:' + PORT + ' sur ce PC et choisis la ligue à lancer (« Héberger une partie »).');
  console.log('  Ctrl+C pour arrêter (la ligue est sauvegardée en continu).');
  console.log('');
});

function shutdown(): void {
  flushSave();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
