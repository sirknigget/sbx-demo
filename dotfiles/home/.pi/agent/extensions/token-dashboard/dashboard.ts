import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; totalTokens: number };
type Activity = { id: number; kind: string; name: string; start: string; end?: string; durationMs?: number; status: 'running' | 'success' | 'error'; usage?: Usage; model?: string };
const zero = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 });
const fields: (keyof Usage)[] = ['input', 'output', 'cacheRead', 'cacheWrite', 'totalTokens'];
const stamp = () => new Date().toISOString();
const home = dirname(realpathSync(fileURLToPath(import.meta.url)));

export function dashboard(pi: ExtensionAPI, options: { port?: number; log?: (text: string) => void } = {}) {
  const port = options.port ?? 8765;
  let server: Server | undefined;
  let vite: Awaited<ReturnType<typeof import('vite')['createServer']>> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let password = '';
  let nextId = 0;
  let model = '';
  let total = zero();
  let messages = 0;
  const activity: Activity[] = [];
  const active = new Map<string, Activity>();
  const clients = new Set<ServerResponse>();
  const notify = (text: string) => (options.log ?? console.log)(text);
  const snapshot = () => ({ model, messages, total: { ...total }, activity: activity.map(x => ({ ...x })) });
  const send = (res: ServerResponse, event: string, data: unknown) => {
    if (!res.destroyed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const publish = () => { const state = snapshot(); for (const client of clients) send(client, 'state', state); };
  const record = (kind: string, name: string, key?: string) => {
    const row: Activity = { id: ++nextId, kind, name, start: stamp(), status: 'running' };
    activity.push(row);
    if (activity.length > 200) activity.shift();
    if (key) active.set(key, row);
    publish();
    return row;
  };
  const finish = (key: string, status: 'success' | 'error', fallbackKind: string, name: string) => {
    const row = active.get(key) ?? record(fallbackKind, name);
    active.delete(key);
    row.end = stamp();
    row.durationMs = Math.max(0, Date.parse(row.end) - Date.parse(row.start));
    row.status = status;
    publish();
    return row;
  };
  const authorized = (req: IncomingMessage) => {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Basic ')) return false;
    const raw = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const supplied = Buffer.from(raw.slice(raw.indexOf(':') + 1));
    const expected = Buffer.from(password);
    return raw.includes(':') && supplied.length === expected.length && timingSafeEqual(supplied, expected);
  };
  const stop = async () => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = undefined;
    for (const client of clients) client.end();
    clients.clear();
    const old = server;
    server = undefined;
    if (old) { old.closeAllConnections(); await new Promise<void>(resolve => old.close(() => resolve())); }
    if (vite) { const oldVite = vite; vite = undefined; await oldVite.close(); }
    active.clear();
  };
  const start = async () => {
    await stop();
    total = zero(); messages = 0; model = ''; activity.length = 0; nextId = 0;
    password = randomBytes(24).toString('base64url');
    try {
      const { createServer: createVite } = await import('vite');
      vite = await createVite({ root: join(home, 'frontend'), configFile: false,
        server: { middlewareMode: true, hmr: false, fs: { strict: true } }, appType: 'spa', logLevel: 'error' });
      server = createServer((req, res) => {
        if (!authorized(req)) {
          res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Pi token dashboard"', 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
          res.end('Authentication required'); return;
        }
        const path = new URL(req.url ?? '/', 'http://internal').pathname;
        if (path === '/api/snapshot') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify(snapshot())); return;
        }
        if (path === '/api/events') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
          clients.add(res); send(res, 'state', snapshot());
          req.on('close', () => clients.delete(res)); return;
        }
        if (path === '/' || path === '/index.html' || path.startsWith('/src/') || path.startsWith('/node_modules/.vite/') || path.startsWith('/@vite/') || path.startsWith('/@id/')) {
          vite!.middlewares(req, res, () => { res.writeHead(404); res.end('Not found'); }); return;
        }
        res.writeHead(404); res.end('Not found');
      });
      // Do not leave the process with an unhandled error when a competing process owns the port.
      await new Promise<void>((resolve, reject) => {
        server!.once('error', reject);
        server!.listen(port, '0.0.0.0', () => { server!.removeListener('error', reject); resolve(); });
      });
      heartbeat = setInterval(() => { for (const client of clients) if (!client.destroyed) client.write(': heartbeat\n\n'); }, 15000);
      heartbeat.unref();
      notify(`Pi token dashboard: http://127.0.0.1:${port}/ (listening on 0.0.0.0:${port}) | Basic username: pi | password: ${password}`);
    } catch (error) {
      notify(`Pi token dashboard unavailable on port ${port}: ${error instanceof Error ? error.message : String(error)}`);
      await stop();
    }
  };
  pi.on('session_start', async (_event, ctx) => {
    if (ctx.model) model = `${ctx.model.provider}/${ctx.model.id}`;
    await start();
    if (ctx.model) { model = `${ctx.model.provider}/${ctx.model.id}`; publish(); }
  });
  pi.on('session_shutdown', stop);
  pi.on('model_select', event => { model = `${event.model.provider}/${event.model.id}`; publish(); });
  pi.on('agent_start', () => { record('agent', 'Agent', 'agent'); });
  pi.on('agent_end', event => { const last = [...event.messages].reverse().find(m => m.role === 'assistant'); finish('agent', last?.role === 'assistant' && (last.stopReason === 'error' || last.stopReason === 'aborted') ? 'error' : 'success', 'agent', 'Agent'); });
  pi.on('turn_start', event => { record('turn', `Turn ${event.turnIndex}`, `turn:${event.turnIndex}`); });
  pi.on('turn_end', event => { finish(`turn:${event.turnIndex}`, event.message.role === 'assistant' && (event.message.stopReason === 'error' || event.message.stopReason === 'aborted') ? 'error' : 'success', 'turn', `Turn ${event.turnIndex}`); });
  pi.on('tool_execution_start', event => { record('tool', event.toolName, `tool:${event.toolCallId}`); });
  pi.on('tool_execution_end', event => { finish(`tool:${event.toolCallId}`, event.isError ? 'error' : 'success', 'tool', event.toolName); });
  const seen = new WeakSet<object>();
  pi.on('message_end', event => {
    const msg = event.message;
    if (msg.role !== 'assistant' || seen.has(msg)) return;
    seen.add(msg);
    const usage = msg.usage;
    if (!usage) return;
    const row = record('message', 'Assistant message');
    row.start = new Date(msg.timestamp || Date.now()).toISOString();
    row.end = stamp(); row.durationMs = Math.max(0, Date.parse(row.end) - Date.parse(row.start));
    row.status = msg.stopReason === 'error' || msg.stopReason === 'aborted' ? 'error' : 'success';
    row.model = `${msg.provider}/${msg.model}`;
    row.usage = zero();
    for (const field of fields) { row.usage[field] = usage[field] ?? 0; total[field] += row.usage[field]; }
    messages++; model = row.model;
    publish();
  });
  return { start, stop, snapshot, get password() { return password; } };
}

export default dashboard;
