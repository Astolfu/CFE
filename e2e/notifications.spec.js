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

test.describe('Pruebas Funcionales — Notificaciones del Sistema', () => {

    test.beforeEach(async ({ page }) => {
        // Asegurar inicio de sesión
        await doLogin(page);

        // Cambiar a la pestaña de Notificaciones
        const navButton = page.locator('nav.navbar button').filter({ hasText: 'Notificaciones' });
        await navButton.click();

        // Esperar a que la página de notificaciones esté visible
        await expect(page.locator('.notifications-page')).toBeVisible({ timeout: 10000 });
    });

    // 1. Filtrar notificaciones (Todas, No leídas, Advertencias)
    test('Debería poder filtrar notificaciones por su estado de lectura', async ({ page }) => {
        // Hacer clic en el filtro "No leídas"
        await page.locator('button.filter-btn', { hasText: 'No leídas' }).click();
        await page.waitForTimeout(300);

        // Comprobar que no hay tarjetas con la clase `.read` visibles
        const readCards = page.locator('.notification-card.read');
        await expect(readCards).toHaveCount(0);

        // Hacer clic en "Todas"
        await page.locator('button.filter-btn', { hasText: 'Todas' }).click();
        await page.waitForTimeout(300);
        
        // Deberían poder aparecer tarjetas leídas o no leídas
        const allCards = page.locator('.notification-card');
        const count = await allCards.count();
        console.log(`Visualizando ${count} notificaciones en total`);
    });

    // 2. Marcar notificación individual como leída
    test('Debería poder marcar una notificación como leída individualmente', async ({ page }) => {
        // Asegurar que hay al menos una notificación no leída en el DOM
        // Seleccionamos el filtro "No leídas"
        await page.locator('button.filter-btn', { hasText: 'No leídas' }).click();
        await page.waitForTimeout(300);

        const unreadCards = page.locator('.notification-card.unread');
        const count = await unreadCards.count();

        if (count > 0) {
            const targetCard = unreadCards.first();
            const markReadButton = targetCard.locator('.btn-mark-read');

            // Hacer clic en "Marcar como leída"
            await markReadButton.click();
            await page.waitForTimeout(300);

            // Verificar que la tarjeta ha cambiado de estado visual (ya no tiene la clase .unread)
            // Si estábamos en el filtro "No leídas", esta tarjeta debería desaparecer de la vista actual
            await expect(targetCard).toHaveCount(0);
        } else {
            console.log('No hay notificaciones no leídas para probar en este ciclo.');
        }
    });

    // 3. Clic en notificación y redirección interactiva al mapa del Dashboard
    test('Debería redirigir al Dashboard y seleccionar el dispositivo al hacer clic en una notificación', async ({ page }) => {
        const cards = page.locator('.notification-card');
        const count = await cards.count();

        if (count > 0) {
            const targetCard = cards.first();
            
            // Obtener el chipId o subestación de referencia en la notificación
            const detailText = await targetCard.locator('.notification-details').textContent();
            console.log(`Detalle de notificación clickeada: ${detailText}`);

            // Hacer clic en la tarjeta completa para disparar el flujo de navegación
            await targetCard.click();
            await page.waitForTimeout(1000);

            // Verificar redirección automática al Dashboard
            await expect(page.locator('nav.navbar button.active')).toHaveText(/Dashboard/);
            await expect(page.locator('.map-container')).toBeVisible();

            // Verificar que se abrió el panel lateral del dispositivo y muestra datos de cuchillas
            const statusPanelHeader = page.locator('.status-panel h2');
            await expect(statusPanelHeader).toBeVisible();
            await expect(statusPanelHeader).not.toHaveText(/Selecciona un dispositivo/i);
        } else {
            console.log('No hay notificaciones para probar la redirección.');
        }
    });
});
