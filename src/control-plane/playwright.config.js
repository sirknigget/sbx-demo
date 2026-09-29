import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:3000', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' },
  snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
  webServer: { command: 'npm start', url: 'http://127.0.0.1:3000', reuseExistingServer: true, timeout: 30000 },
});
