import { test, expect, Page } from '@playwright/test';


const NAME = 'Task Manager User'
const PASSWORD = 'Test1234#'
const CARD = {
  number: '4242424242424242',
  exp: '01/28',
  cvc: '123',
};

const missingCardField = Object.entries(CARD).find(([, value]) => !value);


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

test.describe.serial('Billing and subscription @105', () => {
  test.beforeAll(() => {
    test.skip(Boolean(missingCardField), `Missing test card env var: ${missingCardField?.[0]}`);
  });

  let email: string; 

  test('Signup', async ({ page, context }) => {
      const mailPage = page;
      email = await getFakeEmail(mailPage); 

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
    await page.waitForTimeout(2000);
    await page.getByRole('link', { name: 'Task Manager' }).click();
    await page.getByRole('button', { name: 'Subscribe Now' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('textbox', { name: '5678 1234 5678' }).click();
    await page.getByRole('textbox', { name: '5678 1234 5678' }).fill(CARD.number!);
    await page.getByRole('textbox', { name: 'MM/YY' }).click();
    await page.getByRole('textbox', { name: 'MM/YY' }).fill(CARD.exp!);
    await page.getByRole('textbox', { name: '123', exact: true }).click();
    await page.getByRole('textbox', { name: '123', exact: true }).fill(CARD.cvc!);
    await page.getByRole('textbox', { name: 'John Doe' }).click();
    await page.getByRole('textbox', { name: 'John Doe' }).fill(NAME);
    await page.getByRole('button', { name: 'Pay $' }).click();
    const checkoutOverlay = page.locator('div.fixed.inset-0');
    if (await checkoutOverlay.isVisible()) {
      await expect(checkoutOverlay).toBeHidden({ timeout: 10000 });
    }
    await page.getByRole('button', { name: 'Logout' }).click();

  });

});