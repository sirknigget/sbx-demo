import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:3001', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  expect: { toHaveScreenshot: { animations: 'disabled' } },
  webServer: { command: 'npm run dev:client', url: 'http://127.0.0.1:3001', reuseExistingServer: true, timeout: 30000 }
});
