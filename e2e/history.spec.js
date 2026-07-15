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

test.describe('Pruebas Funcionales — Historial de Eventos (Filtros, CSV y Gráficas)', () => {

    test.beforeEach(async ({ page }) => {
        // Asegurar inicio de sesión
        await doLogin(page);

        // Cambiar a la pestaña de Historial
        const navButton = page.locator('nav.navbar button').filter({ hasText: 'Historial' });
        await navButton.click();

        // Esperar a que la página de historial esté visible
        await expect(page.locator('.history-page')).toBeVisible({ timeout: 10000 });
    });

    // 1. Filtrar eventos y limpiar filtros
    test('Debería poder filtrar el historial por subestación y limpiar los filtros', async ({ page }) => {
        const subestacionInput = page.locator('input[placeholder="Buscar subestación..."]');
        
        // Escribir en el filtro de subestación
        await subestacionInput.fill('Valladolid');
        
        // Esperar un momento a que reaccione el useEffect de filtrado
        await page.waitForTimeout(500);

        // Verificar que las filas de la tabla correspondan al filtro
        const rows = page.locator('.history-table tbody tr');
        const count = await rows.count();
        
        if (count > 0 && !(await rows.first().locator('td').first().hasClass('no-data'))) {
            // Si hay filas de datos, verificar que contengan la subestación
            for (let i = 0; i < Math.min(count, 5); i++) {
                const subText = await rows.nth(i).locator('td').nth(4).textContent(); // 5ta columna es Subestación (0-indexed index 4)
                expect(subText?.toLowerCase()).toContain('valladolid');
            }
        }

        // Limpiar los filtros
        await page.locator('button', { hasText: 'Limpiar' }).click();

        // Verificar que el input de subestación quedó vacío
        await expect(subestacionInput).toHaveValue('');
    });

    // 2. Visualizar modal de gráficas (Chart.js)
    test('Debería poder abrir y cerrar el modal de análisis de gráficas', async ({ page }) => {
        // Hacer clic en "Ver Gráficas"
        await page.locator('button', { hasText: 'Ver Gráficas' }).click();

        // Verificar que el modal de gráficas está visible
        const modalOverlay = page.locator('.charts-modal-overlay');
        await expect(modalOverlay).toBeVisible();

        // Verificar que se renderizan contenedores de gráficas
        const chartWrapper = modalOverlay.locator('.chart-wrapper');
        await expect(chartWrapper.first()).toBeVisible({ timeout: 10000 });

        // Cerrar el modal mediante el botón "×"
        await modalOverlay.locator('.close-btn').click();

        // Verificar que el modal desaparece
        await expect(modalOverlay).toHaveCount(0);
    });

    // 3. Exportar historial a CSV
    test('Debería permitir la descarga del reporte en formato CSV', async ({ page }) => {
        // Preparar la intercepción de la descarga
        const [download] = await Promise.all([
            page.waitForEvent('download'), // Esperar a que comience la descarga
            page.locator('button', { hasText: 'Exportar CSV' }).click() // Hacer clic en el botón de exportación
        ]);

        // Verificar que el nombre del archivo descargado tiene extensión .csv
        const filename = download.suggestedFilename();
        expect(filename).toContain('.csv');
        expect(filename).toContain('historial_triples_');

        // Confirmar la descarga correcta sin problemas
        const path = await download.path();
        expect(path).not.toBeNull();
    });
});
