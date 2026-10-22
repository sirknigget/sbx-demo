import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PORT = 8765;
const MAX_ACTIVITY = 200;
const HEARTBEAT_MS = 15000;
const indexFile = join(dirname(fileURLToPath(import.meta.url)), 'dist', 'index.html');
const scriptFile = join(dirname(fileURLToPath(import.meta.url)), 'dist', 'app.js');

export function createDashboard({ port = PORT, password = randomBytes(24).toString('base64url') } = {}) {
  const clients = new Set();
  const activeTools = new Map();
  const seenMessages = new WeakSet();
  const seenResponses = new Set();
  let server;
  let heartbeat;
  let nextId = 0;
  let run;
  let runStatus = 'success';
  const turns = new Map();
  const state = {
    model: null,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 },
    messages: 0,
    activity: [],
  };

  const snapshot = () => JSON.parse(JSON.stringify(state));
  function publish() {
    const frame = `event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`;
    for (const client of clients) client.write(frame);
  }
  function add(item) {
    item.id = ++nextId;
    state.activity.unshift(item);
    if (state.activity.length > MAX_ACTIVITY) state.activity.length = MAX_ACTIVITY;
    publish();
  }
  function finish(item, status) {
    if (!item) return;
    item.end = Date.now();
    item.duration = item.end - item.start;
    item.status = status;
    publish();
  }
  function authorized(req) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Basic ')) return false;
    const raw = header.slice(6);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return false;
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const candidate = Buffer.from(decoded);
    const expected = Buffer.from(`pi:${password}`);
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  }
  async function handle(req, res) {
    if (!authorized(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Pi token dashboard", charset="UTF-8"', 'Cache-Control': 'no-store' });
      res.end('Authentication required');
      return;
    }
    if (req.method !== 'GET') {
      res.writeHead(405); res.end(); return;
    }
    if (req.url === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform', Connection: 'keep-alive', 'X-Content-Type-Options': 'nosniff' });
      res.write(`retry: 2000\n\nevent: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (req.url === '/api/state') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(snapshot()));
      return;
    }
    const file = req.url === '/' ? indexFile : req.url === '/app.js' ? scriptFile : null;
    if (!file) { res.writeHead(404); res.end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': file === indexFile ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(body);
    } catch {
      res.writeHead(503); res.end('Dashboard frontend not built. Run npm run build in the extension directory.');
    }
  }
  return {
    password,
    port,
    snapshot,
    clients,
    async start() {
      if (server) return;
      const candidate = createServer((req, res) => { void handle(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); }); });
      try {
        await new Promise((resolve, reject) => {
          candidate.once('error', reject);
          candidate.listen(port, '0.0.0.0', () => { candidate.off('error', reject); resolve(); });
        });
      } catch (error) {
        candidate.close();
        throw error;
      }
      server = candidate;
      heartbeat = setInterval(() => { for (const client of clients) client.write(': heartbeat\n\n'); }, HEARTBEAT_MS);
      heartbeat.unref();
    },
    async stop() {
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = undefined;
      for (const client of clients) client.end();
      clients.clear();
      if (server) {
        const current = server;
        server = undefined;
        await new Promise(resolve => current.close(resolve));
      }
    },
    model(model) { state.model = model ?? null; publish(); },
    agentStart() {
      runStatus = 'success';
      run = { kind: 'run', label: 'Agent run', start: Date.now(), end: null, duration: null, status: 'running' };
      add(run);
    },
    agentEnd() { finish(run, runStatus); run = undefined; },
    turnStart(index, timestamp) {
      const turn = { kind: 'turn', label: `Turn ${index + 1}`, start: timestamp || Date.now(), end: null, duration: null, status: 'running' };
      turns.set(index, turn);
      add(turn);
    },
    turnEnd(index, outcome) {
      const status = outcome === 'completed' ? 'success' : outcome === 'error' ? 'error' : 'aborted';
      if (status !== 'success') runStatus = status;
      finish(turns.get(index), status);
      turns.delete(index);
    },
    toolStart(id, name) {
      const tool = { kind: 'tool', label: name, start: Date.now(), end: null, duration: null, status: 'running' };
      activeTools.set(id, tool);
      add(tool);
    },
    toolEnd(id, isError) { finish(activeTools.get(id), isError ? 'error' : 'success'); activeTools.delete(id); },
    message(message) {
      if (message?.role !== 'assistant' || seenMessages.has(message)) return;
      seenMessages.add(message);
      // Pi's responseId identifies a provider response across re-emissions of the same message.
      if (message.responseId && seenResponses.has(message.responseId)) return;
      if (message.responseId) seenResponses.add(message.responseId);
      const usage = message.usage;
      if (!usage) return;
      for (const key of Object.keys(state.usage)) state.usage[key] += Number(usage[key]) || 0;
      state.messages++;
      state.model = `${message.provider}/${message.model}`;
      add({ kind: 'message', label: `${state.model} · assistant message`, start: message.timestamp || Date.now(), end: Date.now(), duration: null, status: message.stopReason === 'error' ? 'error' : message.stopReason === 'aborted' ? 'aborted' : 'success', usage: Object.fromEntries(Object.keys(state.usage).map(key => [key, Number(usage[key]) || 0])) });
    },
  };
}
