import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { dashboard } from '../dashboard.ts';

const port = 18765;
const base = `http://127.0.0.1:${port}`;
const listeners = new Map();
const pi = { on(name, fn) { listeners.set(name, fn); } };
const app = dashboard(pi, { port, log: () => {} });
const emit = (name, event = {}) => listeners.get(name)(event, { model: { provider: 'demo', id: 'model' } });
const request = (path, password = app.password) => fetch(base + path, { headers: { Authorization: `Basic ${Buffer.from(`pi:${password}`).toString('base64')}` } });
const message = { role: 'assistant', provider: 'demo', model: 'model', timestamp: Date.now(), stopReason: 'stop', usage: { input: 10, output: 5, cacheRead: 7, cacheWrite: 3, totalTokens: 25, reasoning: 2 } };

test('auth, streaming, accounting, bounded history, reconnect and cleanup', async () => {
  await emit('session_start');
  try {
    assert.equal((await fetch(base + '/')).status, 401);
    assert.equal((await fetch(base + '/api/snapshot')).status, 401);
    assert.equal((await fetch(base + '/api/events')).status, 401);
    assert.equal((await request('/api/snapshot', 'wrong')).status, 401);
    const page = await request('/');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Pi token dashboard/);
    const ui = await request('/src/main.jsx');
    assert.equal(ui.status, 200);
    assert.match(await ui.text(), /Reconnecting/);
    assert.equal((await request('/dashboard.ts')).status, 404);
    const client = await request('/api/events');
    assert.equal(client.headers.get('content-type'), 'text/event-stream');
    const reader = client.body.getReader();
    assert.match(new TextDecoder().decode((await reader.read()).value), /event: state/);
    emit('agent_start'); emit('turn_start', { turnIndex: 1 });
    emit('tool_execution_start', { toolCallId: 'a', toolName: 'read' });
    emit('tool_execution_end', { toolCallId: 'a', toolName: 'read', isError: true });
    emit('message_end', { message }); emit('message_end', { message });
    emit('turn_end', { turnIndex: 1, message }); emit('agent_end', { messages: [message] });
    let state = await (await request('/api/snapshot')).json();
    assert.deepEqual(state.total, { input: 10, output: 5, cacheRead: 7, cacheWrite: 3, totalTokens: 25 });
    assert.equal(state.messages, 1);
    assert.equal(state.activity.find(row => row.name === 'read').status, 'error');
    assert.ok(state.activity.find(row => row.name === 'read').durationMs >= 0);
    assert.match(new TextDecoder().decode((await reader.read()).value), /event: state/);
    await reader.cancel();
    const second = await request('/api/events');
    const secondReader = second.body.getReader();
    assert.match(new TextDecoder().decode((await secondReader.read()).value), /read/);
    await secondReader.cancel();
    for (let i = 0; i < 205; i++) emit('tool_execution_start', { toolCallId: `t${i}`, toolName: 'test' });
    state = await (await request('/api/snapshot')).json();
    assert.equal(state.activity.length, 200);
    await emit('session_shutdown');
    await assert.rejects(fetch(base + '/api/snapshot'));
    await emit('session_start');
    assert.equal((await request('/api/snapshot')).status, 200);
    assert.equal((await request('/api/snapshot', 'wrong')).status, 401);
  } finally { await app.stop(); }
});

test('occupied port is reported without throwing or stealing listener', async () => {
  const occupied = createServer();
  await new Promise(resolve => occupied.listen(18766, '0.0.0.0', resolve));
  const logs = [];
  const blocked = dashboard({ on() {} }, { port: 18766, log: text => logs.push(text) });
  try {
    await blocked.start();
    assert.match(logs.join('\n'), /unavailable on port 18766: listen EADDRINUSE/);
    assert.equal(occupied.listening, true);
  } finally { await blocked.stop(); await new Promise(resolve => occupied.close(resolve)); }
});
