import { test, expect } from '@playwright/test';
import { signup, logout, DEFAULT_PASSWORD } from './utils/auth';

test.beforeEach(async ({ page }) => {
  await signup(page, DEFAULT_PASSWORD);
});

test.afterEach(async ({ page }) => {
  await logout(page);
});

test('Sign Up and Create Template and Tasks @109', async ({ page }) => {
  await page.goto('/dashboard');

  await page.getByRole('link', { name: 'Templates' }).click();
  await page.getByRole('button', { name: '+ Create New Template' }).click();

  await page.getByRole('textbox', { name: 'e.g., Morning Skin Care' }).fill('Morning Skin Care');
  await page.locator('textarea').fill('Test Template Description');
  await page.getByRole('textbox', { name: 'e.g., Personal, Work' }).fill('Personal');

  await page.getByRole('button', { name: '+ Add Item' }).click();
  await page.getByRole('textbox', { name: 'Task title' }).fill('Mask');
  await page.getByRole('textbox', { name: 'Category' }).fill('FACE');
  await page.getByPlaceholder('Days offset').fill('01');
  await page.getByRole('button', { name: 'Green' }).click();
  await page.getByRole('button', { name: 'Create Template' }).click();

  await page.getByRole('link', { name: 'Tasks', exact: true }).click();
  await page.getByRole('link', { name: '📋 Use Template' }).click();

  page.once('dialog', dialog => {
    dialog.accept().catch(() => {});
  });
  await page.getByRole('button', { name: 'Use Template' }).click();

  await page.getByRole('checkbox', { name: 'Show All Tasks' }).check();

  const maskCard = page.locator('.relative:has-text("Mask")').first();
  await expect(maskCard).toBeVisible();

  await maskCard.getByRole('button', { name: 'Edit' }).click();
  await page.locator('textarea').fill('Add Task Description');
  await page.getByRole('checkbox', { name: 'Make this a recurring task' }).check();
  await page.getByRole('textbox').nth(5).fill('2027-01-01');
  await page.getByRole('button', { name: 'Update Task' }).click();

  await page.getByRole('button', { name: 'FACE' }).click();
  await page.getByRole('button', { name: 'Clear All Filters' }).click();
  await page.getByText('Green').click();
  await page.getByRole('button', { name: 'Clear All Filters' }).click();
  await page.getByRole('checkbox').nth(2).click();

  await page.getByRole('link', { name: 'Dashboard' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF Report' }).click();
  const download = await downloadPromise;
  console.log(await download.path());
});