import express from 'express';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import readline from 'node:readline';

const app = express();
const tasks = new Map();
const MAX_OUTPUT = 100_000;
const WORKDIR = process.env.CODEX_WORKDIR || process.cwd();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

function run(command, args, mergeStderr = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { timeout: 10000 });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(mergeStderr ? stdout + stderr : stdout) : reject(new Error(stderr.trim() || `${command} exited with code ${code}`)));
  });
}

function fail(res, error) {
  res.status(500).json({ error: error.message || 'Request failed' });
}

app.get('/api/files', async (req, res) => {
  const requested = typeof req.query.path === 'string' ? req.query.path : '/';
  if (!path.isAbsolute(requested)) return res.status(400).json({ error: 'An absolute path is required' });
  const directory = path.resolve(requested);
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    res.json({ path: directory, parent: directory === path.parse(directory).root ? null : path.dirname(directory), entries: entries.map(entry => ({ name: entry.name, type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file' })).sort((a, b) => (a.type === 'directory' ? 0 : 1) - (b.type === 'directory' ? 0 : 1) || a.name.localeCompare(b.name)) });
  } catch (error) { fail(res, error); }
});

app.get('/api/docker/containers', async (_req, res) => {
  try {
    const output = await run('docker', ['ps', '-a', '--format', '{{json .}}']);
    res.json({ containers: output.split('\n').filter(Boolean).map(line => JSON.parse(line)).map(row => ({ id: row.ID, name: row.Names, image: row.Image, status: row.Status, state: row.State })) });
  } catch (error) { fail(res, error); }
});

app.get('/api/docker/containers/:id/logs', async (req, res) => {
  if (!/^[a-zA-Z0-9_.-]+$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid container ID' });
  try { res.json({ logs: await run('docker', ['logs', '--tail', '200', '--timestamps', req.params.id], true) }); }
  catch (error) { fail(res, error); }
});

function publicTask(task) {
  return { id: task.id, prompt: task.prompt, status: task.status, output: task.output, createdAt: task.createdAt };
}

function update(task, changes) {
  Object.assign(task, changes);
  if (task.output.length > MAX_OUTPUT) task.output = task.output.slice(-MAX_OUTPUT);
  const data = `data: ${JSON.stringify(publicTask(task))}\n\n`;
  for (const client of task.clients) client.write(data);
}

app.get('/api/tasks', (_req, res) => res.json({ tasks: [...tasks.values()].map(publicTask).reverse() }));

app.post('/api/tasks', (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt || prompt.length > 10000) return res.status(400).json({ error: 'Prompt must contain 1–10,000 characters' });
  const task = { id: randomUUID(), prompt, status: 'running', output: '', createdAt: new Date().toISOString(), clients: new Set() };
  tasks.set(task.id, task);
  res.status(201).json(publicTask(task));

  const child = spawn('codex', ['exec', '--json', '--skip-git-repo-check', '-C', WORKDIR, '-'], { cwd: WORKDIR, env: process.env });
  child.stdin.end(prompt);
  const lines = readline.createInterface({ input: child.stdout });
  lines.on('line', line => {
    try {
      const event = JSON.parse(line);
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') update(task, { output: task.output + event.item.text + '\n\n' });
      else if (event.type === 'error') update(task, { output: task.output + (event.message || 'Codex error') + '\n' });
    } catch { update(task, { output: task.output + line + '\n' }); }
  });
  child.stderr.on('data', chunk => update(task, { output: task.output + chunk.toString() }));
  child.on('error', error => update(task, { status: 'failed', output: task.output + error.message + '\n' }));
  child.on('close', code => update(task, { status: code === 0 ? 'completed' : 'failed', output: task.output || (code === 0 ? 'Task completed.\n' : `Codex exited with code ${code}.\n`) }));
});

app.get('/api/tasks/:id/events', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  task.clients.add(res);
  res.write(`data: ${JSON.stringify(publicTask(task))}\n\n`);
  req.on('close', () => task.clients.delete(res));
});

app.listen(3000, '127.0.0.1', () => console.log('Control Plane API: http://127.0.0.1:3000'));
