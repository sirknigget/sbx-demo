import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function createDashboard({ root, port = 8765, log = console.log, error = console.error }) {
  const password = randomBytes(24).toString('base64url');
  const activity = [];
  const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 };
  const streams = new Set();
  const active = new Map();
  const seen = new WeakSet();
  const seenIds = new Set();
  let model = null;
  let sequence = 0;
  let server, vite, heartbeat;
  const snapshot = () => ({ model, totals: { ...totals }, activity: [...activity], sequence });
  function publish(item) {
    item.id = ++sequence;
    activity.push(item);
    if (activity.length > 200) activity.shift();
    const frame = `data: ${JSON.stringify(snapshot())}\n\n`;
    for (const stream of streams) stream.write(frame);
  }
  function start(kind, key, name) {
    const time = Date.now();
    active.set(`${kind}:${key}`, { kind, name, start: time });
    publish({ kind, name, phase: 'start', start: time });
  }
  function end(kind, key, status = 'success') {
    const entry = active.get(`${kind}:${key}`);
    if (!entry) return;
    active.delete(`${kind}:${key}`);
    const finish = Date.now();
    publish({ ...entry, phase: 'end', end: finish, duration: finish - entry.start, status });
  }
  function message(message) {
    if (message.role !== 'assistant' || seen.has(message)) return;
    const id = `${message.provider}:${message.model}:${message.timestamp}:${message.responseId ?? ''}`;
    if (seenIds.has(id)) return;
    seen.add(message);
    seenIds.add(id);
    model = `${message.provider}/${message.model}`;
    const usage = message.usage;
    if (!usage) return;
    for (const key of Object.keys(totals)) totals[key] += usage[key] ?? 0;
    publish({ kind: 'message', name: model, phase: 'end', start: message.timestamp, end: Date.now(), status: message.stopReason === 'error' || message.stopReason === 'aborted' ? 'error' : 'success', usage: Object.fromEntries(Object.keys(totals).map(key => [key, usage[key] ?? 0])) });
  }
  function authorized(req) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Basic ')) return false;
    let decoded;
    try { decoded = Buffer.from(header.slice(6), 'base64').toString('utf8'); } catch { return false; }
    const supplied = Buffer.from(decoded.slice(decoded.indexOf(':') + 1));
    const expected = Buffer.from(password);
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  }
  async function open() {
    try {
      // Vite is installed globally. The committed frontend is already built: no npm install or build at session startup.
      const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
      const { createServer: createViteServer } = await import(pathToFileURL(join(globalRoot, 'vite/dist/node/index.js')).href);
      vite = await createViteServer({ root, configFile: false, plugins: [], server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
      server = createServer((req, res) => {
        if (!authorized(req)) {
          res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Pi token dashboard"', 'Cache-Control': 'no-store' });
          res.end('Authentication required');
          return;
        }
        res.setHeader('Cache-Control', 'no-store');
        const path = new URL(req.url, 'http://internal').pathname;
        if (path === '/api/snapshot') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(snapshot()));
        } else if (path === '/api/events') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
          streams.add(res);
          res.write(`retry: 1500\ndata: ${JSON.stringify(snapshot())}\n\n`);
          req.on('close', () => streams.delete(res));
        } else if (req.method === 'GET' && (path === '/' || path === '/index.html')) {
          readFile(join(root, 'index.html'), 'utf8').then(html => vite.transformIndexHtml(path, html)).then(html => {
            res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);
          }).catch(() => { res.writeHead(500); res.end('Page unavailable'); });
        } else if (req.method === 'GET' && path.startsWith('/assets/')) {
          vite.middlewares(req, res, () => { res.writeHead(404); res.end('Not found'); });
        } else { res.writeHead(404); res.end('Not found'); }
      });
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '0.0.0.0', resolve);
      });
      heartbeat = setInterval(() => { for (const stream of streams) stream.write(': heartbeat\n\n'); }, 15000);
      log(`Pi token dashboard: http://0.0.0.0:${port}/  Basic username: pi  password: ${password}`);
      return true;
    } catch (err) {
      error(err?.code === 'EADDRINUSE' ? `Pi token dashboard: port ${port} is already in use; dashboard disabled.` : `Pi token dashboard could not start: ${err}`);
      await close();
      return false;
    }
  }
  async function close() {
    clearInterval(heartbeat);
    for (const stream of streams) stream.end();
    streams.clear();
    if (server) { const s = server; server = null; await new Promise(resolve => s.close(resolve)); }
    if (vite) { const v = vite; vite = null; await v.close(); }
  }
  return { open, close, snapshot, start, end, message, selectModel: name => { model = name; publish({ kind: 'model', name, phase: 'select', start: Date.now() }); } };
}
