import http from 'node:http';

const port = 3002;

const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/messages') {
    response.writeHead(404);
    response.end();
    return;
  }

  let body = '';
  try {
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 2048) throw new Error('Message too large');
    }
    const message = JSON.parse(body).message;
    if (typeof message !== 'string' || !message.trim() || message.length > 500) {
      throw new Error('Invalid message');
    }
    console.log(`[agentic-engineering] ${JSON.stringify(message.trim())}`);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
  } catch {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Invalid message' }));
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Backend listening on ${port}`));
