import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:3001",
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 0,
    },
  },
});
