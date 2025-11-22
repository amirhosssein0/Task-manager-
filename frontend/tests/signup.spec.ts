import { test, expect } from '@playwright/test';
import { signup, logout, DEFAULT_PASSWORD } from './utils/auth';

test.beforeEach(async ({ page }) => {
  await signup(page, DEFAULT_PASSWORD);
  await logout(page);
});

test.afterEach(async ({ page }) => {
  await logout(page);
});

test('Signup @103', async ({ page }) => {
  const { email } = await signup(page, DEFAULT_PASSWORD);

  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();

});