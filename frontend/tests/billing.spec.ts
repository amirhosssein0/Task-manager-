import { test, expect } from '@playwright/test';
import { signup, logout, DEFAULT_PASSWORD } from './utils/auth';

const NAME = 'Task Manager User';
const CARD = {
  number: '4242424242424242',
  exp: '01/28',
  cvc: '123',
};

test.beforeEach(async ({ page }) => {
  await signup(page, DEFAULT_PASSWORD);
});

test.afterEach(async ({ page }) => {
  await logout(page);
});

test('Billing and subscription @105', async ({ page }) => {
  await page.getByRole('link', { name: 'Task Manager' }).click();
  await page.getByRole('button', { name: 'Subscribe Now' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('textbox', { name: '5678 1234 5678' }).click();
  await page.getByRole('textbox', { name: '5678 1234 5678' }).fill(CARD.number);
  await page.getByRole('textbox', { name: 'MM/YY' }).click();
  await page.getByRole('textbox', { name: 'MM/YY' }).fill(CARD.exp);
  await page.getByRole('textbox', { name: '123', exact: true }).click();
  await page.getByRole('textbox', { name: '123', exact: true }).fill(CARD.cvc);
  await page.getByRole('textbox', { name: 'John Doe' }).click();
  await page.getByRole('textbox', { name: 'John Doe' }).fill(NAME);

  await page.getByRole('button', { name: 'Pay $' }).click();

  const checkoutOverlay = page.locator('div.fixed.inset-0');
  if (await checkoutOverlay.isVisible().catch(() => false)) {
    await expect(checkoutOverlay).toBeHidden({ timeout: 10000 });
  }
});