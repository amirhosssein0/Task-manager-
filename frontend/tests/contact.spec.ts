import { test, expect } from '@playwright/test';
import { signup, logout, DEFAULT_PASSWORD } from './utils/auth';

test.beforeEach(async ({ page }) => {
  await signup(page, DEFAULT_PASSWORD);
  await logout(page); 
});

test.afterEach(async ({ page }) => {
  await logout(page);
});

test('Contact page shows sending then success notifications @102', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Contact' }).click();
  await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Name *' }).fill('Test User');
  await page.getByRole('textbox', { name: 'Email *' }).fill('test@example.com');
  await page.getByRole('textbox', { name: 'Subject *' }).fill('Testing');
  await page.getByRole('textbox', { name: 'Message *' }).fill('Message body');
  await page.getByRole('button', { name: 'Send Message' }).click();

  await page.waitForTimeout(3000);
});