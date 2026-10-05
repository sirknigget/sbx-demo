import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test('desktop layout and submission reach the real Docker console', async ({ page, request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBeTruthy();
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle('Agentic Engineering — Stop with the slop.');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AgenticEngineering.');
  await expect(page.getByText('Stop with the slop.')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(1);
  await expect(page.getByRole('button')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Send to Docker log' })).toBeVisible();
  await expect(page).toHaveScreenshot('desktop.png', { fullPage: true });

  const message = 'Intent over slop. Verified by Playwright.';
  // Compare log lines before and after so an earlier successful run cannot satisfy this assertion.
  const logs = () => execFileSync('docker', ['logs', 'agentic-engineering'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const occurrences = () => logs().split('\n').filter(line => line === message).length;
  const before = occurrences();
  await page.getByRole('textbox', { name: 'YOUR MESSAGE' }).fill(message);
  await page.getByRole('button', { name: 'Send to Docker log' }).click();
  await expect(page.getByRole('status')).toHaveText('Sent. Your words are in the Docker log.');
  await expect(page.getByRole('textbox')).toHaveValue('');
  await expect.poll(occurrences).toBe(before + 1);
});

test('mobile layout fits the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(page).toHaveScreenshot('mobile.png', { fullPage: true });
});

test('backend rejects empty and malformed messages', async ({ request }) => {
  for (const data of [{ text: ' ' }, { text: 5 }, { text: 'a'.repeat(2001) }]) {
    expect((await request.post('/api/log', { data })).status()).toBe(400);
  }
  expect((await request.post('/api/log', { data: '{', headers: { 'Content-Type': 'application/json' } })).status()).toBe(400);
});

test('a failed send keeps the message and allows a retry', async ({ page }) => {
  await page.goto('/');
  await page.route('**/api/log', route => route.fulfill({ status: 503, body: '{}' }));
  await page.getByRole('textbox').fill('Keep this thought.');
  await page.getByRole('button').click();
  await expect(page.getByRole('status')).toHaveText('Couldn’t send. Give it another try.');
  await expect(page.getByRole('textbox')).toHaveValue('Keep this thought.');
  await expect(page.getByRole('button')).toBeEnabled();
});
