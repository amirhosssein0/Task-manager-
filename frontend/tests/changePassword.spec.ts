import { test, Page } from '@playwright/test';
import { signup, logout, DEFAULT_PASSWORD } from './utils/auth';

const PASSWORD = DEFAULT_PASSWORD;
const NEW_PASSWORD = 'Test1234@';

test.describe.serial('Sign Up and Change Password @106', () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    const user = await signup(page, PASSWORD);
    email = user.email;
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('Change password and login with new password @106', async ({ page }) => {
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.getByRole('link', { name: 'Change Password' }).click();

    await page.getByRole('textbox', { name: 'Current Password' }).click();
    await page
      .getByRole('textbox', { name: 'Current Password' })
      .fill(PASSWORD);

    await page
      .getByRole('textbox', { name: 'New Password', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'New Password', exact: true })
      .fill(NEW_PASSWORD);

    await page
      .getByRole('textbox', { name: 'Confirm New Password' })
      .click();
    await page
      .getByRole('textbox', { name: 'Confirm New Password' })
      .fill(NEW_PASSWORD);

    page.once('dialog', (dialog) => {
      dialog.dismiss().catch(() => {});
    });

    await page.getByRole('button', { name: 'Change Password' }).click();


    await page.getByRole('textbox', { name: 'Username' }).click();
    await page.getByRole('textbox', { name: 'Username' }).fill(email);

    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(NEW_PASSWORD);

    await page.getByRole('button', { name: 'Sign In' }).click();

  });
});