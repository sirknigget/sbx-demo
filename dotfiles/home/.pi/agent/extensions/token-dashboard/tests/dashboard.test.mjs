import test from 'node:test';
import assert from 'node:assert/strict';
import { createJiti } from 'jiti';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createServer } from 'node:net';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jiti = createJiti(import.meta.url);
const { DashboardState } = jiti(resolve(root, 'state.ts'));
const { startDashboard } = jiti(resolve(root, 'server.ts'));
const url = 'http://127.0.0.1:8765';

async function frame(reader) {
  let text = '';
  while (!text.includes('\n\n')) {
    const { value, done } = await reader.read();
    if (done) throw new Error('stream ended');
    text += new TextDecoder().decode(value);
  }
  return text;
}

test('authenticated page, snapshot, SSE updates, reconnect and shutdown', async () => {
  const state = new DashboardState();
  const server = await startDashboard(root, state);
  const headers = { Authorization: 'Basic ' + Buffer.from(`pi:${server.password}`).toString('base64') };
  try {
    for (const path of ['/', '/api/snapshot', '/api/events', '/frontend/main.jsx']) {
      const response = await fetch(url + path);
      assert.equal(response.status, 401, path);
      await response.body.cancel();
    }
    const page = await fetch(url + '/', { headers });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /frontend\/main.jsx/);
    const source = await fetch(url + '/frontend/main.jsx', { headers });
    const js = await source.text();
    assert.match(js, /EventSource/);
    assert.match(js, /Reconnecting/);
    const stream = await fetch(url + '/api/events', { headers });
    const reader = stream.body.getReader();
    assert.match(await frame(reader), /event: snapshot/);
    state.setModel('test/model');
    const run = state.start('run', 'Agent run', undefined, 100);
    state.end(run, 'success', 400);
    state.message('test/model', { input: 3, output: 7, cacheRead: 11, cacheWrite: 13, totalTokens: 34 }, 'success', 120, 390);
    const snapshot = await (await fetch(url + '/api/snapshot', { headers })).json();
    assert.deepEqual(snapshot.totals, { input: 3, output: 7, cacheRead: 11, cacheWrite: 13, totalTokens: 34 });
    assert.equal(snapshot.activities[1].duration, 300);
    assert.match(await frame(reader), /test\/model/);
    await reader.cancel();
    const reconnect = await fetch(url + '/api/events', { headers });
    const reconnectReader = reconnect.body.getReader();
    assert.match(await frame(reconnectReader), /"totalTokens":34/);
    await reconnectReader.cancel();
    for (let i = 0; i < 230; i++) state.start('tool', 'bash');
    assert.equal(state.snapshot().activities.length, 200);
  } finally { await server.close(); }
  await assert.rejects(fetch(url + '/api/snapshot', { headers }));
});

test('occupied port fails without taking over the existing listener', async () => {
  const existing = createServer();
  await new Promise((ok) => existing.listen(8765, '0.0.0.0', ok));
  try {
    await assert.rejects(startDashboard(root, new DashboardState()), { code: 'EADDRINUSE' });
    assert.equal(existing.listening, true);
  } finally { await new Promise((ok) => existing.close(ok)); }
});
