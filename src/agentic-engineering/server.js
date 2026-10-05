import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true });
  if (path === '/api/log' && req.method === 'POST') {
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 16384) return json(res, 413, { error: 'Message too large.' });
      }
      const { text } = JSON.parse(body);
      if (typeof text !== 'string' || !text.trim() || text.length > 2000) {
        return json(res, 400, { error: 'Enter a message of 1–2000 characters.' });
      }
      console.log(text);
      return json(res, 200, { ok: true });
    } catch {
      return json(res, 400, { error: 'Invalid JSON.' });
    }
  }
  if (path.startsWith('/api/')) return json(res, 404, { error: 'Not found.' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed.' });
  try {
    const file = resolve(dist, `.${decodeURIComponent(path === '/' ? '/index.html' : path)}`);
    if (!file.startsWith(`${dist}/`)) return json(res, 404, { error: 'Not found.' });
    const content = await readFile(file);
    const extension = file.slice(file.lastIndexOf('.'));
    res.writeHead(200, { 'Content-Type': types[extension] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    json(res, 404, { error: 'Not found.' });
  }
}).listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log('Agentic Engineering listening on :3001'));
