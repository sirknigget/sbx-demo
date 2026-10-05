import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { request } from "node:http";
import { createApp } from "./app.js";

async function setup(t, options = {}) {
  const cwd = await mkdtemp(join(tmpdir(), "control-plane-"));
  await mkdir(join(cwd, "folder"));
  await writeFile(join(cwd, "example.txt"), "hello");
  const server = createApp({ cwd, ...options }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(cwd, { recursive: true, force: true });
  });
  return { cwd, base: `http://127.0.0.1:${server.address().port}` };
}
const post = (base, body, headers = {}) =>
  fetch(`${base}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

test("filesystem endpoint returns sorted metadata without file contents", async (t) => {
  const { base, cwd } = await setup(t);
  const data = await (await fetch(`${base}/api/files`)).json();
  assert.equal(data.path, cwd);
  assert.deepEqual(
    data.entries.map((entry) => [entry.name, entry.type]),
    [
      ["folder", "directory"],
      ["example.txt", "file"],
    ],
  );
  assert.equal(data.entries[1].size, 5);
  assert.equal("content" in data.entries[1], false);
  assert.equal(
    (
      await fetch(
        `${base}/api/files?path=${encodeURIComponent(join(cwd, "example.txt"))}`,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await fetch(
        `${base}/api/files?path=${encodeURIComponent(join(cwd, "missing"))}`,
      )
    ).status,
    404,
  );
  assert.equal((await fetch(`${base}/api/files/example.txt`)).status, 404);
});

test("Docker invocation uses fixed arguments and rejects option injection", async (t) => {
  const calls = [];
  const run = async (...args) => {
    calls.push(args);
    return args[1][0] === "ps"
      ? {
          stdout: JSON.stringify({
            ID: "a".repeat(64),
            Names: "api",
            Image: "node:22",
            State: "running",
            Status: "Up 1 hour",
            Ports: "3000/tcp",
          }),
          stderr: "",
        }
      : { stdout: "out\n", stderr: "err\n" };
  };
  const { base } = await setup(t, { run });
  const data = await (await fetch(`${base}/api/containers`)).json();
  assert.equal(data.containers[0].name, "api");
  const logs = await (
    await fetch(`${base}/api/containers/${"a".repeat(64)}/logs`)
  ).json();
  assert.equal(logs.output, "out\nerr\n");
  assert.deepEqual(calls[1][1], [
    "logs",
    "--timestamps",
    "--tail",
    "300",
    "a".repeat(64),
  ]);
  assert.equal((await fetch(`${base}/api/containers/--help/logs`)).status, 400);
  assert.equal(calls.length, 2);
});

test("task dispatch passes unrestricted flags, stdin prompt, and streams/replays output", async (t) => {
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  });
  let invocation;
  let input = "";
  child.stdin.on("data", (chunk) => {
    input += chunk;
  });
  const { base, cwd } = await setup(t, {
    launch: (...args) => {
      invocation = args;
      return child;
    },
  });
  const prompt = "--help; $(touch /tmp/not-a-command)";
  const response = await post(base, { cwd, prompt });
  assert.equal(response.status, 201);
  const task = await response.json();
  assert.equal(task.status, "running");
  assert.equal(input, prompt);
  assert.deepEqual(invocation, [
    "codex",
    [
      "exec",
      "--dangerously-bypass-approvals-and-sandbox",
      "--skip-git-repo-check",
      "--color",
      "never",
      "--cd",
      cwd,
      "-",
    ],
    { cwd, stdio: ["pipe", "pipe", "pipe"], shell: false },
  ]);
  const stream = await fetch(`${base}/api/tasks/${task.id}/events`);
  const reader = stream.body.getReader();
  const decoder = new TextDecoder();
  assert.match(
    decoder.decode((await reader.read()).value),
    /"status":"running"/,
  );
  child.stdout.write("First output\n");
  assert.match(decoder.decode((await reader.read()).value), /First output/);
  child.stderr.write("Diagnostic\n");
  child.emit("close", 0);
  let remaining = "";
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    remaining += decoder.decode(next.value);
  }
  assert.match(remaining, /"status":"completed"/);
  const replay = await (
    await fetch(`${base}/api/tasks/${task.id}/events`)
  ).text();
  assert.match(replay, /First output\\nDiagnostic\\n/);
  assert.match(replay, /"exitCode":0/);
  const history = await (await fetch(`${base}/api/tasks`)).json();
  assert.equal(history.tasks[0].status, "completed");
});

test("invalid inputs and cross-site requests do not launch a task", async (t) => {
  let launches = 0;
  const { base, cwd } = await setup(t, {
    launch: () => {
      launches++;
    },
  });
  assert.equal((await post(base, { cwd, prompt: "" })).status, 400);
  assert.equal((await post(base, { cwd: 12, prompt: "hello" })).status, 400);
  assert.equal(
    (await post(base, { cwd: join(cwd, "example.txt"), prompt: "hello" }))
      .status,
    400,
  );
  assert.equal(
    (await post(base, { cwd: join(cwd, "missing"), prompt: "hello" })).status,
    404,
  );
  assert.equal(
    (
      await post(
        base,
        { cwd, prompt: "hello" },
        { Origin: "https://external.example" },
      )
    ).status,
    403,
  );
  const hostStatus = await new Promise((resolve, reject) => {
    request(
      `${base}/api/info`,
      { headers: { Host: "external.example" } },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    )
      .on("error", reject)
      .end();
  });
  assert.equal(hostStatus, 403);
  assert.equal(
    (
      await fetch(`${base}/api/info`, {
        headers: { "Sec-Fetch-Site": "cross-site" },
      })
    ).status,
    403,
  );
  assert.equal((await fetch(`${base}/api/tasks/missing/events`)).status, 404);
  assert.equal(launches, 0);
});

test("missing Codex executable reports failure and exit status", async (t) => {
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  });
  const { base, cwd } = await setup(t, { launch: () => child });
  const task = await (
    await post(base, { cwd, prompt: "Inspect the project" })
  ).json();
  child.emit("error", new Error("spawn codex ENOENT"));
  child.emit("close", -2);
  const history = await (await fetch(`${base}/api/tasks`)).json();
  assert.equal(history.tasks[0].id, task.id);
  assert.equal(history.tasks[0].status, "failed");
  assert.equal(history.tasks[0].exitCode, -2);
  assert.match(history.tasks[0].output, /spawn codex ENOENT/);
});
