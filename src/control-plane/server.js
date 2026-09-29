import express from 'express';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const app = express();
const run = promisify(execFile);
const tasks = new Map();
const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '64kb' }));

function error(res, status, message) { res.status(status).json({ error: message }); }

app.get('/api/files', async (req, res) => {
  try {
    const requested = typeof req.query.path === 'string' ? req.query.path : process.cwd();
    const directory = await realpath(requested);
    if (!(await stat(directory)).isDirectory()) return error(res, 400, 'Path is not a directory');
    const children = await readdir(directory, { withFileTypes: true });
    const entries = await Promise.all(children.map(async entry => {
      const full = path.join(directory, entry.name);
      let type = entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other';
      if (entry.isSymbolicLink()) {
        try { type = (await stat(full)).isDirectory() ? 'directory' : 'file'; } catch { type = 'other'; }
      }
      return { name: entry.name, type, path: full };
    }));
    entries.sort((a, b) => (a.type === 'directory' ? 0 : 1) - (b.type === 'directory' ? 0 : 1) || a.name.localeCompare(b.name));
    res.json({ path: directory, parent: path.dirname(directory) === directory ? null : path.dirname(directory), entries });
  } catch (e) { error(res, e.code === 'ENOENT' ? 404 : 400, e.message); }
});

app.get('/api/docker/containers', async (_req, res) => {
  try {
    const { stdout } = await run('docker', ['ps', '-a', '--format', '{{json .}}'], { timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
    res.json({ containers: stdout.split('\n').filter(Boolean).map(line => {
      const c = JSON.parse(line);
      return { id: c.ID, name: c.Names, image: c.Image, status: c.Status, state: c.State };
    }) });
  } catch (e) { error(res, 503, e.stderr?.trim() || e.message); }
});

app.get('/api/docker/containers/:id/logs', async (req, res) => {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(req.params.id)) return error(res, 400, 'Invalid container ID');
  try {
    const { stdout, stderr } = await run('docker', ['logs', '--tail', '200', '--timestamps', req.params.id], { timeout: 10000, maxBuffer: 2 * 1024 * 1024 });
    res.json({ logs: stdout + stderr });
  } catch (e) { error(res, 503, e.stderr?.trim() || e.message); }
});

function publicTask(task) { return { id: task.id, prompt: task.prompt, cwd: task.cwd, status: task.status, output: task.output, exitCode: task.exitCode }; }
function publish(task) {
  const data = `data: ${JSON.stringify(publicTask(task))}\n\n`;
  for (const client of task.clients) client.write(data);
}
function addOutput(task, text) {
  task.output += text;
  if (task.output.length > 250000) task.output = task.output.slice(-250000);
  publish(task);
}
function parseLine(task, line) {
  try {
    const event = JSON.parse(line);
    if (event.type === 'item.completed' && event.item?.text) addOutput(task, event.item.text + '\n');
    else if (event.type === 'item.delta' && event.delta?.text) addOutput(task, event.delta.text);
    else if (event.type === 'error') addOutput(task, `Error: ${event.message || line}\n`);
    else if (event.type === 'turn.failed') addOutput(task, `Task failed: ${event.error?.message || 'unknown error'}\n`);
  } catch { addOutput(task, line + '\n'); }
}

app.get('/api/tasks', (_req, res) => res.json({ tasks: [...tasks.values()].reverse().map(publicTask) }));
app.post('/api/tasks', async (req, res) => {
  const { prompt, cwd } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 20000 || typeof cwd !== 'string' || !path.isAbsolute(cwd)) return error(res, 400, 'A prompt and absolute working directory are required');
  let directory;
  try {
    directory = await realpath(cwd);
    if (!(await stat(directory)).isDirectory()) return error(res, 400, 'Working directory must be a directory');
  } catch (e) { return error(res, 400, e.message); }
  const task = { id: randomUUID(), prompt: prompt.trim(), cwd: directory, status: 'running', output: '', exitCode: null, clients: new Set() };
  tasks.set(task.id, task);
  res.status(201).json(publicTask(task));
  const child = spawn('codex', ['exec', '--json', '--sandbox', 'workspace-write', '--skip-git-repo-check', '-C', directory, task.prompt], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
  let pending = '';
  child.stdout.on('data', chunk => {
    pending += chunk.toString();
    const lines = pending.split('\n'); pending = lines.pop();
    for (const line of lines) if (line) parseLine(task, line);
  });
  child.stderr.on('data', chunk => addOutput(task, chunk.toString()));
  child.on('error', e => { task.status = 'failed'; addOutput(task, e.message + '\n'); });
  child.on('close', code => {
    if (pending) parseLine(task, pending);
    task.exitCode = code;
    task.status = code === 0 ? 'completed' : 'failed';
    publish(task);
    for (const client of task.clients) client.end();
    task.clients.clear();
  });
});
app.get('/api/tasks/:id/events', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return error(res, 404, 'Task not found');
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify(publicTask(task))}\n\n`);
  if (task.status !== 'running') return res.end();
  task.clients.add(res);
  req.on('close', () => task.clients.delete(res));
});

app.use(express.static(path.join(here, 'dist')));
app.get(/.*/, (_req, res) => res.sendFile(path.join(here, 'dist', 'index.html')));
app.listen(port, '127.0.0.1', () => console.log(`Control Plane listening on http://localhost:${port}`));
