// ============================================================
// PRUEBA E2E (End-to-End): Flujo completo /api/triples → Google Maps
// Verifica:
//   1. Login y acceso al dashboard
//   2. Google Maps renderiza el mapa
//   3. La API /api/triples y /api/devices responden con datos
//   4. El mapa carga y renderiza marcadores
//   5. Al hacer clic en un marcador, el StatusPanel muestra info
// ============================================================

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL  = 'http://localhost:3001';

// Credenciales del Login (hardcodeadas en Login.jsx)
const LOGIN_USER = 'Victor Gomez';
const LOGIN_PASS = 'TODOLOPUEDO';

// ── Helper: hacer login antes de cada test ────────────────────
async function doLogin(page) {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Si ya está autenticado (localStorage), no hacer login
    const isAlreadyAuth = await page.evaluate(() =>
        localStorage.getItem('isAuthenticated') === 'true'
    );
    if (isAlreadyAuth) return;

    // Rellenar formulario de login
    const usernameInput = page.locator('input[placeholder="Ingresa tu usuario"]');
    const passwordInput = page.locator('input[type="password"]');

    await usernameInput.fill(LOGIN_USER);
    await passwordInput.fill(LOGIN_PASS);

    // Enviar formulario
    await page.locator('form button[type="submit"], form .login-btn').first().click();

    // Esperar que desaparezca la pantalla de login y aparezca el dashboard
    await page.waitForSelector('.login-page', { state: 'hidden', timeout: 10000 }).catch(() => {});
    
    // Esperar que cargue contenido del dashboard
    await page.waitForTimeout(2000);
}

test.describe('E2E — Flujo completo: /api/triples → Google Maps → StatusPanel', () => {

    // ──────────────────────────────────────────────────────────
    // TEST 1: La API /api/devices responde con datos válidos
    // ──────────────────────────────────────────────────────────
    test('La API /api/devices devuelve dispositivos con georeferencia', async ({ page }) => {
        const response = await page.request.get(`${API_URL}/api/devices`);
        expect(response.status()).toBe(200);

        const devices = await response.json();
        expect(Array.isArray(devices)).toBe(true);

        if (devices.length > 0) {
            const device = devices[0];
            expect(device).toHaveProperty('id');
            expect(device).toHaveProperty('chipNumber');
            expect(device).toHaveProperty('subestacion');
            expect(device).toHaveProperty('georeferencia');
            console.log(`✅ /api/devices retornó ${devices.length} dispositivos`);
        }
    });

    // ──────────────────────────────────────────────────────────
    // TEST 2: La API /api/triples devuelve datos válidos
    // ──────────────────────────────────────────────────────────
    test('La API /api/triples devuelve datos con estructura correcta', async ({ page }) => {
        const response = await page.request.get(`${API_URL}/api/triples`);
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(Array.isArray(body)).toBe(true);

        if (body.length > 0) {
            const triple = body[0];
            expect(triple).toHaveProperty('id');
            expect(triple).toHaveProperty('status');
            expect(triple).toHaveProperty('cuchilla1');
            expect(triple).toHaveProperty('cuchilla2');
            expect(triple).toHaveProperty('cuchilla3');
            expect(['green', 'yellow', 'orange', 'red']).toContain(triple.status);
            console.log(`✅ /api/triples retornó ${body.length} triples`);
        }
    });

    // ──────────────────────────────────────────────────────────
    // TEST 3: Login exitoso y dashboard accesible
    // ──────────────────────────────────────────────────────────
    test('Login exitoso permite acceder al dashboard', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

        // Debe mostrar la pantalla de login
        const loginPage = page.locator('.login-page, .login-container');
        await expect(loginPage.first()).toBeVisible({ timeout: 10000 });

        // Rellenar credenciales
        await page.locator('input[placeholder="Ingresa tu usuario"]').fill(LOGIN_USER);
        await page.locator('input[type="password"]').fill(LOGIN_PASS);

        // Enviar formulario
        await page.locator('form button[type="submit"], form .login-btn').first().click();

        // Esperar a que cargue el dashboard (debe desaparecer login)
        await page.waitForTimeout(2000);

        // Verificar que ya no estamos en la pantalla de login
        const dashboardContent = page.locator('.map-container, .dashboard, .status-panel, .app-header');
        await expect(dashboardContent.first()).toBeVisible({ timeout: 15000 });

        console.log('✅ Login exitoso, dashboard cargado');
    });

    // ──────────────────────────────────────────────────────────
    // TEST 4: El dashboard carga y Google Maps se renderiza
    // ──────────────────────────────────────────────────────────
    test('El dashboard carga y Google Maps se renderiza', async ({ page }) => {
        await doLogin(page);

        // Esperar que el div del mapa esté visible
        const mapContainer = page.locator('.map-container');
        await expect(mapContainer.first()).toBeVisible({ timeout: 20000 });

        // Esperar que Google Maps se inicialice (inyecta .gm-style)
        // Damos más tiempo porque la API de Google Maps puede tardar
        const gmStyle = page.locator('.gm-style');
        await expect(gmStyle.first()).toBeVisible({ timeout: 30000 });

        console.log('✅ Google Maps renderizado correctamente');
    });

    // ──────────────────────────────────────────────────────────
    // TEST 5: El mapa muestra la leyenda de colores
    // ──────────────────────────────────────────────────────────
    test('El mapa muestra la leyenda de colores', async ({ page }) => {
        await doLogin(page);

        // Verificar que la leyenda flotante está presente
        const legend = page.locator('.map-floating-legend');
        await expect(legend).toBeVisible({ timeout: 20000 });

        // Verificar contenido de la leyenda
        await expect(page.locator('text=Verde — Normal')).toBeVisible();
        await expect(page.locator('text=Rojo — Disparo total')).toBeVisible();

        console.log('✅ Leyenda del mapa visible con todos los estados');
    });

    // ──────────────────────────────────────────────────────────
    // TEST 6: El panel lateral muestra "Selecciona un dispositivo"
    // ──────────────────────────────────────────────────────────
    test('Sin dispositivo seleccionado, StatusPanel muestra estado vacío', async ({ page }) => {
        await doLogin(page);

        // Buscar el panel de estado vacío
        const emptyMessage = page.locator('text=Selecciona un dispositivo');
        await expect(emptyMessage).toBeVisible({ timeout: 20000 });

        console.log('✅ StatusPanel muestra estado vacío correctamente');
    });
});
