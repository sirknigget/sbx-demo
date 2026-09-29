import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const port = Number(process.env.PORT || 3001);
const dist = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/api/log') {
    let body = '';
    try {
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 8192) throw new Error('too large');
      }
      const message = JSON.parse(body).message;
      if (typeof message !== 'string' || !message.trim() || message.length > 2000) throw new Error('invalid message');
      console.log(`[agentic-engineering] ${message}`);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
    } catch {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Invalid message' }));
    }
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end();
    return;
  }

  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  const file = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (file !== dist && !file.startsWith(dist + sep)) { response.writeHead(403).end(); return; }
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, '0.0.0.0', () => console.log(`Agentic Engineering listening on ${port}`));
