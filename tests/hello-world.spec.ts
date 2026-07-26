import { expect, test } from '@playwright/test';

test('renders the colorful Hello World app', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();
  await expect(page.locator('main')).toHaveScreenshot('hello-world.png');
});
