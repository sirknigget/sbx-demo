import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";

const run = promisify(execFile);
const session = "-s=control-plane-verify";
await mkdir(".runtime/screenshots", { recursive: true });
// Use Playwright's installed Chromium, including on ARM machines without Google Chrome.
await writeFile(
  ".runtime/cli-config.json",
  JSON.stringify({
    browser: {
      browserName: "chromium",
      launchOptions: { executablePath: chromium.executablePath() },
    },
  }),
);
async function cli(...args) {
  const { stdout, stderr } = await run("playwright-cli", [session, ...args]);
  if (/### Error/.test(stdout)) throw new Error(stdout);
  process.stdout.write(stdout);
  process.stderr.write(stderr);
}
await cli(
  "open",
  `http://127.0.0.1:${process.env.PORT || 3000}`,
  "--config=.runtime/cli-config.json",
);
await cli("resize", "1440", "1000");
await cli(
  "run-code",
  'async (page) => { await page.locator("table").waitFor(); await page.getByRole("status").waitFor({state:"hidden"}); }',
);
await cli(
  "screenshot",
  "--filename=.runtime/screenshots/file-browser.png",
  "--full-page",
);
await cli(
  "run-code",
  'async (page) => { await page.getByRole("button", {name:"Docker Browser", exact:true}).click(); await page.getByRole("status").waitFor({state:"hidden"}); }',
);
await cli(
  "screenshot",
  "--filename=.runtime/screenshots/docker-browser.png",
  "--full-page",
);
await cli(
  "run-code",
  'async (page) => { await Promise.all([page.waitForResponse(response => response.url().endsWith("/api/tasks")), page.getByRole("button", {name:"Codex Task Dispatcher", exact:true}).click()]); await page.getByLabel("Working directory", {exact:true}).waitFor(); }',
);
await cli(
  "screenshot",
  "--filename=.runtime/screenshots/codex-dispatcher.png",
  "--full-page",
);
await cli("console", "error");
