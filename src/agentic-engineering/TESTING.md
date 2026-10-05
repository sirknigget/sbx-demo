# Run and validate

From this directory:

```sh
docker compose up --build -d
# Open http://localhost:3001
docker logs -f agentic-engineering
```

Both the built React frontend and the Node backend run in the same container.
The form posts to `/api/log`; the backend writes the submitted text to stdout.

The globally installed browser automation CLI is `@playwright/cli` (`playwright-cli`).
If absent, install it with `npm install -g @playwright/cli`.
The version-pinned Playwright test runner below creates and compares the committed
desktop and mobile screenshots and checks new output in the actual Docker log.

```sh
npm ci
npx playwright install --with-deps chromium
npm run test:e2e
```

Snapshots were generated with Playwright 1.63.0 Chromium on Ubuntu 26.04 ARM64, using system
Arial and Courier New fallbacks, fixed viewport sizes, locale, timezone, device
scale, and reduced motion. The app has no remote fonts, images, or dynamic dates.
Use the same Linux browser environment for pixel-exact comparison. On other
platforms, font rendering can differ.

For an intentional design change, regenerate the baselines, visually inspect
`tests/snapshots/desktop.png` and `tests/snapshots/mobile.png`, then rerun the test
without update mode and commit the reviewed images:

```sh
npm run test:e2e:update
npm run test:e2e
```
