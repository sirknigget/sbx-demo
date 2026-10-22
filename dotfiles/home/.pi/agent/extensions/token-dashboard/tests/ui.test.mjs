import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tick = () => new Promise((ok) => setTimeout(ok, 20));

test('SSE snapshots render counters and events; reconnect updates status', async () => {
  const out = await mkdtemp(join(tmpdir(), 'pi-dashboard-ui-'));
  let dom;
  try {
    await build({ configFile: resolve(root, 'vite.config.ts'), logLevel: 'silent', build: { outDir: out, emptyOutDir: true } });
    const asset = (await readdir(join(out, 'assets'))).find((name) => name.endsWith('.js'));
    const script = await readFile(join(out, 'assets', asset), 'utf8');
    const html = await readFile(join(out, 'index.html'), 'utf8');
    dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://127.0.0.1:8765/' });
    const streams = [];
    dom.window.EventSource = class {
      constructor(url) { assert.equal(url, './api/events'); streams.push(this); this.handlers = {}; }
      addEventListener(name, fn) { this.handlers[name] = fn; }
      close() { this.closed = true; }
      emit(data) { this.handlers.snapshot({ data: JSON.stringify(data) }); }
    };
    dom.window.eval(script);
    for (let i = 0; i < 20 && streams.length === 0; i++) await tick();
    assert.equal(streams.length, 1);
    streams[0].emit({ model: 'test/model', totals: { input: 2, output: 3, cacheRead: 5, cacheWrite: 7, totalTokens: 17 }, activities: [{ id: 'tool:1', kind: 'tool', label: 'bash', start: 1000, end: 2000, duration: 1000, status: 'error' }, { id: 'message:1', kind: 'message', label: 'test/model', start: 1000, end: 2000, duration: 1000, status: 'success', usage: { input: 2, output: 3, cacheRead: 5, cacheWrite: 7, totalTokens: 17 } }] });
    await tick();
    assert.equal(dom.window.document.querySelector('[data-counter="totalTokens"]').textContent, '17');
    assert.match(dom.window.document.querySelector('[data-activity="tool"]').textContent, /bash/);
    assert.match(dom.window.document.querySelector('[data-activity="message"]').textContent, /In 2 · Out 3 · Cache read 5 · Cache write 7/);
    assert.match(dom.window.document.querySelector('[role="status"]').textContent, /Live/);
    streams[0].onerror();
    await tick();
    assert.match(dom.window.document.querySelector('[role="status"]').textContent, /Reconnecting/);
    streams[0].emit({ model: 'test/model', totals: { input: 4, output: 3, cacheRead: 5, cacheWrite: 7, totalTokens: 19 }, activities: [] });
    await tick();
    assert.equal(dom.window.document.querySelector('[data-counter="totalTokens"]').textContent, '19');
    assert.match(dom.window.document.querySelector('[role="status"]').textContent, /Live/);
  } finally { dom?.window.close(); await rm(out, { recursive: true, force: true }); }
});
