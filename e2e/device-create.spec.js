import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('Crear dispositivo (flujo lento)', async ({ page }) => {
  // Simular sesión iniciada
  await page.addInitScript(() => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('username', 'Victor Gomez');
  });

  await page.goto(BASE);
  await page.waitForTimeout(500);

  // Navegar a Dispositivos
  await page.click('button:has-text("Dispositivos")');
  await page.waitForTimeout(500);

  // Abrir modal de coordenadas
  await page.click('button:has-text("Ingresar Coordenadas")');
  await page.waitForTimeout(400);

  // Ingresar coordenadas manuales
  await page.fill('input[placeholder="Ej: 19.432608"]', '20.689600');
  await page.fill('input[placeholder="Ej: -99.133209"]', '-88.201400');
  await page.click('button:has-text("📍 Usar estas coordenadas")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("✅ Confirmar Ubicación")');
  await page.waitForTimeout(400);

  // Rellenar datos del chip
  const chipNumber = `CHIP_TEST_E2E_${Date.now()}`;
  await page.fill('input[placeholder^="Ej: CHIP"]', chipNumber);
  await page.fill('input[placeholder^="Ej: Subestaci"]', 'Subestación E2E');

  // Capturar dialog alert
  page.once('dialog', async dialog => {
    await dialog.accept();
  });

  // Enviar formulario
  await page.click('button:has-text("Registrar Chip")');
  await page.waitForTimeout(800);

  // Verificar que la tarjeta del chip aparezca
  const card = page.locator(`text=${chipNumber}`);
  await expect(card).toBeVisible({ timeout: 3000 });
});
