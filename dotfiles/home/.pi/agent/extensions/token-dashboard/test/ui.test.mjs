import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const delay = () => new Promise(resolve => setTimeout(resolve, 30));

test('React renders event updates, connection state and reconnect snapshot', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://example.test/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  const sources = [];
  globalThis.EventSource = class {
    constructor(path) { this.path = path; this.listeners = {}; sources.push(this); }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    removeEventListener(name) { delete this.listeners[name]; }
    close() { this.closed = true; }
    send(data) { this.listeners.snapshot({ data: JSON.stringify(data) }); }
  };
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    await vite.ssrLoadModule('/src/main.jsx');
    await delay();
    assert.equal(sources[0].path, './events');
    assert.match(document.body.textContent, /Connecting/);
    sources[0].send({ model: 'synthetic/test', totals: { input: 2, output: 3, cacheRead: 4, cacheWrite: 5, totalTokens: 14 }, activity: [{ id: 1, kind: 'tool', name: 'bash', start: 100, end: 130, duration: 30, status: 'error' }] });
    await delay();
    assert.match(document.body.textContent, /Live/);
    assert.match(document.body.textContent, /Tool · bash/);
    assert.match(document.body.textContent, /Pi reported total14/);
    sources[0].onerror();
    await delay();
    assert.match(document.body.textContent, /Reconnecting/);
    sources[0].send({ model: 'synthetic/test', totals: { input: 7, output: 3, cacheRead: 4, cacheWrite: 5, totalTokens: 19 }, activity: [] });
    await delay();
    assert.match(document.body.textContent, /Live/);
    assert.match(document.body.textContent, /Pi reported total19/);
  } finally { await vite.close(); dom.window.close(); }
});
