import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const assets = resolve(root, 'frontend/dist');
const PORT = 8765;
const MAX_HISTORY = 200;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

export function createDashboard({ port = PORT, log = console.error } = {}) {
  const password = randomBytes(24).toString('base64url');
  const clients = new Set();
  const seen = new WeakSet();
  const responseIds = new Set();
  const active = new Map();
  let sequence = 0;
  let server;
  let heartbeat;
  let model = 'Unknown';
  let history = [];
  let totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, messages: 0 };

  const snapshot = () => ({ model, totals: { ...totals }, history: [...history] });
  const send = (res, type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  const broadcast = () => {
    const state = snapshot();
    for (const client of clients) send(client, 'snapshot', state);
  };
  const record = (kind, phase, id, name, status, usage) => {
    const time = Date.now();
    const key = `${kind}:${id}`;
    if (phase === 'start') active.set(key, time);
    const start = phase === 'start' ? time : (active.get(key) ?? time);
    if (phase === 'end') active.delete(key);
    history.push({ id: ++sequence, kind, phase, name, start, end: phase === 'end' ? time : null,
      duration: phase === 'end' ? time - start : null, status: phase === 'end' ? status : 'running', ...(usage ? { usage } : {}) });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    broadcast();
  };
  const observe = (event) => {
    switch (event.type) {
      case 'model_select': model = `${event.model.provider}/${event.model.id}`; broadcast(); break;
      case 'agent_start': record('run', 'start', 'run', 'Agent'); break;
      case 'agent_end': {
        const last = [...event.messages].reverse().find(m => m.role === 'assistant');
        record('run', 'end', 'run', 'Agent', last?.stopReason === 'error' ? 'error' : last?.stopReason === 'aborted' ? 'aborted' : 'success');
        break;
      }
      case 'turn_start': record('turn', 'start', event.turnIndex, `Turn ${event.turnIndex}`); break;
      case 'turn_end': record('turn', 'end', event.turnIndex, `Turn ${event.turnIndex}`, event.outcome === 'completed' ? 'success' : event.outcome); break;
      case 'tool_execution_start': record('tool', 'start', event.toolCallId, event.toolName); break;
      case 'tool_execution_end': record('tool', 'end', event.toolCallId, event.toolName, event.isError ? 'error' : 'success'); break;
      case 'message_end': {
        const m = event.message;
        if (m.role !== 'assistant' || seen.has(m)) break;
        seen.add(m);
        const id = m.responseId && `${m.provider}/${m.model}/${m.responseId}`;
        if (id && responseIds.has(id)) break;
        if (id) responseIds.add(id);
        model = `${m.provider}/${m.model}`;
        for (const field of ['input', 'output', 'cacheRead', 'cacheWrite', 'totalTokens']) totals[field] += m.usage[field] ?? 0;
        totals.messages++;
        record('message', 'end', id || `message-${totals.messages}`, model, m.stopReason === 'error' ? 'error' : m.stopReason === 'aborted' ? 'aborted' : 'success', {
          input: m.usage.input, output: m.usage.output, cacheRead: m.usage.cacheRead,
          cacheWrite: m.usage.cacheWrite, totalTokens: m.usage.totalTokens
        });
        break;
      }
    }
  };
  const authorized = (req) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Basic ')) return false;
    const raw = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const candidate = Buffer.from(raw.slice(raw.indexOf(':') + 1));
    const expected = Buffer.from(password);
    return raw.startsWith('pi:') && candidate.length === expected.length && timingSafeEqual(candidate, expected);
  };
  const handler = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!authorized(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Pi token dashboard"' });
      res.end('Authentication required');
      return;
    }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    const pathname = new URL(req.url, 'http://internal').pathname;
    if (pathname === '/api/snapshot') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(snapshot())); return; }
    if (pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      clients.add(res);
      send(res, 'snapshot', snapshot());
      req.on('close', () => clients.delete(res));
      return;
    }
    const file = resolve(assets, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!(file === assets || file.startsWith(assets + sep))) { res.writeHead(404); res.end(); return; }
    try {
      const body = await readFile(file);
      res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
      res.end(body);
    } catch { res.writeHead(404); res.end('Not found'); }
  };
  const start = async () => {
    if (server) return true;
    const instance = createServer((req, res) => { handler(req, res).catch(err => { log(`Pi token dashboard request error: ${err}`); if (!res.headersSent) res.writeHead(500); res.end(); }); });
    try {
      await new Promise((ok, fail) => { instance.once('error', fail); instance.listen(port, '0.0.0.0', ok); });
    } catch (err) {
      instance.close();
      log(err.code === 'EADDRINUSE' ? `Pi token dashboard: port ${port} is already in use; dashboard disabled (Pi continues).` : `Pi token dashboard: cannot listen on ${port}: ${err}`);
      return false;
    }
    server = instance;
    heartbeat = setInterval(() => { for (const client of clients) client.write(': heartbeat\n\n'); }, 15000);
    log(`Pi token dashboard: http://127.0.0.1:${port}/  |  Basic username: pi  password: ${password}  |  listening on 0.0.0.0:${port}`);
    return true;
  };
  const stop = async () => {
    if (!server) return;
    clearInterval(heartbeat);
    for (const client of clients) client.end();
    clients.clear();
    const instance = server;
    server = undefined;
    await new Promise(ok => instance.close(ok));
  };
  return { start, stop, observe, snapshot, setModel: value => { model = value; broadcast(); }, get password() { return password; }, get clientCount() { return clients.size; } };
}

export default function (pi) {
  let sessionContext;
  const dashboard = createDashboard({ log: message => {
    if (sessionContext?.mode === 'tui') {
      sessionContext.ui.notify(message, message.includes('disabled') || message.includes('cannot listen') ? 'error' : 'info');
    } else {
      console.error(message);
    }
  } });
  pi.on('session_start', async (_event, ctx) => {
    sessionContext = ctx;
    if (ctx.model) dashboard.setModel(`${ctx.model.provider}/${ctx.model.id}`);
    await dashboard.start();
  });
  pi.on('session_shutdown', async () => { await dashboard.stop(); });
  for (const name of ['model_select', 'agent_start', 'agent_end', 'turn_start', 'turn_end', 'tool_execution_start', 'tool_execution_end', 'message_end']) {
    pi.on(name, event => dashboard.observe(event));
  }
}
