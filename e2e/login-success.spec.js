import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('Login correcto (entrada lenta)', async ({ page }) => {
  // Simular usuario lento en la UI
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(500);

  const userInput = page.locator('form.login-form input[type="text"]');
  const passInput = page.locator('form.login-form input[type="password"]');
  const submit = page.locator('form.login-form button[type="submit"]');

  // Escritura lenta
  await userInput.click();
  await page.type('form.login-form input[type="text"]', 'Victor Gomez', { delay: 200 });
  await page.waitForTimeout(700);
  await passInput.click();
  await page.type('form.login-form input[type="password"]', 'TODOLOPUEDO', { delay: 200 });
  await page.waitForTimeout(500);

  await submit.click();

  // Esperar que el login se procese (el componente usa setTimeout)
  await page.waitForTimeout(1000);

  const isAuth = await page.evaluate(() => localStorage.getItem('isAuthenticated'));
  expect(isAuth).toBe('true');
});
