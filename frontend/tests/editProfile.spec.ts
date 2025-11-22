import { test } from '@playwright/test';
import path from 'path';
import { signup, logout, DEFAULT_PASSWORD } from './utils/auth';

const FIRSTNAME = 'Task';
const LASTNAME = 'Tester';
const PROFILE_PATH = path.resolve(__dirname, '../profile.webp');

test.beforeEach(async ({ page }) => {
  await signup(page, DEFAULT_PASSWORD);
});

test.afterEach(async ({ page }) => {
  await logout(page);
});

test('Edit profile @107', async ({ page }) => {
  await page.getByRole('link', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Edit Profile' }).click();

  await page.getByRole('textbox').first().click();
  await page.getByRole('textbox').first().fill(FIRSTNAME);
  await page.getByRole('textbox').nth(1).click();
  await page.getByRole('textbox').nth(1).fill(LASTNAME);

  page.once('dialog', dialog => {
    dialog.dismiss().catch(() => {});
  });

  await page.getByRole('button', { name: 'Save' }).click();

  await page.getByText('📷').click();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(PROFILE_PATH);

});