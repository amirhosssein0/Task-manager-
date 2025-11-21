import { test, expect } from '@playwright/test';

test('Check night mode @110', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
});
