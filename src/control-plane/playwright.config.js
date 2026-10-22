import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3000",
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    screenshot: "only-on-failure",
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.005 },
  },
  webServer: {
    command: "npm run build && npm start",
    url: "http://127.0.0.1:3000/api/meta",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
