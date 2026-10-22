# Pi token dashboard

Pi discovers `index.js` automatically from the user extensions directory. The HTTP server starts with a normal session (not during resource discovery) and listens on `0.0.0.0:8765`. Pi prints the local URL, Basic username (`pi`), and a fresh per-process password in its terminal. Never share the password or add it to a URL. The same credentials protect the page, `/api/snapshot`, `/api/events`, and assets. Binding to all interfaces makes this reachable on the network: use a trusted network or a firewall.

The dashboard counts only completed assistant-message `usage` fields; Pi's `totalTokens` is displayed as reported, not calculated from other counters. Cache and reasoning tokens are not added twice. Activity and totals are in memory and reset when the extension reloads or a new Pi process starts. The most recent 200 activity events are retained for new viewers; historic sessions, tool-reported usage, and compaction usage are not included.

Build frontend assets from this directory with `npm ci && npm run build` (Vite is also installed globally). Run synthetic integration and globally installed Playwright checks with `npm test`. Pi serves built files from `frontend/dist` relative to `index.js`; Vite is a build tool, not a second HTTP listener. No model calls are required for tests.
