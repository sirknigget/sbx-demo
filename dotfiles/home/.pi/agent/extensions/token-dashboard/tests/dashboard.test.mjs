import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createDashboard } from '../dashboard.mjs';

async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const auth = password => ({ Authorization: `Basic ${Buffer.from(`pi:${password}`).toString('base64')}` });

async function stream(url, headers) {
  const response = await fetch(url, { headers });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  let buffer = '';
  return {
    async next() {
      while (!buffer.includes('\n\n')) {
        const { value, done } = await reader.read();
        assert.equal(done, false);
        buffer += new TextDecoder().decode(value);
      }
      const end = buffer.indexOf('\n\n');
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      return frame;
    },
    cancel: () => reader.cancel(),
  };
}

 test('HTTP auth, page, SSE, accounting, reconnect, bounded history, shutdown', async () => {
  const port = await freePort();
  const dashboard = createDashboard({ port, password: 'test-secret' });
  const url = `http://127.0.0.1:${port}`;
  const headers = auth(dashboard.password);
  await dashboard.start();
  try {
    for (const path of ['/', '/app.js', '/api/state', '/api/events']) {
      const denied = await fetch(url + path);
      assert.equal(denied.status, 401, path);
      await denied.body.cancel();
    }
    assert.match(await (await fetch(url, { headers })).text(), /Pi token dashboard/);
    assert.match(await (await fetch(url + '/app.js', { headers })).text(), /Reconnecting/);
    const first = await stream(url + '/api/events', headers);
    assert.match(await first.next(), /retry: 2000/);
    assert.match(await first.next(), /"messages":0/);
    dashboard.agentStart();
    assert.match(await first.next(), /Agent run/);
    dashboard.turnStart(0, Date.now());
    await first.next();
    dashboard.toolStart('call1', 'bash');
    await first.next();
    dashboard.toolEnd('call1', true);
    let frame;
    do { frame = await first.next(); } while (!frame.includes('"status":"error"'));
    assert.match(frame, /"status":"error"/);
    const message = { role: 'assistant', provider: 'test', model: 'fake', responseId: 'one', timestamp: Date.now(), stopReason: 'stop', usage: { input: 10, output: 7, cacheRead: 5, cacheWrite: 3, reasoning: 4, totalTokens: 25 } };
    dashboard.message(message);
    dashboard.message(message);
    dashboard.message({ ...message });
    await first.next();
    dashboard.turnEnd(0, 'completed');
    await first.next();
    dashboard.agentEnd();
    await first.next();
    const state = await (await fetch(url + '/api/state', { headers })).json();
    assert.deepEqual(state.usage, { input: 10, output: 7, cacheRead: 5, cacheWrite: 3, totalTokens: 25 });
    assert.equal(state.messages, 1);
    assert.equal(state.model, 'test/fake');
    assert.equal(state.activity.find(item => item.kind === 'tool').status, 'error');
    assert.equal(state.activity.find(item => item.kind === 'turn').status, 'success');
    await first.cancel();
    const second = await stream(url + '/api/events', headers);
    await second.next();
    assert.match(await second.next(), /"totalTokens":25/);
    for (let i = 0; i < 220; i++) dashboard.toolStart(`id-${i}`, 'test');
    assert.equal(dashboard.snapshot().activity.length, 200);
    await second.cancel();
  } finally { await dashboard.stop(); }
  await assert.rejects(fetch(url + '/api/state', { headers }));
});

test('port collision does not stop the first dashboard', async () => {
  const port = await freePort();
  const first = createDashboard({ port });
  const second = createDashboard({ port });
  await first.start();
  try {
    await assert.rejects(second.start(), { code: 'EADDRINUSE' });
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/state`, { headers: auth(first.password) })).status, 200);
  } finally { await second.stop(); await first.stop(); }
});
