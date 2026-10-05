import express from "express";
import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const app = express();
const tasks = new Map();
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "../dist");
const home = process.env.HOME || "/";

app.use(express.json({ limit: "1mb" }));

function run(command, args, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { timeout });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(stdout + stderr)
        : reject(new Error(stderr.trim() || `${command} exited ${code}`)),
    );
  });
}

function errorResponse(res, error) {
  res
    .status(error.code === "ENOENT" ? 404 : 400)
    .json({ error: error.message });
}

app.get("/api/meta", (_req, res) => res.json({ home }));

app.get("/api/files", async (req, res) => {
  try {
    const directory = path.resolve(String(req.query.path || home));
    if (!(await stat(directory)).isDirectory())
      return res.status(400).json({ error: "Path is not a directory" });
    const entries = await readdir(directory, { withFileTypes: true });
    res.json({
      path: directory,
      parent:
        directory === path.parse(directory).root
          ? null
          : path.dirname(directory),
      entries: entries
        .map((entry) => ({
          name: entry.name,
          type: entry.isDirectory()
            ? "directory"
            : entry.isSymbolicLink()
              ? "link"
              : "file",
        }))
        .sort(
          (a, b) =>
            (a.type !== "directory") - (b.type !== "directory") ||
            a.name.localeCompare(b.name),
        ),
    });
  } catch (error) {
    errorResponse(res, error);
  }
});

app.get("/api/containers", async (_req, res) => {
  try {
    const output = await run("docker", ["ps", "-a", "--format", "{{json .}}"]);
    res.json(
      output
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const row = JSON.parse(line);
          return {
            id: row.ID,
            name: row.Names,
            image: row.Image,
            status: row.Status,
            state: row.State,
          };
        }),
    );
  } catch (error) {
    errorResponse(res, error);
  }
});

app.get("/api/containers/:id/logs", async (req, res) => {
  if (!/^[a-f0-9]{12,64}$/i.test(req.params.id))
    return res.status(400).json({ error: "Invalid container ID" });
  try {
    res.json({
      logs: await run("docker", [
        "logs",
        "--tail",
        "200",
        "--timestamps",
        req.params.id,
      ]),
    });
  } catch (error) {
    errorResponse(res, error);
  }
});

app.get("/api/tasks", (_req, res) =>
  res.json(
    [...tasks.values()]
      .map(({ id, prompt, cwd, status, createdAt }) => ({
        id,
        prompt,
        cwd,
        status,
        createdAt,
      }))
      .reverse(),
  ),
);

app.get("/api/tasks/:id", (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

app.post("/api/tasks", async (req, res) => {
  const prompt =
    typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  const cwd =
    typeof req.body?.cwd === "string" ? path.resolve(req.body.cwd) : "";
  if (!prompt || !cwd)
    return res
      .status(400)
      .json({ error: "Prompt and working directory are required" });
  try {
    if (!(await stat(cwd)).isDirectory())
      return res
        .status(400)
        .json({ error: "Working directory is not a directory" });
  } catch (error) {
    return errorResponse(res, error);
  }

  const task = {
    id: randomUUID(),
    prompt,
    cwd,
    status: "running",
    output: "",
    createdAt: new Date().toISOString(),
  };
  tasks.set(task.id, task);
  const child = spawn(
    "codex",
    [
      "exec",
      "--dangerously-bypass-approvals-and-sandbox",
      "--skip-git-repo-check",
      "--model",
      "gpt-6-sol",
      "--config",
      'model_reasoning_effort="medium"',
      "-C",
      cwd,
      prompt,
    ],
    { cwd, env: process.env },
  );
  const append = (chunk) => {
    task.output += chunk.toString();
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("error", (error) => {
    task.output += `\n${error.message}\n`;
    task.status = "failed";
  });
  child.on("close", (code) => {
    task.status = code === 0 ? "completed" : "failed";
    task.exitCode = code;
  });
  res.status(201).json(task);
});

app.use(express.static(dist));
app.get("/{*path}", (_req, res) => res.sendFile(path.join(dist, "index.html")));

const port = Number(process.env.PORT || 3000);
app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `Control Plane listening on http://${process.env.HOST || "127.0.0.1"}:${port}`,
  ),
);
