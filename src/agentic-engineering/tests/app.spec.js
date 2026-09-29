import { expect, test } from '@playwright/test';

test('shows the page and sends a thought to the Docker backend', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  await expect(page.getByRole('heading', { name: 'AGENTIC ENGINEERING.' })).toBeVisible();
  await expect(page.getByText('STOP WITH')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Send to Docker log' })).toHaveCount(1);
  await expect(page).toHaveScreenshot('agentic-engineering-desktop.png', { animations: 'disabled', fullPage: true });

  await page.getByRole('textbox').fill('Playwright Docker log check');
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/log') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Send to Docker log' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  await expect(page.getByRole('status')).toHaveText('Sent to Docker log.');
  await expect(page.getByRole('textbox')).toBeEmpty();
});
