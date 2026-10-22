import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import extension from '../index.ts';

const ctx = { mode: 'tui', model: { provider: 'test', id: 'model' }, ui: { notify(message, severity) { notices.push({ message, severity }); } } };
const notices = [];
const handlers = new Map();
extension({ on(name, handler) { handlers.set(name, handler); } });
async function call(name, event = {}) { return handlers.get(name)(event, ctx); }
const headers = password => ({ Authorization: `Basic ${Buffer.from(`pi:${password}`).toString('base64')}` });

test('port-in-use is reported without disrupting Pi or the other listener', async () => {
  const busy = createServer();
  await new Promise(resolve => busy.listen(8765, '0.0.0.0', resolve));
  try {
    await call('session_start', { reason: 'startup' });
    assert.equal(notices.at(-1).severity, 'error');
    assert.match(notices.at(-1).message, /port 8765 is already in use/);
    await call('session_shutdown', { reason: 'quit' });
    assert.equal(busy.listening, true);
  } finally { await new Promise(resolve => busy.close(resolve)); }
});

test('Pi handlers: start, synthetic events, error, shutdown, reload', async () => {
  await call('session_start', { reason: 'startup' });
  try {
    const notice = notices.at(-1);
    assert.equal(notice.severity, 'info');
    assert.match(notice.message, /0\.0\.0\.0:8765/);
    const password = notice.message.match(/Password: (\S+)/)[1];
    const address = 'http://127.0.0.1:8765/api/state';
    await call('agent_start');
    await call('turn_start', { turnIndex: 0, timestamp: Date.now() });
    await call('tool_execution_start', { toolCallId: 'a', toolName: 'read' });
    await call('tool_execution_end', { toolCallId: 'a', isError: false });
    await call('message_end', { message: { role: 'assistant', model: 'fake', provider: 'test', responseId: 'abc', usage: { input: 2, output: 3, cacheRead: 1, cacheWrite: 1, totalTokens: 7 } } });
    await call('turn_end', { turnIndex: 0, outcome: 'completed' });
    await call('agent_end');
    const state = await (await fetch(address, { headers: headers(password) })).json();
    assert.equal(state.messages, 1);
    assert.equal(state.usage.totalTokens, 7);
    assert.equal(state.activity.find(item => item.kind === 'tool').status, 'success');
    await call('session_shutdown', { reason: 'reload' });
    await call('session_start', { reason: 'reload' });
    const nextPassword = notices.at(-1).message.match(/Password: (\S+)/)[1];
    assert.notEqual(nextPassword, password);
    assert.equal((await fetch(address, { headers: headers(password) })).status, 401);
    assert.equal((await (await fetch(address, { headers: headers(nextPassword) })).json()).messages, 0);
  } finally { await call('session_shutdown', { reason: 'quit' }); }
  // Port released; Pi can restart without an orphaned listener.
  const server = createServer();
  await new Promise(resolve => server.listen(8765, '0.0.0.0', resolve));
  await new Promise(resolve => server.close(resolve));
});
