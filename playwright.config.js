// playwright.config.js — Configuración para pruebas E2E (ESM)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 45000,
    expect: { timeout: 10000 },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://localhost:5173',
        headless: false,          // Abre el navegador visible para que el usuario lo vea
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        actionTimeout: 15000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // El webServer NO se usa aquí porque el usuario ya tiene el servidor corriendo
    // Si quieres que Playwright levante el servidor automáticamente, descomenta:
    // webServer: {
    //     command: 'npm run dev',
    //     url: 'http://localhost:5173',
    //     reuseExistingServer: true,
    // },
});
