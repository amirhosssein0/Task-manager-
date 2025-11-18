import { test, expect, Page } from '@playwright/test';

const PASSWORD = 'Test1234#'

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

test.describe.serial('Sign Up and Login @104', () => {

  let email: string;   // <-- ⭐ اینجا تعریف کن

  test('Signup', async ({ page, context }) => {
      const mailPage = page;
      email = await getFakeEmail(mailPage);   // <-- ⭐ اینجا مقدار بده

      const task = await context.newPage();
      await task.goto('http://localhost:3000');
      await task.getByRole('link', { name: 'Sign Up' }).click();
      await task.getByRole('textbox', { name: 'Username' }).fill(email);
      await task.getByRole('textbox', { name: 'Email' }).fill(email);
      await task.getByRole('textbox', { name: 'Password', exact: true }).fill(PASSWORD);
      await task.getByRole('textbox', { name: 'Confirm Password' }).fill(PASSWORD);
      await task.getByRole('button', { name: 'Sign Up' }).click();
      await task.waitForTimeout(5000);
      await task.getByRole('button', { name: 'Logout' }).click();
  });

  test('Login', async ({ page }) => {
    await page.goto('http://localhost:3000'); 
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Username' }).fill(email); 
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForTimeout(5000);
    await page.getByRole('button', { name: 'Logout' }).click();
  });

});