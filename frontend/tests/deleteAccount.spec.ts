import { test } from '@playwright/test';
import { signup, logout, DEFAULT_PASSWORD } from './utils/auth';

test.beforeEach(async ({ page }) => {
  await signup(page, DEFAULT_PASSWORD);
});

test.afterEach(async ({ page }) => {
  await logout(page);
});

test('Delete account @108', async ({ page }) => {
  await page.getByRole('link', { name: 'Profile' }).click();

  page.once('dialog', async dialog => {
    await dialog.accept();
  });

  await page.getByRole('button', { name: 'Delete Account' }).click();

});