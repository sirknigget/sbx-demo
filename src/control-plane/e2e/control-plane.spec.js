import { test, expect } from "@playwright/test";

const modified = "2026-09-24T09:00:00.000Z";
const entry = (name, type, size = null, base = "/workspace") => ({
  name,
  type,
  size,
  modified,
  path: `${base}/${name}`,
});
const folders = {
  "/workspace": {
    path: "/workspace",
    parent: "/",
    entries: [
      entry(".config", "directory"),
      entry("apps", "directory"),
      entry("documents", "directory"),
      entry("projects", "directory"),
      entry("scripts", "directory"),
      entry(".gitignore", "file", 284),
      entry("docker-compose.yml", "file", 1843),
      entry("package.json", "file", 1254),
      entry("notes.txt", "file", 416),
    ],
  },
  "/workspace/projects": {
    path: "/workspace/projects",
    parent: "/workspace",
    entries: [
      entry("atlas", "directory", null, "/workspace/projects"),
      entry("orbit", "directory", null, "/workspace/projects"),
    ],
  },
  "/workspace/projects/atlas": {
    path: "/workspace/projects/atlas",
    parent: "/workspace/projects",
    entries: [entry("src", "directory", null, "/workspace/projects/atlas")],
  },
  "/": {
    path: "/",
    parent: "/",
    entries: [entry("workspace", "directory", null, "")],
  },
};
const containers = [
  {
    id: "a1b2c3d4e5f6".repeat(5) + "abcd",
    name: "atlas-api",
    image: "atlas/api:latest",
    state: "running",
    status: "Up 2 hours",
    ports: "0.0.0.0:8080→8080/tcp",
  },
  {
    id: "b2c3d4e5f6a1".repeat(5) + "abcd",
    name: "atlas-postgres",
    image: "postgres:16-alpine",
    state: "running",
    status: "Up 2 hours (healthy)",
    ports: "0.0.0.0:5432→5432/tcp",
  },
  {
    id: "c3d4e5f6a1b2".repeat(5) + "abcd",
    name: "atlas-redis",
    image: "redis:7-alpine",
    state: "running",
    status: "Up 2 hours",
    ports: "6379/tcp",
  },
  {
    id: "d4e5f6a1b2c3".repeat(5) + "abcd",
    name: "worker-preview",
    image: "atlas/worker:preview",
    state: "exited",
    status: "Exited (0) 35 minutes ago",
    ports: "",
  },
];
const output = [
  "2026-09-24T09:00:00.000Z  INFO  Starting Atlas API v1.4.0",
  "2026-09-24T09:00:00.125Z  INFO  Environment: development",
  "2026-09-24T09:00:00.210Z  INFO  Connected to PostgreSQL",
  "2026-09-24T09:00:00.254Z  INFO  Redis connection established",
  "2026-09-24T09:00:00.310Z  INFO  Server listening on 0.0.0.0:8080",
  "2026-09-24T09:00:01.000Z  INFO  GET /health 200 2ms",
  "2026-09-24T09:00:02.000Z  INFO  GET /api/projects 200 14ms",
  "2026-09-24T09:00:03.000Z  INFO  GET /api/projects/atlas 200 8ms",
].join("\n");
const task = {
  id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  prompt: "Inspect this project and summarize its architecture.",
  cwd: "/workspace/projects/atlas",
  status: "running",
  output: "",
  startedAt: "2026-09-24T09:00:00.000Z",
  exitCode: null,
};
const taskOutput =
  "Codex · /workspace/projects/atlas\n\nInspecting project structure…\nFound a React frontend and an Express API.\n\nArchitecture summary\n• client/ contains the UI and reusable components.\n• server/ exposes the API and background job handlers.\n• PostgreSQL stores project data; Redis manages the job queue.\n\nInspection complete. No files changed.\n";

test.beforeEach(async ({ page }) => {
  // Fail closed: no test request may reach the machine filesystem, Docker, or Codex.
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/info")
      return route.fulfill({ json: { cwd: "/workspace", platform: "linux" } });
    if (url.pathname === "/api/files") {
      const data = folders[url.searchParams.get("path")];
      return route.fulfill({
        status: data ? 200 : 404,
        json: data || { error: "Directory not found." },
      });
    }
    if (url.pathname === "/api/containers")
      return route.fulfill({ json: { containers } });
    if (url.pathname.endsWith("/logs"))
      return route.fulfill({ json: { output } });
    if (url.pathname === "/api/tasks" && route.request().method() === "GET")
      return route.fulfill({ json: { tasks: [] } });
    if (url.pathname === "/api/tasks" && route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({
        prompt: task.prompt,
        cwd: task.cwd,
      });
      return route.fulfill({ status: 201, json: task });
    }
    if (url.pathname === `/api/tasks/${task.id}/events`)
      return route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ ...task, output: "Inspecting project structure…\n" })}\n\ndata: ${JSON.stringify({ ...task, status: "completed", output: taskOutput, exitCode: 0 })}\n\n`,
      });
    throw new Error(
      `Unexpected API request: ${route.request().method()} ${url.pathname}`,
    );
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "projects", exact: true }),
  ).toBeVisible();
});

test("File Browser: snapshot, filtering, directory navigation, read-only files", async ({
  page,
}) => {
  await expect(page.getByText("9 items", { exact: false })).toBeVisible();
  await expect(page).toHaveScreenshot("file-browser.png", { fullPage: true });
  await expect(page.getByRole("button", { name: "notes.txt" })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Filter files" }).fill("package");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Filter files" }).fill("");
  await page.getByRole("button", { name: "projects", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "atlas", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Parent directory" }).click();
  await expect(page.getByText("notes.txt")).toBeVisible();
  await page.getByRole("button", { name: "Root", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Parent directory" }),
  ).toBeDisabled();
});

test("Docker Browser: snapshot, filter, logs, one-second polling and cleanup", async ({
  page,
}) => {
  let polls = 0;
  await page.route("**/api/containers/*/logs", (route) => {
    polls++;
    return route.fulfill({ json: { output } });
  });
  await page
    .getByRole("button", { name: "Docker Browser", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "atlas-api atlas/api:latest" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("docker-browser.png", { fullPage: true });
  await page.getByRole("textbox", { name: "Filter containers" }).fill("worker");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Filter containers" }).fill("");
  await page.clock.install();
  await page.getByRole("button", { name: "View logs for atlas-api" }).click();
  await expect(
    page.getByLabel("Container logs", { exact: true }),
  ).toContainText("Server listening");
  expect(polls).toBe(1);
  await page.clock.runFor(1000);
  await expect.poll(() => polls).toBe(2);
  await expect(page).toHaveScreenshot("docker-logs.png", { fullPage: true });
  await page
    .getByRole("button", { name: "All containers", exact: true })
    .click();
  await page.clock.runFor(3000);
  expect(polls).toBe(2);
});

test("Codex Task Dispatcher: directory picker, dispatch, streamed status and snapshot", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Codex Task Dispatcher", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dispatch task" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Browse", exact: true }).click();
  const picker = page.getByRole("dialog");
  await picker.getByRole("button", { name: "projects", exact: true }).click();
  await picker.getByRole("button", { name: "atlas", exact: true }).click();
  await expect(
    picker.getByRole("button", { name: "src", exact: true }),
  ).toBeVisible();
  await picker.getByRole("button", { name: "Use this directory" }).click();
  await expect(
    page.getByLabel("Working directory", { exact: true }),
  ).toHaveValue(task.cwd);
  await page.getByLabel("Prompt", { exact: true }).fill(task.prompt);
  await page
    .getByRole("button", { name: "Dispatch task", exact: true })
    .click();
  await expect(page.getByLabel("Task output", { exact: true })).toContainText(
    "Inspection complete. No files changed.",
  );
  await expect(page.getByText("completed", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Process exited with code 0")).toBeVisible();
  await expect(page).toHaveScreenshot("codex-dispatcher.png", {
    fullPage: true,
  });
});

test("API errors are visible without disabling navigation", async ({
  page,
}) => {
  await page.route("**/api/containers", (route) =>
    route.fulfill({
      status: 500,
      json: { error: "Docker daemon is unavailable." },
    }),
  );
  await page
    .getByRole("button", { name: "Docker Browser", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Docker daemon is unavailable.",
  );
  await page
    .getByRole("button", { name: "Codex Task Dispatcher", exact: true })
    .click();
  await page.route("**/api/tasks", (route) =>
    route.fulfill({
      status: 404,
      json: { error: "Working directory does not exist." },
    }),
  );
  await page.getByLabel("Prompt", { exact: true }).fill("Inspect the project.");
  await page
    .getByRole("button", { name: "Dispatch task", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Working directory does not exist.",
  );
  await expect(page.getByLabel("Prompt", { exact: true })).toHaveValue(
    "Inspect the project.",
  );
});
