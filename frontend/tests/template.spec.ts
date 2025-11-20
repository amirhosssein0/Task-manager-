import { test, Page, expect } from '@playwright/test';

const PASSWORD = 'Test1234#';

async function getFakeEmail(page: Page): Promise<string> {
  await page.goto('https://www.fakemailgenerator.com', { waitUntil: 'domcontentloaded' });
  await page.locator('#domain-select').click();

  const domain = (await page.locator('#domain-select').textContent())?.trim();
  if (domain !== '@gustr.com') {
    await page.locator('li >> text=@gustr.com').click();
  }

  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /^copy$/i }).click();
  await page.waitForTimeout(500);

  const email = await page.evaluate(() => navigator.clipboard.readText());
  return email;
}

test.describe.serial('Sign Up and Create Template @109', () => {
  let email: string;

  test('Signup', async ({ page, context }) => {
    const mailPage = page;
    email = await getFakeEmail(mailPage);

    const app = await context.newPage();
    await app.goto('http://localhost:3000');
    await app.getByRole('link', { name: 'Sign Up' }).click();
    await app.getByRole('textbox', { name: 'Username' }).fill(email);
    await app.getByRole('textbox', { name: 'Email' }).fill(email);
    await app.getByRole('textbox', { name: 'Password', exact: true }).fill(PASSWORD);
    await app.getByRole('textbox', { name: 'Confirm Password' }).fill(PASSWORD);
    await app.getByRole('button', { name: 'Sign Up' }).click();

    await app.waitForTimeout(3000);

    // Logout از نوار بالا
    await app.getByRole('navigation').getByRole('button', { name: 'Logout' }).click();
  });

  test('Create Template', async ({ page }) => {
    // --- Login ---
    await page.goto('http://localhost:3000');
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Username' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForTimeout(3000);

    // --- Templates و ساخت Template ---
    await page.goto('http://localhost:3000/dashboard');
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

    // --- Use Template برای ساخت Task ---
    await page.getByRole('link', { name: 'Tasks', exact: true }).click();
    await page.getByRole('link', { name: '📋 Use Template' }).click();

    page.once('dialog', dialog => {
      dialog.accept().catch(() => {});
    });
    await page.getByRole('button', { name: 'Use Template' }).click();

    // نمایش همه‌ی تسک‌ها
    await page.getByRole('checkbox', { name: 'Show All Tasks' }).check();

    // --- پیدا کردن کارت Mask ---
    const maskCard = page.locator('.relative:has-text("Mask")').first();
    await expect(maskCard).toBeVisible();

    // --- ادیت Task داخل همان کارت ---
    await maskCard.getByRole('button', { name: 'Edit' }).click();
    await page.locator('textarea').fill('Add Task Description');
    await page.getByRole('button', { name: 'Update Task' }).click();

    // --- حذف Task (دیالوگ) ---
    page.once('dialog', dialog => {
      dialog.accept().catch(() => {});
    });
    await maskCard.getByRole('button', { name: 'Delete' }).click();

    await page.waitForTimeout(3000);

// Logout از نوار بالا
    await page.getByRole('navigation').getByRole('button', { name: 'Logout' }).click();
  });
});