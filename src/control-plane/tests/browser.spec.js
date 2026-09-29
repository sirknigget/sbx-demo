import { test, expect } from '@playwright/test';

test('file browser, Docker browser, and task dispatcher match snapshots', async ({ page }) => {
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.route('**/api/files**', route => route.fulfill({ json: {
    path: '/workspace/project', parent: '/workspace', entries: [
      { name: 'client', type: 'directory', path: '/workspace/project/client' },
      { name: 'server', type: 'directory', path: '/workspace/project/server' },
      { name: 'package.json', type: 'file', path: '/workspace/project/package.json' },
      { name: 'vite.config.js', type: 'file', path: '/workspace/project/vite.config.js' },
    ],
  } }));
  await page.route('**/api/docker/containers', route => route.fulfill({ json: { containers: [
    { id: 'a1b2c3d4e5f6', name: 'web-api', image: 'node:22-alpine', status: 'Up 2 hours', state: 'running' },
    { id: 'f6e5d4c3b2a1', name: 'database', image: 'postgres:16', status: 'Exited (0)', state: 'exited' },
  ] } }));
  await page.route('**/api/docker/containers/*/logs', route => route.fulfill({ json: { logs: '2026-09-29T10:00:00Z Server listening on port 3000\n2026-09-29T10:00:01Z Connected to database\n2026-09-29T10:00:02Z GET /health 200\n' } }));
  const task = { id: 'sample-task', prompt: 'Summarize this project', cwd: '/workspace/project', status: 'completed', exitCode: 0, output: 'Found a React frontend and an Express API.\nThe project includes a browser test suite.\n' };
  await page.route('**/api/tasks', route => route.fulfill({ json: { tasks: [task] } }));
  await page.route('**/api/tasks/*/events', route => route.fulfill({ status: 200, contentType: 'text/event-stream', body: `data: ${JSON.stringify(task)}\n\n` }));

  await page.goto('/');
  await expect(page.getByText('package.json')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('file-browser.png', { animations: 'disabled' });

  await page.getByRole('button', { name: /Docker Browser/ }).click();
  await expect(page.getByText('web-api')).toBeVisible();
  await page.getByRole('button', { name: /web-api/ }).click();
  await expect(page.getByLabel('Container logs')).toContainText('Connected to database');
  await expect(page).toHaveScreenshot('docker-browser.png', { animations: 'disabled' });

  await page.getByRole('button', { name: /Codex Task Dispatcher/ }).click();
  await expect(page.getByLabel('Task output')).toContainText('Found a React frontend');
  await expect(page).toHaveScreenshot('task-dispatcher.png', { animations: 'disabled' });
});
