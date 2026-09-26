import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { timingSafeEqual } from 'node:crypto';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AnalysisError, createAnalyzer, providerModel, resolveProvider } from './analyze.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
try {
  process.loadEnvFile?.(join(root, '.env'));
} catch {
  /* .env facoltativo */
}

const PORT = Number(process.env.PORT) || 8787;
const APP_TOKEN = process.env.APP_TOKEN || '';
const DIST = join(root, 'dist');
const MAX_BODY = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

let analyzer = null;
const PROVIDER = resolveProvider();
const getAnalyzer = () => (analyzer ??= createAnalyzer(PROVIDER));

// Limite semplice per IP: 40 analisi ogni 10 minuti.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 40;
}

function tokenOk(req) {
  if (!APP_TOKEN) return true;
  const given = Buffer.from(String(req.headers['x-app-token'] ?? ''));
  const expected = Buffer.from(APP_TOKEN);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size <= MAX_BODY) chunks.push(c);
    });
    req.on('end', () => {
      if (size > MAX_BODY) return reject(new AnalysisError('Foto troppo grande.', 413));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new AnalysisError('JSON non valido.', 400));
      }
    });
    req.on('error', reject);
  });
}

async function handleAnalyze(req, res) {
  if (!PROVIDER) {
    return sendJson(res, 503, { error: 'Analisi foto non configurata: manca OPENAI_API_KEY (o ANTHROPIC_API_KEY) sul server.' });
  }
  if (!tokenOk(req)) return sendJson(res, 401, { error: 'Token non valido: impostalo in Impostazioni.' });
  if (rateLimited(req.socket.remoteAddress ?? '')) {
    return sendJson(res, 429, { error: 'Troppe analisi in poco tempo, riprova tra qualche minuto.' });
  }
  try {
    const body = await readJson(req);
    const image = typeof body.image === 'string' ? body.image : '';
    const mediaType = IMAGE_TYPES.has(body.mediaType) ? body.mediaType : 'image/jpeg';
    if (image.length < 100) throw new AnalysisError('Foto mancante.', 400);
    const mode = body.mode === 'etichetta' ? 'etichetta' : 'piatto';
    const hint = typeof body.hint === 'string' ? body.hint : '';
    const result = await getAnalyzer()({ image, mediaType, mode, hint });
    sendJson(res, 200, result);
  } catch (err) {
    if (err instanceof AnalysisError) return sendJson(res, err.status, { error: err.message });
    console.error('[analyze]', err);
    sendJson(res, 500, { error: 'Errore interno durante l’analisi.' });
  }
}

function serveStatic(req, res) {
  if (!existsSync(DIST)) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('App non compilata: esegui "npm run build".');
  }
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  let file = normalize(join(DIST, urlPath));
  if (!file.startsWith(DIST + sep) && file !== DIST) {
    res.writeHead(403);
    return res.end();
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  const ext = extname(file);
  const immutable = file.includes(`${sep}assets${sep}`);
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'x-content-type-options': 'nosniff',
  });
  createReadStream(file).pipe(res);
}

async function handler(req, res) {
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      ai: Boolean(PROVIDER),
      provider: PROVIDER,
      tokenRequired: Boolean(APP_TOKEN),
      model: providerModel(PROVIDER),
    });
  }
  if (path === '/api/analyze' && req.method === 'POST') return handleAnalyze(req, res);
  if (path.startsWith('/api/')) return sendJson(res, 404, { error: 'Endpoint sconosciuto' });
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end();
  }
  serveStatic(req, res);
}

const tls =
  process.env.TLS_CERT && process.env.TLS_KEY
    ? { cert: readFileSync(process.env.TLS_CERT), key: readFileSync(process.env.TLS_KEY) }
    : null;
const server = tls ? createHttpsServer(tls, handler) : createHttpServer(handler);
server.listen(PORT, () => {
  console.log(`NutriScatto in ascolto su ${tls ? 'https' : 'http'}://localhost:${PORT}`);
  if (PROVIDER) console.log(`Analisi foto: ${PROVIDER} (${providerModel(PROVIDER)})`);
  else console.warn('Attenzione: manca OPENAI_API_KEY o ANTHROPIC_API_KEY, analisi foto disattivata.');
  if (!APP_TOKEN) console.warn('Suggerimento: imposta APP_TOKEN se il server è esposto su internet.');
});
