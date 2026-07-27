import { expect, test } from '@playwright/test';

test('renders the colorful hello world app', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();
  await expect(page).toHaveScreenshot('hello-world.png', {
    fullPage: true,
    animations: 'disabled'
  });
});
