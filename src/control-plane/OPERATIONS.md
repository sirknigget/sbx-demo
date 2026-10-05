# Control Plane

Node.js 22+, Docker CLI/Engine, and an authenticated Codex CLI must be available on the backend machine's PATH.

```sh
cd src/control-plane
npm ci
npm run build
npm start
```

Open http://127.0.0.1:3000. Express serves both the React build and API on the same port. `npm run dev` uses Vite middleware on that same port. `PORT` can override 3000 for testing.

The server binds to loopback and rejects nonlocal hosts and cross-origin/cross-site requests. Keep this application local: it has no authentication or remote-access support. File browsing provides directory metadata only, including hidden entries and navigable directory symlinks; it never serves file contents or modifies files. Permission errors appear in the UI.

Docker uses `docker ps -a` and `docker logs --timestamps --tail 300`. A selected container's logs refresh every second after the previous request completes; leaving the view aborts its request and polling. Docker errors appear in the UI. Stdout and stderr are both included, grouped by stream as returned by Docker.

Task dispatch executes `codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check --color never --cd DIRECTORY -`, passing the single prompt through stdin without a shell. **Dispatched tasks have full machine access, bypass approvals, and run without a sandbox.** The UI states this before dispatch. Working directories can be typed or selected using the directory picker. Task output and status stream through server-sent events; reconnects replay the latest output. Switching sections does not stop a task. Up to four tasks run concurrently. History retains the most recent 50 tasks and the last 2 MiB of output per task in memory; restarting the server clears history. The browser can disable auto-scroll to read earlier output.

## Validation

```sh
npm test
npx playwright install --with-deps chromium
npm run test:e2e
```

E2E tests run a production build on port 3100, intercept every `/api/**` request with fixed fixtures, and never launch Codex or contact Docker/the filesystem. Four versioned Chromium screenshots cover the file browser, Docker list, Docker logs, and task dispatcher. Tests also exercise filtering, directory navigation and selection, read-only entries, exact one-second log polling and cleanup, SSE output/status, and errors. Locale, timezone, viewport, fixtures, and browser version are fixed. Screenshot baselines were generated on Linux; use the Playwright image matching the locked `@playwright/test` version for identical fonts/browser rendering on other hosts.

Regenerate intentional visual changes with `npm run test:e2e:update`, review the images in `e2e/snapshots`, and commit them with the UI change. Run `npm run test:e2e` without updates afterward.

The globally installed `@playwright/cli` can inspect the running app. The verification script uses Playwright's installed Chromium (so Google Chrome is not required), captures all three live sections in the ignored `.runtime/screenshots` folder, and leaves the browser open:

```sh
npm install -g @playwright/cli
npm run verify:ui
playwright-cli -s=control-plane-verify close
```
