import { expect, test } from '@playwright/test';

test('renders the colorful hello world screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();
  await expect(page.getByLabel('Colorful Hello World app')).toHaveScreenshot('hello-world.png');
});
