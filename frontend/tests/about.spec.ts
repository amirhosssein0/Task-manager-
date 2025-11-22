import { test, expect } from '@playwright/test';

test('About page @101', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('heading', { name: 'About Task Manager' })).toBeVisible();  await page.getByRole('link', { name: 'Sign Up Now' }).click();
  await page.getByRole('link', { name: 'About' }).click();
  await page.getByRole('link', { name: 'Contact Us' }).click();
  await page.getByRole('link', { name: 'About' }).click();});
