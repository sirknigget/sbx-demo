import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test('shows the designed page and logs a message through Docker', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Agentic Engineering.' })).toBeVisible();
  await expect(page.locator('.period')).toHaveCSS('color', 'rgb(255, 120, 104)');
  await expect(page.getByRole('textbox')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Send to Docker log/ })).toHaveCount(1);

  await expect(page).toHaveScreenshot('agentic-engineering-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.01,
  });

  const message = `Playwright message ${Date.now()}`;
  await page.getByRole('textbox').fill(message);
  await page.getByRole('button', { name: /Send to Docker log/ }).click();
  await expect(page.getByRole('status')).toHaveText('Sent. Check the Docker backend log.');
  await expect(page.getByRole('textbox')).toHaveValue('');
  await expect.poll(() => execFileSync('docker', ['compose', 'logs', 'backend'], { encoding: 'utf8' })).toContain(message);
});
