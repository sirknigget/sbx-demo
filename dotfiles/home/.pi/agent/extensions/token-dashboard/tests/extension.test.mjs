import test from 'node:test';
import assert from 'node:assert/strict';
import { createJiti } from 'jiti';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jiti = createJiti(import.meta.url);
const extension = jiti(resolve(root, 'index.ts')).default;

test('Pi events count each completed assistant once, tools and turn outcomes', async () => {
  const handlers = new Map();
  extension({ on: (name, handler) => handlers.set(name, handler) });
  const notices = [];
  const ctx = { model: { provider: 'test', id: 'model' }, hasUI: true, ui: { notify: (...args) => notices.push(args), setStatus: () => {} } };
  await handlers.get('session_start')({ reason: 'startup' }, ctx);
  assert.match(notices[0][0], /running on 0.0.0.0:8765.*password:/);
  const password = notices[0][0].split('password: ')[1];
  const headers = { Authorization: `Basic ${Buffer.from(`pi:${password}`).toString('base64')}` };
  try {
    handlers.get('agent_start')({});
    handlers.get('turn_start')({ turnIndex: 0, timestamp: 100 });
    handlers.get('tool_execution_start')({ toolCallId: 'call1', toolName: 'bash' });
    handlers.get('tool_execution_end')({ toolCallId: 'call1', toolName: 'bash', isError: true });
    const message = { role: 'assistant', provider: 'test', model: 'model', timestamp: 150, stopReason: 'stop', responseId: 'response-1', usage: { input: 2, output: 3, cacheRead: 5, cacheWrite: 7, totalTokens: 17 } };
    handlers.get('message_end')({ message });
    handlers.get('message_end')({ message });
    handlers.get('message_end')({ message: { ...message } });
    handlers.get('turn_end')({ turnIndex: 0, outcome: 'completed' });
    handlers.get('agent_end')({ messages: [message] });
    const response = await fetch('http://127.0.0.1:8765/api/snapshot', { headers });
    const data = await response.json();
    assert.equal(data.totals.totalTokens, 17);
    assert.deepEqual(data.totals, { input: 2, output: 3, cacheRead: 5, cacheWrite: 7, totalTokens: 17 });
    assert.equal(data.activities.filter((item) => item.kind === 'message').length, 1);
    assert.equal(data.activities.find((item) => item.kind === 'tool').status, 'error');
    assert.equal(data.activities.find((item) => item.kind === 'turn').status, 'success');
    assert.equal(data.activities.find((item) => item.kind === 'run').status, 'success');
  } finally { await handlers.get('session_shutdown')({ reason: 'reload' }, ctx); }
  await assert.rejects(fetch('http://127.0.0.1:8765/api/snapshot', { headers }));
  await handlers.get('session_start')({ reason: 'reload' }, ctx);
  const nextPassword = notices.at(-1)[0].split('password: ')[1];
  assert.notEqual(nextPassword, password);
  try {
    const newHeaders = { Authorization: `Basic ${Buffer.from(`pi:${nextPassword}`).toString('base64')}` };
    assert.equal((await fetch('http://127.0.0.1:8765/api/snapshot', { headers })).status, 401);
    const reset = await (await fetch('http://127.0.0.1:8765/api/snapshot', { headers: newHeaders })).json();
    assert.equal(reset.totals.totalTokens, 0);
  } finally { await handlers.get('session_shutdown')({ reason: 'quit' }, ctx); }
});
