import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const fields = ['input', 'output', 'cacheRead', 'cacheWrite', 'totalTokens'];
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

export class Dashboard {
  constructor({ port = 8765, password = randomBytes(32).toString('base64url'), historyLimit = 200, heartbeatMs = 15000 } = {}) {
    this.port = port;
    this.password = password;
    this.historyLimit = historyLimit;
    this.heartbeatMs = heartbeatMs;
    this.activity = [];
    this.totals = Object.fromEntries(fields.map(k => [k, 0]));
    this.model = null;
    this.sequence = 0;
    this.active = new Map();
    this.seen = new WeakSet();
    this.streams = new Set();
    this.server = null;
    this.heartbeat = null;
  }

  snapshot() {
    return { model: this.model, totals: { ...this.totals }, activity: this.activity.map(a => ({ ...a })) };
  }

  publish() {
    const frame = `event: snapshot\ndata: ${JSON.stringify(this.snapshot())}\n\n`;
    for (const stream of this.streams) stream.write(frame);
  }

  begin(kind, key, name = null, time = Date.now()) {
    const id = ++this.sequence;
    const item = { id, kind, name, start: time, end: null, duration: null, status: 'running' };
    this.active.set(`${kind}:${key}`, id);
    this.activity.unshift(item);
    this.activity.length = Math.min(this.activity.length, this.historyLimit);
    this.publish();
  }

  end(kind, key, status = 'success', time = Date.now()) {
    const slot = `${kind}:${key}`;
    const id = this.active.get(slot);
    if (id === undefined) return;
    this.active.delete(slot);
    const item = this.activity.find(a => a.id === id);
    if (item) {
      item.end = time;
      item.duration = Math.max(0, time - item.start);
      item.status = status;
      this.publish();
    }
  }

  message(message) {
    if (!message || message.role !== 'assistant' || !message.usage || this.seen.has(message)) return;
    // Pending/deferred messages are not completed provider responses.
    if (message.stopReason === 'pending' || message.stopReason === 'deferred') return;
    this.seen.add(message);
    this.model = `${message.provider}/${message.model}`;
    const usage = Object.fromEntries(fields.map(k => [k, Number.isFinite(message.usage[k]) ? message.usage[k] : 0]));
    for (const k of fields) this.totals[k] += usage[k];
    this.activity.unshift({ id: ++this.sequence, kind: 'assistant', name: this.model, start: message.timestamp ?? Date.now(), end: Date.now(), duration: null, status: message.stopReason === 'error' || message.stopReason === 'aborted' ? 'error' : 'success', usage });
    this.activity.length = Math.min(this.activity.length, this.historyLimit);
    this.publish();
  }

  authorized(req) {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Basic ')) return false;
    let decoded;
    try { decoded = Buffer.from(header.slice(6), 'base64').toString('utf8'); } catch { return false; }
    const expected = Buffer.from(`pi:${this.password}`);
    const supplied = Buffer.from(decoded);
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  }

  async serve(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!this.authorized(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Pi Token Dashboard", charset="UTF-8"' });
      res.end('Authentication required');
      return;
    }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    const pathname = new URL(req.url ?? '/', 'http://internal').pathname;
    if (pathname === '/snapshot') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(this.snapshot()));
      return;
    }
    if (pathname === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write(`retry: 1500\n\nevent: snapshot\ndata: ${JSON.stringify(this.snapshot())}\n\n`);
      this.streams.add(res);
      res.on('close', () => this.streams.delete(res));
      return;
    }
    // Vite's output is read only from this extension's own dist directory.
    if (pathname !== '/' && !/^\/assets\/[a-zA-Z0-9_.-]+$/.test(pathname)) { res.writeHead(404); res.end(); return; }
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    try {
      const body = await readFile(join(root, 'dist', file));
      res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(503); res.end('Dashboard frontend unavailable; run the post-link build hook.');
    }
  }

  async start() {
    if (this.server) return;
    const server = createServer((req, res) => { void this.serve(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); }); });
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(this.port, '0.0.0.0', () => { server.off('error', reject); resolve(); });
      });
    } catch (error) {
      server.close();
      throw error;
    }
    this.server = server;
    this.heartbeat = setInterval(() => { for (const stream of this.streams) stream.write(': heartbeat\n\n'); }, this.heartbeatMs);
  }

  async stop() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    for (const stream of this.streams) stream.end();
    this.streams.clear();
    const server = this.server;
    this.server = null;
    if (server) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
}
