import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('Login incorrecto (entrada lenta)', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(400);

  await page.type('form.login-form input[type="text"]', 'Usuario Incorrecto', { delay: 150 });
  await page.waitForTimeout(300);
  await page.type('form.login-form input[type="password"]', 'WRONGPASS', { delay: 150 });

  await page.click('form.login-form button[type="submit"]');
  await page.waitForTimeout(800);

  const errorVisible = await page.isVisible('.error-message');
  expect(errorVisible).toBe(true);
  const errorText = await page.locator('.error-message').innerText();
  expect(errorText.toLowerCase()).toContain('usuario');
});
