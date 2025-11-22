import { Page, expect } from '@playwright/test';
import { generateTestEmail } from './email';

export const DEFAULT_PASSWORD = 'Test1234#';

export async function signup(page: Page, password: string = DEFAULT_PASSWORD) {
  const email = generateTestEmail();

  await page.goto('/');
  await page.getByRole('link', { name: 'Sign Up' }).click();

  await page.getByRole('textbox', { name: 'Username' }).fill(email);
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
  await page.getByRole('textbox', { name: 'Confirm Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign Up' }).click();

  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({
    timeout: 15000, 
  });

  return { email, password };
}

export async function login(page: Page, email: string, password: string = DEFAULT_PASSWORD) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({
    timeout: 5000,
  });
}

export async function logout(page: Page) {
  const logoutButton = page.getByRole('button', { name: 'Logout' });

  const visible = await logoutButton.isVisible().catch(() => false);
  if (visible) {
    await logoutButton.click();
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  }
}