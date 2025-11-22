import { test } from '@playwright/test';
import { signup, login, logout, DEFAULT_PASSWORD } from './utils/auth';

let email: string;

test.beforeEach(async ({ page }) => {
  const user = await signup(page, DEFAULT_PASSWORD);
  email = user.email;
  await logout(page);
});

test.afterEach(async ({ page }) => {
  await logout(page);
});

test('Login @104', async ({ page }) => {
  await login(page, email, DEFAULT_PASSWORD);
});