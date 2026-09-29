import { test, expect } from '@playwright/test';

const containers = [
  { id: 'a13b72f864e9', name: 'api-service', image: 'node:22-alpine', status: 'Up 2 hours', state: 'running' },
  { id: 'b49e18c268d7', name: 'postgres-db', image: 'postgres:16', status: 'Up 2 hours', state: 'running' },
  { id: 'c69f42e713a0', name: 'redis-cache', image: 'redis:7-alpine', status: 'Exited (0) 1 day ago', state: 'exited' }
];

const task = { id: 'sample-task-001', prompt: 'Summarize the API routes in this project', status: 'completed', output: 'Found three API groups: files, Docker containers, and Codex tasks.\n', createdAt: '2026-09-29T09:00:00.000Z' };

async function mockApi(page) {
  await page.route('**/api/files?**', route => {
    const requested = new URL(route.request().url()).searchParams.get('path');
    const directory = requested === '/home' ? { path: '/home', parent: '/', entries: [{ name: 'agent', type: 'directory' }, { name: 'notes.txt', type: 'file' }] } : { path: '/', parent: null, entries: [{ name: 'apps', type: 'directory' }, { name: 'etc', type: 'directory' }, { name: 'home', type: 'directory' }, { name: 'var', type: 'directory' }, { name: 'boot.log', type: 'file' }] };
    return route.fulfill({ json: directory });
  });
  await page.route('**/api/docker/containers', route => route.fulfill({ json: { containers } }));
  await page.route('**/api/docker/containers/*/logs', route => route.fulfill({ json: { logs: '2026-09-29T09:10:00Z  Server listening on port 3000\n2026-09-29T09:10:01Z  Database connection established\n2026-09-29T09:10:02Z  Ready to accept requests\n' } }));
  await page.route('**/api/tasks', route => route.request().method() === 'POST' ? route.fulfill({ status: 201, json: { id: 'new-task-001', prompt: 'Check the project status', status: 'running', output: '', createdAt: '2026-09-29T09:20:00.000Z' } }) : route.fulfill({ json: { tasks: [task] } }));
  await page.route('**/api/tasks/new-task-001/events', route => route.fulfill({ headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }, body: `data: ${JSON.stringify({ id: 'new-task-001', prompt: 'Check the project status', status: 'completed', output: 'Project status is healthy.\n', createdAt: '2026-09-29T09:20:00.000Z' })}\n\n` }));
}

test.beforeEach(async ({ page }) => { await mockApi(page); await page.goto('/'); });

test('file browser navigates directories and matches its snapshot', async ({ page }) => {
  await expect(page.getByText('boot.log')).toBeVisible();
  await expect(page).toHaveScreenshot('file-browser.png', { fullPage: true });
  await page.getByRole('button', { name: 'home' }).click();
  await expect(page.getByText('notes.txt')).toBeVisible();
  await expect(page.getByText('/home', { exact: true })).toBeVisible();
});

test('docker browser selects containers, displays logs, and matches its snapshot', async ({ page }) => {
  await page.getByRole('button', { name: 'Docker Browser' }).click();
  await expect(page.getByText('Server listening on port 3000')).toBeVisible();
  await expect(page).toHaveScreenshot('docker-browser.png', { fullPage: true });
  await page.getByRole('button', { name: /postgres-db/ }).click();
  await expect(page.getByText('postgres-db', { exact: true }).last()).toBeVisible();
});

test('Codex dispatcher shows status and output and matches its snapshot', async ({ page }) => {
  await page.getByRole('button', { name: 'Codex Task Dispatcher' }).click();
  await expect(page.getByText('Found three API groups', { exact: false })).toBeVisible();
  await expect(page).toHaveScreenshot('codex-dispatcher.png', { fullPage: true });
  await page.getByLabel('YOUR PROMPT').fill('Check the project status');
  await page.getByRole('button', { name: 'Dispatch task' }).click();
  await expect(page.getByText('Project status is healthy.')).toBeVisible();
  await expect(page.getByText('completed', { exact: true }).first()).toBeVisible();
});
