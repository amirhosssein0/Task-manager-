import { Page, expect } from '@playwright/test';
import { generateTestEmail } from './email'; 

export async function signup(page: Page, password: string) {
  const email = generateTestEmail();
  await page.goto('/');
  await page.getByRole('link', { name: 'Sign Up' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  return { email, password };
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
}