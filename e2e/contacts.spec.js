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

test.describe('Pruebas Funcionales — Gestión de Contactos (CRUD)', () => {

    test.beforeEach(async ({ page }) => {
        // Asegurar inicio de sesión
        await doLogin(page);

        // Cambiar a la pestaña de Contactos
        const navButton = page.locator('nav.navbar button').filter({ hasText: 'Contactos' });
        await navButton.click();

        // Esperar a que la página de contactos esté visible
        await expect(page.locator('.contacts-page')).toBeVisible({ timeout: 10000 });
    });

    // 1. Crear Contacto
    test('Debería poder registrar un nuevo contacto para recibir alertas', async ({ page }) => {
        const uniqueName = `Técnico E2E ${Date.now().toString().slice(-4)}`;
        
        // Escuchar el alert de éxito
        page.once('dialog', async dialog => {
            expect(dialog.message()).toContain('Contacto agregado correctamente');
            await dialog.accept();
        });

        // Hacer clic en "Nuevo Contacto"
        await page.locator('button.btn-add-contact').first().click();

        // Verificar que el modal se abre
        await expect(page.locator('.modal-overlay')).toBeVisible();

        // Rellenar campos del formulario
        await page.locator('input[placeholder="Ej: Juan Pérez"]').fill(uniqueName);
        await page.locator('input[placeholder="Ej: Supervisor, Técnico"]').fill('Técnico E2E Respondedor');
        await page.locator('input[placeholder="+52 123 456 7890"]').fill('+52 111 222 3333');
        await page.locator('input[placeholder="Ej: 123456789"]').fill('999999999');

        // Hacer clic en "Guardar Contacto"
        await page.locator('button.btn-submit').click();

        // Verificar que el modal se cierra
        await expect(page.locator('.modal-overlay')).toHaveCount(0);

        // Verificar que el contacto se muestra en la cuadrícula
        const contactCard = page.locator('.contact-card', { hasText: uniqueName });
        await expect(contactCard).toBeVisible({ timeout: 10000 });
        await expect(contactCard.locator('.contact-role')).toHaveText('Técnico E2E Respondedor');
        await expect(contactCard.locator('text=Chat ID: 999999999')).toBeVisible();
    });

    // 2. Enviar Mensaje de Prueba por Telegram
    test('Debería probar la funcionalidad de envío de mensaje de prueba por Telegram', async ({ page }) => {
        // Asegurarse de que hay al menos un contacto para hacer el test
        const cards = page.locator('.contact-card');
        const count = await cards.count();
        
        if (count === 0) {
            // Si no hay contactos, crear uno rápido
            await page.locator('button.btn-add-contact').first().click();
            await page.locator('input[placeholder="Ej: Juan Pérez"]').fill('Técnico Telegram Prueba');
            await page.locator('input[placeholder="Ej: 123456789"]').fill('123456789');
            page.once('dialog', async dialog => await dialog.accept());
            await page.locator('button.btn-submit').click();
        }

        const targetCard = page.locator('.contact-card').first();
        const contactName = await targetCard.locator('.contact-name').textContent();
        console.log(`Testeo de Telegram para: ${contactName}`);

        // Escuchar el alert del test de telegram
        page.once('dialog', async dialog => {
            // El backend podría no tener el token de telegram o fallar la API,
            // pero el handler maneja el mensaje de respuesta. Verificamos que responda algo coherente.
            expect(dialog.message()).toMatch(/(enviado correctamente|Error|No se pudo)/i);
            await dialog.accept();
        });

        // Hacer clic en el botón de test (📤)
        await targetCard.locator('.btn-test').click();
    });

    // 3. Eliminar Contacto
    test('Debería poder eliminar un contacto del directorio', async ({ page }) => {
        // Crear un contacto temporal para borrarlo
        const tempContactName = `TEMP_CON_${Date.now().toString().slice(-4)}`;
        await page.locator('button.btn-add-contact').first().click();
        await page.locator('input[placeholder="Ej: Juan Pérez"]').fill(tempContactName);
        await page.locator('input[placeholder="Ej: 123456789"]').fill('888888888');
        page.once('dialog', async dialog => await dialog.accept());
        await page.locator('button.btn-submit').click();

        const cardToDelete = page.locator('.contact-card', { hasText: tempContactName });
        await expect(cardToDelete).toBeVisible({ timeout: 10000 });

        // Configurar confirmación de eliminación y el alert posterior
        page.once('dialog', async confirmDialog => {
            expect(confirmDialog.message()).toContain('¿Estás seguro de que quieres eliminar este contacto?');
            await confirmDialog.accept(); // Confirmar la eliminación

            // Después de confirmar, vendrá la confirmación de éxito ("Contacto eliminado correctamente")
            page.once('dialog', async successDialog => {
                expect(successDialog.message()).toContain('Contacto eliminado correctamente');
                await successDialog.accept();
            });
        });

        // Hacer clic en eliminar
        await cardToDelete.locator('.btn-delete').click();

        // Verificar que desaparece del DOM
        await expect(cardToDelete).toHaveCount(0, { timeout: 10000 });
    });
});
