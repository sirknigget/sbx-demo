import express from "express";
import { readdir, stat, realpath } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";

const runFile = promisify(execFile);
const terminal = new Set(["completed", "failed"]);
const OUTPUT_LIMIT = 2 * 1024 * 1024;
const dockerId = /^[a-f0-9]{12,64}$/;

export function createApp({
  cwd = process.cwd(),
  launch = spawn,
  run = runFile,
} = {}) {
  const app = express();
  const tasks = new Map();
  // This application grants local process access. Bind loopback and reject cross-site requests.
  app.use((req, res, next) => {
    const allowed = new Set(["127.0.0.1", "localhost", "[::1]"]);
    if (!allowed.has(req.hostname))
      return res.status(403).json({ error: "Local access only." });
    if (
      req.headers.origin &&
      req.headers.origin !== `http://${req.headers.host}`
    ) {
      return res
        .status(403)
        .json({ error: "Cross-origin access is disabled." });
    }
    if (req.headers["sec-fetch-site"] === "cross-site") {
      return res.status(403).json({ error: "Cross-site access is disabled." });
    }
    next();
  });
  app.use(express.json({ limit: "64kb" }));
  app.get("/api/info", (_req, res) =>
    res.json({ cwd, platform: process.platform }),
  );
  app.get("/api/files", async (req, res) => {
    const path = await realpath(resolve(String(req.query.path || cwd)));
    const children = await readdir(path, { withFileTypes: true });
    const entries = await Promise.all(
      children.map(async (entry) => {
        const fullPath = resolve(path, entry.name);
        let details;
        try {
          details = await stat(fullPath);
        } catch {
          /* Unreadable or broken link. */
        }
        return {
          name: entry.name,
          path: fullPath,
          type: details?.isDirectory()
            ? "directory"
            : entry.isSymbolicLink()
              ? "link"
              : "file",
          size: details?.isFile() ? details.size : null,
          modified: details?.mtime.toISOString() ?? null,
        };
      }),
    );
    entries.sort(
      (a, b) =>
        Number(b.type === "directory") - Number(a.type === "directory") ||
        a.name.localeCompare(b.name),
    );
    res.json({ path, parent: dirname(path), entries });
  });
  app.get("/api/containers", async (_req, res) => {
    const { stdout } = await run(
      "docker",
      ["ps", "-a", "--no-trunc", "--format", "{{json .}}"],
      { timeout: 10000, maxBuffer: OUTPUT_LIMIT },
    );
    const containers = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const row = JSON.parse(line);
        return {
          id: row.ID,
          name: row.Names,
          image: row.Image,
          state: row.State,
          status: row.Status,
          ports: row.Ports,
        };
      });
    res.json({ containers });
  });
  app.get("/api/containers/:id/logs", async (req, res) => {
    if (!dockerId.test(req.params.id))
      return res.status(400).json({ error: "Invalid container ID." });
    const { stdout, stderr } = await run(
      "docker",
      ["logs", "--timestamps", "--tail", "300", req.params.id],
      { timeout: 10000, maxBuffer: OUTPUT_LIMIT },
    );
    res.json({ output: stdout + stderr });
  });
  const snapshot = (task) => ({
    id: task.id,
    prompt: task.prompt,
    cwd: task.cwd,
    status: task.status,
    output: task.output,
    startedAt: task.startedAt,
    exitCode: task.exitCode,
  });
  const broadcast = (task) => {
    const event = `data: ${JSON.stringify(snapshot(task))}\n\n`;
    for (const client of task.clients) {
      client.write(event);
      if (terminal.has(task.status)) client.end();
    }
    if (terminal.has(task.status)) task.clients.clear();
  };
  app.get("/api/tasks", (_req, res) =>
    res.json({ tasks: [...tasks.values()].reverse().map(snapshot) }),
  );
  app.post("/api/tasks", async (req, res) => {
    const { prompt, cwd: requestedCwd } = req.body ?? {};
    if (
      typeof prompt !== "string" ||
      !prompt.trim() ||
      prompt.length > 32000 ||
      typeof requestedCwd !== "string" ||
      !requestedCwd.trim()
    ) {
      return res
        .status(400)
        .json({
          error:
            "Provide a prompt (up to 32,000 characters) and working directory.",
        });
    }
    const directory = await realpath(resolve(requestedCwd));
    if (!(await stat(directory)).isDirectory())
      return res
        .status(400)
        .json({ error: "Working directory must be a directory." });
    if (
      [...tasks.values()].filter((task) => task.status === "running").length >=
      4
    ) {
      return res
        .status(429)
        .json({
          error: "Four tasks are already running. Wait for a task to finish.",
        });
    }
    // Retain at most 50 tasks in memory; live tasks are never evicted.
    while (tasks.size >= 50) {
      const old = [...tasks.values()].find((task) => terminal.has(task.status));
      if (!old) break;
      tasks.delete(old.id);
    }
    const task = {
      id: randomUUID(),
      prompt: prompt.trim(),
      cwd: directory,
      status: "running",
      output: "",
      startedAt: new Date().toISOString(),
      exitCode: null,
      clients: new Set(),
    };
    tasks.set(task.id, task);
    const append = (text) => {
      task.output = (task.output + text).slice(-OUTPUT_LIMIT);
      broadcast(task);
    };
    try {
      const child = launch(
        "codex",
        [
          "exec",
          "--dangerously-bypass-approvals-and-sandbox",
          "--skip-git-repo-check",
          "--color",
          "never",
          "--cd",
          directory,
          "-",
        ],
        { cwd: directory, stdio: ["pipe", "pipe", "pipe"], shell: false },
      );
      task.child = child;
      // Passing the prompt via stdin keeps prompt text separate from CLI flags and shell syntax.
      child.stdin.on("error", () => {});
      child.stdin.end(task.prompt);
      for (const stream of [child.stdout, child.stderr]) {
        const decoder = new StringDecoder("utf8");
        stream.on("data", (chunk) => append(decoder.write(chunk)));
        stream.on("end", () => {
          const last = decoder.end();
          if (last) append(last);
        });
      }
      child.on("error", (error) => {
        task.status = "failed";
        append(`\n${error.message}\n`);
      });
      child.on("close", (code) => {
        task.exitCode = code;
        task.status = code === 0 ? "completed" : "failed";
        broadcast(task);
      });
    } catch (error) {
      task.status = "failed";
      append(`\n${error.message}\n`);
    }
    res.status(201).json(snapshot(task));
  });
  app.get("/api/tasks/:id/events", (req, res) => {
    const task = tasks.get(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found." });
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.write(`data: ${JSON.stringify(snapshot(task))}\n\n`);
    if (terminal.has(task.status)) return res.end();
    task.clients.add(res);
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15000);
    res.on("close", () => {
      clearInterval(heartbeat);
      task.clients.delete(res);
    });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Unknown endpoint." }),
  );
  app.use((error, _req, res, _next) => {
    const status = ["ENOENT", "ENOTDIR"].includes(error.code)
      ? 404
      : error.code === "EACCES"
        ? 403
        : error.status || 500;
    res.status(status).json({ error: error.message });
  });
  return app;
}
