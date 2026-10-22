import { test, expect } from "@playwright/test";

const home = "/workspace/projects";
const containers = [
  {
    id: "a1b2c3d4e5f6",
    name: "api-server",
    image: "control-plane/api:latest",
    state: "running",
    status: "Up 2 hours",
  },
  {
    id: "b2c3d4e5f6a7",
    name: "postgres-db",
    image: "postgres:16-alpine",
    state: "running",
    status: "Up 2 hours",
  },
  {
    id: "c3d4e5f6a7b8",
    name: "redis-cache",
    image: "redis:7-alpine",
    state: "exited",
    status: "Exited (0) 3 hours ago",
  },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/meta", (route) => route.fulfill({ json: { home } }));
  await page.route("**/api/files?**", (route) => {
    const directory = new URL(route.request().url()).searchParams.get("path");
    const entries =
      directory === home
        ? [
            { name: "control-plane", type: "directory" },
            { name: "design-system", type: "directory" },
            { name: "infra", type: "directory" },
            { name: "package.json", type: "file" },
            { name: "tsconfig.json", type: "file" },
            { name: "vite.config.ts", type: "file" },
          ]
        : [
            { name: "src", type: "directory" },
            { name: "package.json", type: "file" },
          ];
    route.fulfill({
      json: {
        path: directory,
        parent: directory === home ? "/workspace" : home,
        entries,
      },
    });
  });
  await page.route("**/api/containers", (route) =>
    route.fulfill({ json: containers }),
  );
  await page.route("**/api/containers/*/logs", (route) =>
    route.fulfill({
      json: {
        logs: "2026-10-06T09:14:21Z  INFO  Server listening on port 8080\n2026-10-06T09:14:22Z  INFO  Connected to PostgreSQL\n2026-10-06T09:14:23Z  GET   /health 200  4ms\n2026-10-06T09:14:25Z  GET   /api/users 200  12ms\n2026-10-06T09:14:26Z  INFO  Background jobs initialized\n",
      },
    }),
  );
  await page.route("**/api/tasks", (route) => route.fulfill({ json: [] }));
});

test("file browser lists directories and never displays file contents", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "control-plane" }),
  ).toBeVisible();
  await expect(
    page.getByText("Directories only · File contents are never displayed"),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("file-browser.png", { fullPage: true });
  await page.getByRole("button", { name: "control-plane" }).click();
  await expect(page.getByRole("button", { name: "src" })).toBeVisible();
});

test("docker browser shows containers and polls logs every second", async ({
  page,
}) => {
  let logRequests = 0;
  await page.route("**/api/containers/*/logs", (route) => {
    logRequests++;
    route.fulfill({
      json: {
        logs: "2026-10-06T09:14:21Z  INFO  Server listening on port 8080\n2026-10-06T09:14:22Z  INFO  Connected to PostgreSQL\n2026-10-06T09:14:23Z  GET   /health 200  4ms\n2026-10-06T09:14:25Z  GET   /api/users 200  12ms\n2026-10-06T09:14:26Z  INFO  Background jobs initialized\n",
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Docker Browser" }).click();
  await expect(page.getByLabel("Container logs")).toContainText(
    "Server listening on port 8080",
  );
  await expect
    .poll(() => logRequests, { timeout: 3000 })
    .toBeGreaterThanOrEqual(2);
  await expect(page).toHaveScreenshot("docker-browser.png", { fullPage: true });
});

test("task dispatcher shows a prompt, status, and streamed output", async ({
  page,
}) => {
  let created = false;
  let polls = 0;
  await page.route("**/api/tasks", (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body).toEqual({
        prompt: "Add a health check endpoint to the API",
        cwd: `${home}/control-plane`,
      });
      created = true;
      return route.fulfill({
        status: 201,
        json: {
          id: "task-12345678",
          ...body,
          status: "running",
          output: "",
          createdAt: "2026-10-06T09:14:00Z",
        },
      });
    }
    return route.fulfill({
      json: created
        ? [
            {
              id: "task-12345678",
              prompt: "Add a health check endpoint to the API",
              cwd: `${home}/control-plane`,
              status: "running",
              createdAt: "2026-10-06T09:14:00Z",
            },
          ]
        : [],
    });
  });
  await page.route("**/api/tasks/task-12345678", (route) => {
    polls++;
    route.fulfill({
      json: {
        id: "task-12345678",
        prompt: "Add a health check endpoint to the API",
        cwd: `${home}/control-plane`,
        status: "running",
        output:
          polls > 1
            ? "Starting Codex...\nReading project files...\nFound Express server in src/server.ts\nAdding GET /health endpoint...\nRunning checks...\n"
            : "Starting Codex...\n",
        createdAt: "2026-10-06T09:14:00Z",
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Codex Task Dispatcher" }).click();
  await page.getByRole("button", { name: "Choose working directory" }).click();
  await page
    .getByRole("dialog", { name: "Choose working directory" })
    .getByRole("button", { name: "control-plane" })
    .click();
  await page.getByRole("button", { name: "Use this directory" }).click();
  await expect(page.getByLabel("WORKING DIRECTORY REQUIRED")).toHaveValue(
    `${home}/control-plane`,
  );
  await page
    .getByLabel("PROMPT REQUIRED")
    .fill("Add a health check endpoint to the API");
  await page.getByRole("button", { name: "Dispatch task" }).click();
  await expect(page.getByLabel("Task output")).toContainText(
    "Running checks...",
  );
  await expect(
    page.getByText("running", { exact: true }).first(),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("codex-task-dispatcher.png", {
    fullPage: true,
  });
});
