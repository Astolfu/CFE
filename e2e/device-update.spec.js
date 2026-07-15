import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('Editar dispositivo (flujo lento)', async ({ page, request }) => {
  // Crear dispositivo directo en backend para tener un objetivo
  const chipNumber = `CHIP_UPDATE_E2E_${Date.now()}`;
  const createResp = await request.post('http://localhost:3001/api/devices', {
    data: {
      chipNumber,
      subestacion: 'Subestacion Original',
      georeferencia: '20.689600, -88.201400'
    }
  });
  const createJson = await createResp.json();
  const deviceId = createJson.device.id;

  // Iniciar sesión y abrir app
  await page.addInitScript(() => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('username', 'Victor Gomez');
  });

  await page.goto(BASE);
  await page.waitForTimeout(400);
  await page.click('button:has-text("Dispositivos")');
  await page.waitForTimeout(500);

  // Localizar la tarjeta por número de chip y presionar editar
  const card = page.locator(`text=${chipNumber}`).first();
  await expect(card).toBeVisible({ timeout: 3000 });
  // Dentro de la tarjeta, buscar el botón de editar (✏️)
  const editBtn = card.locator('button[title="Editar chip"]');
  await editBtn.click();
  await page.waitForTimeout(300);

  // Modificar subestación lentamente
  const subInput = page.locator('input[placeholder^="Ej: Subestaci"]');
  await subInput.fill('Subestación E2E Modificada');
  await page.waitForTimeout(300);

  // Capturar alert
  page.once('dialog', async d => { await d.accept(); });

  // Guardar cambios
  await page.click('button:has-text("Guardar Cambios")');
  await page.waitForTimeout(800);

  // Verificar que el texto de la tarjeta se actualizó
  const updatedSub = card.locator('text=Subestación E2E Modificada');
  await expect(updatedSub).toBeVisible({ timeout: 3000 });
});
