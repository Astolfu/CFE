import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const LOGIN_USER = 'Victor Gomez';
const LOGIN_PASS = 'TODOLOPUEDO';

// Helper de login
async function doLogin(page) {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const isAlreadyAuth = await page.evaluate(() => localStorage.getItem('isAuthenticated') === 'true');
    if (isAlreadyAuth) return;

    await page.locator('input[placeholder="Ingresa tu usuario"]').fill(LOGIN_USER);
    await page.locator('input[type="password"]').fill(LOGIN_PASS);
    await page.locator('button.btn-login').click();
    await page.waitForSelector('.login-page', { state: 'hidden', timeout: 10000 });
}

test.describe('Pruebas Funcionales — Gestión de Dispositivos (CRUD)', () => {

    test.beforeEach(async ({ page }) => {
        // Asegurar que estamos logueados
        await doLogin(page);
        
        // Navegar a la pestaña de Dispositivos
        const navButton = page.locator('nav.navbar button').filter({ hasText: 'Dispositivos' });
        await navButton.click();
        
        // Esperar a que cargue la página de dispositivos
        await expect(page.locator('.devices-page')).toBeVisible({ timeout: 10000 });
    });

    // 1. Crear Dispositivo (Registrar Chip)
    test('Debería registrar un nuevo chip ESP32 con coordenadas manuales', async ({ page }) => {
        const uniqueChipNumber = `CHIP_E2E_${Date.now().toString().slice(-4)}`;

        // Escuchar el diálogo alert de éxito al registrar
        page.once('dialog', async dialog => {
            expect(dialog.message()).toContain('Dispositivo agregado correctamente');
            await dialog.accept();
        });

        // Abrir el selector de ubicación
        await page.locator('button', { hasText: 'Ingresar Coordenadas' }).click();
        await expect(page.locator('.map-modal')).toBeVisible();

        // Ingresar coordenadas manuales
        await page.locator('input[placeholder="Ej: 19.432608"]').fill('20.689600');
        await page.locator('input[placeholder="Ej: -99.133209"]').fill('-88.201400');
        
        // Hacer clic en usar coordenadas y confirmar ubicación
        await page.locator('button', { hasText: 'Usar estas coordenadas' }).click();
        await page.locator('button', { hasText: 'Confirmar Ubicación' }).click();

        // Verificar que el modal se cierra y las coordenadas se muestran en el formulario
        await expect(page.locator('.map-modal')).toHaveCount(0);
        await expect(page.locator('.location-coords')).toContainText('20.689600, -88.201400');

        // Rellenar resto del formulario
        await page.locator('input[placeholder="Ej: CHIP001, 123456789"]').fill(uniqueChipNumber);
        await page.locator('input[placeholder="Ej: Subestación Norte, Centro, Sur"]').fill('Subestación E2E Pruebas');

        // Enviar formulario (Registrar)
        await page.locator('button[type="submit"]', { hasText: 'Registrar Chip' }).click();

        // Verificar que la tarjeta del nuevo chip aparece en el DOM
        const newCard = page.locator('.device-card', { hasText: uniqueChipNumber });
        await expect(newCard).toBeVisible({ timeout: 10000 });
        await expect(newCard.locator('.subestacion')).toHaveText('🏭 Subestación E2E Pruebas');
    });

    // 2. Editar Dispositivo (Guardar Cambios)
    test('Debería poder editar un chip existente', async ({ page }) => {
        // Buscamos una tarjeta que no esté editándose (o creamos una / usamos una existente)
        const cards = page.locator('.device-card');
        const count = await cards.count();
        expect(count).toBeGreaterThan(0); // Debe haber al menos un dispositivo cargado de base de datos
        
        const targetCard = cards.first();
        const originalChipNumber = await targetCard.locator('.chip-number').textContent();
        
        // Hacer clic en editar
        await targetCard.locator('.edit-btn').click();
        
        // Comprobar que el título del formulario cambió a "Editar Chip"
        await expect(page.locator('.device-form-section h3')).toHaveText('✏️ Editar Chip');

        // Modificar subestación
        const subestacionInput = page.locator('input[placeholder="Ej: Subestación Norte, Centro, Sur"]');
        const originalSubestacionText = await subestacionInput.inputValue();
        const updatedSubestacionText = `${originalSubestacionText} Modificado`;

        await subestacionInput.fill(updatedSubestacionText);

        // Escuchar el diálogo alert de éxito al actualizar
        page.once('dialog', async dialog => {
            expect(dialog.message()).toContain('Dispositivo actualizado correctamente');
            await dialog.accept();
        });

        // Guardar cambios
        await page.locator('button[type="submit"]', { hasText: 'Guardar Cambios' }).click();

        // Verificar que el formulario regresó a "Registrar Nuevo Chip"
        await expect(page.locator('.device-form-section h3')).toHaveText('📱 Registrar Nuevo Chip');

        // Verificar que la tarjeta se actualizó
        const updatedCard = page.locator('.device-card', { hasText: originalChipNumber });
        await expect(updatedCard.locator('.subestacion')).toHaveText(`🏭 ${updatedSubestacionText}`);
    });

    // 3. Eliminar Dispositivo (Delete)
    test('Debería eliminar un chip y quitarlo de la lista al confirmar', async ({ page }) => {
        // Registrar un chip temporal rápido para poder eliminarlo de forma segura
        const tempChipNumber = `TEMP_DEL_${Date.now().toString().slice(-4)}`;
        
        // Registrar dispositivo temporal
        await page.locator('button', { hasText: 'Ingresar Coordenadas' }).click();
        await page.locator('input[placeholder="Ej: 19.432608"]').fill('20.689600');
        await page.locator('input[placeholder="Ej: -99.133209"]').fill('-88.201400');
        await page.locator('button', { hasText: 'Usar estas coordenadas' }).click();
        await page.locator('button', { hasText: 'Confirmar Ubicación' }).click();
        await page.locator('input[placeholder="Ej: CHIP001, 123456789"]').fill(tempChipNumber);
        await page.locator('input[placeholder="Ej: Subestación Norte, Centro, Sur"]').fill('Subestación Temporal');
        
        page.once('dialog', async dialog => {
            await dialog.accept(); // Aceptar alert de agregado
        });
        await page.locator('button[type="submit"]', { hasText: 'Registrar Chip' }).click();

        const cardToDelete = page.locator('.device-card', { hasText: tempChipNumber });
        await expect(cardToDelete).toBeVisible({ timeout: 10000 });

        // Escuchar el diálogo confirm de eliminación
        page.once('dialog', async dialog => {
            expect(dialog.message()).toContain('¿Estás seguro de que quieres eliminar este chip?');
            await dialog.accept(); // Confirmar eliminación
        });

        // Hacer clic en borrar
        await cardToDelete.locator('.delete-btn').click();

        // Verificar que la tarjeta ya no existe en el DOM
        await expect(cardToDelete).toHaveCount(0, { timeout: 10000 });
    });
});
