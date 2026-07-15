import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Credenciales válidas configuradas en la aplicación
const VALID_USER = 'Victor Gomez';
const VALID_PASS = 'TODOLOPUEDO';

test.describe('Pruebas de Inicio de Sesión (Login)', () => {

    test.beforeEach(async ({ page }) => {
        // Limpiar el estado y navegar a la página de login
        await page.goto(BASE_URL);
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'networkidle' });
    });

    // 1. Verificar Usuario Válido
    test('Debería iniciar sesión correctamente con un usuario válido', async ({ page }) => {
        // Encontrar y rellenar campos
        await page.locator('input[placeholder="Ingresa tu usuario"]').fill(VALID_USER);
        await page.locator('input[type="password"]').fill(VALID_PASS);

        // Hacer clic en el botón de submit
        await page.locator('button.btn-login').click();

        // Verificar que la pantalla de login desaparece y se muestra el dashboard
        await page.waitForSelector('.login-page', { state: 'hidden', timeout: 10000 });
        
        // Verificar que los componentes del dashboard estén visibles
        const dashboardView = page.locator('.map-container, .dashboard, .status-panel, .app-header');
        await expect(dashboardView.first()).toBeVisible({ timeout: 10000 });
        
        // Verificar que el localStorage guardó el estado de autenticación
        const isAuthenticated = await page.evaluate(() => localStorage.getItem('isAuthenticated'));
        expect(isAuthenticated).toBe('true');
    });

    // 2. Verificar Usuario Inválido
    test('Debería mostrar un mensaje de error con un usuario inválido', async ({ page }) => {
        // Encontrar y rellenar campos con un usuario inexistente
        await page.locator('input[placeholder="Ingresa tu usuario"]').fill('Usuario Inexistente');
        await page.locator('input[type="password"]').fill(VALID_PASS);

        // Hacer clic en iniciar sesión
        await page.locator('button.btn-login').click();

        // Verificar que no se inicia sesión (permanece la pantalla de login)
        await expect(page.locator('.login-page')).toBeVisible();

        // Verificar que aparece el mensaje de error esperado
        const errorMessage = page.locator('.error-message');
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toHaveText(/Usuario o contraseña incorrectos/);
    });

    // 3. Verificar Contraseña Incorrecta
    test('Debería mostrar un mensaje de error con una contraseña incorrecta', async ({ page }) => {
        // Encontrar y rellenar campos con usuario correcto pero contraseña errónea
        await page.locator('input[placeholder="Ingresa tu usuario"]').fill(VALID_USER);
        await page.locator('input[type="password"]').fill('PASSWORD_INCORRECTO');

        // Hacer clic en iniciar sesión
        await page.locator('button.btn-login').click();

        // Verificar que permanece la pantalla de login
        await expect(page.locator('.login-page')).toBeVisible();

        // Verificar que aparece el mensaje de error
        const errorMessage = page.locator('.error-message');
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toHaveText(/Usuario o contraseña incorrectos/);
    });

    // 4. Verificar Recuperación de Contraseña (si existe)
    test('Debería comprobar la ausencia de la opción de recuperación de contraseña', async ({ page }) => {
        // Comprobar que en la página de login no existe ningún enlace o botón de recuperación
        const recoverLink = page.locator('text=Recuperar, text=contraseña, text=olvidaste');
        await expect(recoverLink).toHaveCount(0);

        // Verificar que la interfaz muestra la advertencia de acceso restringido
        const restrictionNotice = page.locator('text=Acceso restringido solo para personal autorizado');
        await expect(restrictionNotice).toBeVisible();
    });
});
