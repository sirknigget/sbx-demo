import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Dashboard } from '../dashboard.mjs';

const auth = password => ({ Authorization: 'Basic ' + Buffer.from(`pi:${password}`).toString('base64') });
const url = d => `http://127.0.0.1:${d.server.address().port}`;

async function stream(d) {
  const controller = new AbortController();
  const response = await fetch(url(d) + '/events', { headers: auth(d.password), signal: controller.signal });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const first = await reader.read();
  assert.match(new TextDecoder().decode(first.value), /event: snapshot/);
  return { reader, controller };
}

test('authentication, page, snapshot, SSE, exact usage, bounded history, reconnect and cleanup', async () => {
  const d = new Dashboard({ port: 0, historyLimit: 3, heartbeatMs: 50 });
  await d.start();
  try {
    for (const path of ['/', '/snapshot', '/events', '/assets/index-x.js']) {
      assert.equal((await fetch(url(d) + path)).status, 401);
      assert.equal((await fetch(url(d) + path, { headers: auth('wrong') })).status, 401);
    }
    const page = await fetch(url(d), { headers: auth(d.password) });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Pi Token Dashboard/);
    const asset = (await (await fetch(url(d), { headers: auth(d.password) })).text()).match(/src="(\.\/assets\/[^\"]+)"/)[1];
    assert.equal((await fetch(new URL(asset, url(d)), { headers: auth(d.password) })).status, 200);
    const first = await stream(d);
    d.begin('run', 1, null, 100);
    d.begin('tool', 'call', 'bash', 110);
    d.end('tool', 'call', 'error', 130);
    d.end('run', 1, 'success', 140);
    const msg = { role: 'assistant', provider: 'synthetic', model: 'test', timestamp: 120, stopReason: 'stop', usage: { input: 2, output: 3, cacheRead: 4, cacheWrite: 5, totalTokens: 14, reasoning: 2 } };
    d.message(msg); d.message(msg); // Repeated end notification must not double-count.
    assert.deepEqual(d.snapshot().totals, { input: 2, output: 3, cacheRead: 4, cacheWrite: 5, totalTokens: 14 });
    assert.equal(d.snapshot().model, 'synthetic/test');
    assert.equal(d.snapshot().activity.length, 3);
    assert.equal(d.snapshot().activity[1].status, 'error');
    assert.equal(d.snapshot().activity[1].duration, 20);
    const update = await first.reader.read();
    assert.match(new TextDecoder().decode(update.value), /"kind":"run"/);
    first.controller.abort();
    const second = await stream(d);
    assert.deepEqual((await (await fetch(url(d) + '/snapshot', { headers: auth(d.password) })).json()).totals, d.snapshot().totals);
    assert.match(new TextDecoder().decode((await second.reader.read()).value), /: heartbeat/);
    const address = url(d);
    const pending = second.reader.read().catch(() => ({ done: true }));
    await d.stop();
    assert.equal((await pending).done, true);
    assert.equal(d.streams.size, 0);
    await d.stop();
    await assert.rejects(fetch(address));
  } finally { await d.stop(); }
});

test('occupied port reports EADDRINUSE and leaves running server alone', async () => {
  const occupied = createServer((_req, res) => res.end('untouched'));
  await new Promise(resolve => occupied.listen(0, '127.0.0.1', resolve));
  const d = new Dashboard({ port: occupied.address().port });
  try {
    await assert.rejects(d.start(), { code: 'EADDRINUSE' });
    assert.equal(d.server, null);
    await d.stop();
    assert.equal(await (await fetch(`http://127.0.0.1:${occupied.address().port}`)).text(), 'untouched');
  } finally { await new Promise(resolve => occupied.close(resolve)); }
});
