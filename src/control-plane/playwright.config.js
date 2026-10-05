import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixels: 0 } },
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
  webServer: {
    command: "npm run build && npm start",
    url: "http://127.0.0.1:3100",
    env: { PORT: "3100" },
    reuseExistingServer: false,
    timeout: 60000,
  },
});
