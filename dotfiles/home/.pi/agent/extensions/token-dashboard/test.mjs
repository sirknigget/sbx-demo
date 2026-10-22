import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const globalModules = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const { chromium } = await import(pathToFileURL(join(globalModules, 'playwright/index.mjs')).href);
import extension, { createDashboard } from './index.js';

const url = 'http://127.0.0.1:8765/';
const logs = [];
const dashboard = createDashboard({ log: text => logs.push(text) });
const auth = { Authorization: `Basic ${Buffer.from(`pi:${dashboard.password}`).toString('base64')}` };
let browser;
try {
  assert.equal(await dashboard.start(), true);
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url + 'api/snapshot')).status, 401);
  assert.equal((await fetch(url + 'api/events')).status, 401);
  assert.equal((await fetch(url, { headers: auth })).status, 200);
  const stream = await fetch(url + 'api/events', { headers: auth });
  assert.equal(stream.headers.get('content-type'), 'text/event-stream');
  const reader = stream.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: snapshot/);
  await reader.cancel();
  const message = { role: 'assistant', provider: 'test', model: 'synthetic', responseId: 'one', usage: { input: 5, output: 8, cacheRead: 20, cacheWrite: 3, reasoning: 4, totalTokens: 36 } };
  dashboard.observe({ type: 'agent_start' });
  dashboard.observe({ type: 'turn_start', turnIndex: 0 });
  dashboard.observe({ type: 'tool_execution_start', toolCallId: 't1', toolName: 'read' });
  dashboard.observe({ type: 'tool_execution_end', toolCallId: 't1', toolName: 'read', isError: true });
  dashboard.observe({ type: 'message_end', message });
  dashboard.observe({ type: 'message_end', message });
  dashboard.observe({ type: 'message_end', message: { ...message } });
  dashboard.observe({ type: 'turn_end', turnIndex: 0, outcome: 'completed' });
  dashboard.observe({ type: 'agent_end', messages: [message] });
  assert.deepEqual(dashboard.snapshot().totals, { input: 5, output: 8, cacheRead: 20, cacheWrite: 3, totalTokens: 36, messages: 1 });
  assert.equal(dashboard.snapshot().history.length, 7);
  assert.deepEqual(dashboard.snapshot().history.find(item => item.kind === 'message').usage, { input: 5, output: 8, cacheRead: 20, cacheWrite: 3, totalTokens: 36 });
  for (let i = 0; i < 220; i++) dashboard.observe({ type: 'tool_execution_start', toolCallId: `id${i}`, toolName: 'synthetic' });
  assert.equal(dashboard.snapshot().history.length, 200);
  const snapshot = await (await fetch(url + 'api/snapshot', { headers: auth })).json();
  assert.equal(snapshot.totals.totalTokens, 36);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ httpCredentials: { username: 'pi', password: dashboard.password } });
  const page = await context.newPage();
  await page.goto(url);
  await page.locator('.indicator.live').waitFor({ timeout: 5000 });
  assert.equal(await page.getByTestId('cacheRead').textContent(), '20');
  assert.equal(await page.getByTestId('totalTokens').textContent(), '36');
  await page.getByText('synthetic', { exact: true }).first().waitFor();
  dashboard.observe({ type: 'tool_execution_end', toolCallId: 'id219', toolName: 'after-browser', isError: false });
  await page.getByText('after-browser').waitFor();
  await dashboard.stop();
  await page.locator('.indicator.reconnecting').waitFor({ timeout: 10000 });
  assert.equal(await dashboard.start(), true);
  await page.locator('.indicator.live').waitFor({ timeout: 15000 });
  dashboard.observe({ type: 'message_end', message: { ...message, responseId: 'two', usage: { ...message.usage, totalTokens: 99 } } });
  await page.getByTestId('totalTokens').getByText('135').waitFor();
  await page.getByText('Pi total: 99').waitFor();
  await context.close();
  for (let i = 0; i < 20 && dashboard.clientCount; i++) await delay(50);
  assert.equal(dashboard.clientCount, 0);
  console.log('PASS HTTP auth, SSE, browser live updates, reconnect, bounded history, exact token accounting');
} finally { await browser?.close(); await dashboard.stop(); }

const blocker = createServer();
await new Promise(resolve => blocker.listen(8765, '0.0.0.0', resolve));
const unavailable = createDashboard({ log: text => logs.push(text) });
assert.equal(await unavailable.start(), false);
assert.match(logs.at(-1), /port 8765 is already in use/);
await unavailable.stop();
await new Promise(resolve => blocker.close(resolve));
console.log('PASS port conflict is nonfatal');

const handlers = new Map();
const notices = [];
extension({ on: (name, handler) => handlers.set(name, handler) });
const tui = { mode: 'tui', model: { provider: 'test', id: 'model' }, ui: { notify: (text, type) => notices.push({ text, type }) } };
await handlers.get('session_start')({ reason: 'startup' }, tui);
assert.match(notices.at(-1).text, /password: \S+.*0\.0\.0\.0:8765/);
assert.equal(notices.at(-1).type, 'info');
const beforeReload = await (await fetch(url + 'api/snapshot')).status;
assert.equal(beforeReload, 401);
// Reload closes the old listener before starting it again.
await handlers.get('session_shutdown')({ reason: 'reload' });
await assert.rejects(fetch(url));
await handlers.get('session_start')({ reason: 'reload' }, tui);
assert.equal((await fetch(url)).status, 401);
await handlers.get('session_shutdown')({ reason: 'quit' });
console.log('PASS TUI notification and extension reload shutdown and restart');

// A separate Pi process discovers the user extension without --extension; no model call is made.
const child = spawn('pi', ['--mode', 'rpc', '--no-session', '--offline', '--no-approve'], { cwd: '/tmp', stdio: ['pipe', 'pipe', 'pipe'] });
let stderr = '';
child.stderr.on('data', chunk => { stderr += chunk; });
child.stdout.resume();
try {
  for (let i = 0; i < 100 && !stderr.includes('Pi token dashboard: http://'); i++) { assert.equal(child.exitCode, null, stderr); await delay(100); }
  assert.match(stderr, /Pi token dashboard: http:\/\/127.0.0.1:8765\//);
  const match = stderr.match(/password: (\S+)/);
  assert.ok(match);
  const response = await fetch(url + 'api/snapshot', { headers: { Authorization: `Basic ${Buffer.from(`pi:${match[1]}`).toString('base64')}` } });
  assert.equal(response.status, 200);
  child.stdin.end();
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(10000).then(() => { throw new Error('Pi failed to exit'); })]);
  assert.equal(child.exitCode, 0, stderr);
  await assert.rejects(fetch(url));
  console.log('PASS fresh Pi automatic discovery, session shutdown closes listener');
} finally { if (child.exitCode === null) child.kill(); }
