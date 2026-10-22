import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { createDashboard } from '../dashboard.mjs';

test('built React page renders live SSE updates and reconnect state', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { runScripts: 'outside-only', url: 'http://example.test/' });
  const { window } = dom;
  const streams = [];
  window.EventSource = class {
    constructor(url) { assert.equal(url, './api/events'); streams.push(this); this.listeners = new Map(); }
    addEventListener(name, fn) { this.listeners.set(name, fn); }
    emit(name, data) { this.listeners.get(name)({ data: JSON.stringify(data) }); }
    close() {}
  };
  window.eval(await readFile(new URL('../dist/app.js', import.meta.url), 'utf8'));
  const tick = () => new Promise(resolve => setTimeout(resolve, 30));
  await tick();
  assert.match(window.document.body.textContent, /Reconnecting/);
  const dashboard = createDashboard();
  dashboard.toolStart('id', 'bash');
  dashboard.message({ role: 'assistant', provider: 'synthetic', model: 'fake', usage: { input: 10, output: 2, cacheRead: 3, cacheWrite: 4, totalTokens: 19 }, stopReason: 'stop' });
  streams[0].emit('snapshot', dashboard.snapshot());
  await tick();
  assert.match(window.document.body.textContent, /Live/);
  assert.equal(window.document.querySelector('[data-token="totalTokens"]').textContent, '19');
  assert.match(window.document.body.textContent, /bash/);
  streams[0].onerror();
  await tick();
  assert.match(window.document.body.textContent, /Reconnecting/);
  streams[0].emit('snapshot', dashboard.snapshot());
  await tick();
  assert.match(window.document.body.textContent, /Live/);
  window.close();
});
