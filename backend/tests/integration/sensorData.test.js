// ============================================================
// PRUEBA DE INTEGRACIÓN: POST /api/esp32/sensor-data
// Verifica:
//   1. Escritura en MySQL (via mock)
//   2. Activación de telegramService cuando status !== 'green'
//   3. NO activación de Telegram cuando status === 'green'
// ============================================================

const request = require('supertest');
const express = require('express');

// ── Mock de telegramService ANTES de importar la ruta ──────
jest.mock('../../services/telegramService', () => ({
    sendAlert: jest.fn().mockResolvedValue({ ok: true, sent: true })
}));

const telegramService = require('../../services/telegramService');
const esp32Router    = require('../../routes/esp32Routes');

// ── Helper: construye un mock de base de datos ─────────────
function buildMockDb({ deviceExists = true, tripleExists = false, status = 'green' } = {}) {
    const mockDevice = {
        id: 'DEV001',
        chip_number: 'CHIP-TEST-01',
        subestacion: 'Subestación Norte',
        georeferencia: '14.0723,-89.2182'
    };

    const mockTriple = tripleExists
        ? [{ id: 'TD001', cuchilla1: 1, cuchilla2: 1, cuchilla3: 1, status: 'green' }]
        : [];

    // execute() siempre retorna [rows, fields]
    const executeMock = jest.fn().mockImplementation((query) => {
        if (query.includes('SELECT * FROM dispositivos WHERE chip_number')) {
            return Promise.resolve([deviceExists ? [mockDevice] : []]);
        }
        // Segunda query: lista todos los chips disponibles (debug cuando no encuentra el chip)
        if (query.includes('SELECT chip_number FROM dispositivos')) {
            return Promise.resolve([deviceExists ? [{ chip_number: mockDevice.chip_number }] : []]);
        }
        if (query.includes('SELECT * FROM dispositivos')) {
            return Promise.resolve([deviceExists ? [mockDevice] : []]);
        }
        if (query.includes('SELECT * FROM triples_disparos WHERE id')) {
            return Promise.resolve([mockTriple]);
        }
        if (query.includes('SELECT * FROM triples_disparos WHERE chip_id')) {
            return Promise.resolve([[]]);
        }
        if (query.includes('SELECT * FROM contactos')) {
            return Promise.resolve([[{
                id: 'C001',
                name: 'Operador Test',
                phone: '+50212345678',
                telegram_chat_id: '123456789',
                notifications_whatsapp: 1,
                notifications_critical_only: 0
            }]]);
        }
        // INSERT / UPDATE → retorna resultado genérico
        return Promise.resolve([{ affectedRows: 1, insertId: 1 }]);
    });

    return { execute: executeMock };
}

// ── Construir la app de Express con el router ──────────────
function buildApp(mockDb) {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.db = mockDb;
        next();
    });
    app.use('/api/esp32', esp32Router);
    return app;
}

// ── Limpiar mocks entre tests ──────────────────────────────
beforeEach(() => {
    jest.clearAllMocks();
});

// ============================================================
// SUITE 1: Flujo de datos completo hacia MySQL
// ============================================================
describe('POST /api/esp32/sensor-data — Escritura en base de datos', () => {

    test('Crea nuevo triple disparo en BD cuando no existe (INSERT ejecutado)', async () => {
        const mockDb = buildMockDb({ deviceExists: true, tripleExists: false });
        const app    = buildApp(mockDb);

        const response = await request(app)
            .post('/api/esp32/sensor-data')
            .send({
                chipNumber:      'CHIP-TEST-01',
                tripleDisparoId: 'TD-NUEVO-001',
                cuchilla1:       true,
                cuchilla2:       true,
                cuchilla3:       true
            })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verificar que se ejecutó un INSERT en triples_disparos
        const calls = mockDb.execute.mock.calls.map(c => c[0]);
        const insertCall = calls.find(q => q.includes('INSERT INTO triples_disparos'));
        expect(insertCall).toBeDefined();
    });

    test('Actualiza triple disparo existente en BD (UPDATE ejecutado)', async () => {
        const mockDb = buildMockDb({ deviceExists: true, tripleExists: true });
        const app    = buildApp(mockDb);

        const response = await request(app)
            .post('/api/esp32/sensor-data')
            .send({
                chipNumber:      'CHIP-TEST-01',
                tripleDisparoId: 'TD001',
                cuchilla1:       false,
                cuchilla2:       true,
                cuchilla3:       true
            });

        expect(response.status).toBe(200);

        const calls = mockDb.execute.mock.calls.map(c => c[0]);
        const updateCall = calls.find(q => q.includes('UPDATE triples_disparos'));
        expect(updateCall).toBeDefined();
    });

    test('Retorna 404 si el chip no está registrado en BD', async () => {
        const mockDb = buildMockDb({ deviceExists: false });
        const app    = buildApp(mockDb);

        const response = await request(app)
            .post('/api/esp32/sensor-data')
            .send({
                chipNumber:      'CHIP-NO-EXISTE',
                tripleDisparoId: 'TD001',
                cuchilla1:       true,
                cuchilla2:       true,
                cuchilla3:       true
            });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
    });

    test('Retorna 400 si falta chipNumber', async () => {
        const mockDb = buildMockDb();
        const app    = buildApp(mockDb);

        const response = await request(app)
            .post('/api/esp32/sensor-data')
            .send({
                tripleDisparoId: 'TD001',
                cuchilla1: true,
                cuchilla2: true,
                cuchilla3: true
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('chipNumber');
    });

    test('Actualiza last_seen del dispositivo en BD', async () => {
        const mockDb = buildMockDb({ deviceExists: true, tripleExists: false });
        const app    = buildApp(mockDb);

        await request(app)
            .post('/api/esp32/sensor-data')
            .send({
                chipNumber:      'CHIP-TEST-01',
                tripleDisparoId: 'TD-NEW',
                cuchilla1:       true,
                cuchilla2:       true,
                cuchilla3:       true
            });

        const calls     = mockDb.execute.mock.calls.map(c => c[0]);
        const lastSeen  = calls.find(q => q.includes('UPDATE dispositivos SET last_seen'));
        expect(lastSeen).toBeDefined();
    });
});

// ============================================================
// SUITE 2: Notificaciones Telegram
// ============================================================
describe('POST /api/esp32/sensor-data — Notificaciones Telegram', () => {

    test('Activa telegramService.sendAlert cuando status es "red" (0 cuchillas)', async () => {
        const mockDb = buildMockDb({ deviceExists: true, tripleExists: false });
        const app    = buildApp(mockDb);

        await request(app)
            .post('/api/esp32/sensor-data')
            .send({
                chipNumber:      'CHIP-TEST-01',
                tripleDisparoId: 'TD-ALERT',
                cuchilla1:       false,
                cuchilla2:       false,
                cuchilla3:       false
            });

        expect(telegramService.sendAlert).toHaveBeenCalledTimes(1);
        expect(telegramService.sendAlert).toHaveBeenCalledWith(
            expect.objectContaining({ telegramChatId: '123456789' }),
            expect.objectContaining({ chip_number: 'CHIP-TEST-01' }),
            expect.objectContaining({ status: 'red' })
        );
    });

    test('Activa telegramService.sendAlert cuando status es "orange" (1 cuchilla)', async () => {
        const mockDb = buildMockDb({ deviceExists: true, tripleExists: false });
        const app    = buildApp(mockDb);

        await request(app)
            .post('/api/esp32/sensor-data')
            .send({
                chipNumber:      'CHIP-TEST-01',
                tripleDisparoId: 'TD-ORANGE',
                cuchilla1:       true,
                cuchilla2:       false,
                cuchilla3:       false
            });

        expect(telegramService.sendAlert).toHaveBeenCalledTimes(1);
        const callArgs = telegramService.sendAlert.mock.calls[0];
        expect(callArgs[2].status).toBe('orange');
    });

    test('NO activa telegramService cuando status es "green" (3 cuchillas)', async () => {
        const mockDb = buildMockDb({ deviceExists: true, tripleExists: false });
        const app    = buildApp(mockDb);

        await request(app)
            .post('/api/esp32/sensor-data')
            .send({
                chipNumber:      'CHIP-TEST-01',
                tripleDisparoId: 'TD-GREEN',
                cuchilla1:       true,
                cuchilla2:       true,
                cuchilla3:       true
            });

        // Estado verde → sin alertas
        expect(telegramService.sendAlert).not.toHaveBeenCalled();
    });

    test('Crea notificación en BD cuando status no es "green"', async () => {
        const mockDb = buildMockDb({ deviceExists: true, tripleExists: false });
        const app    = buildApp(mockDb);

        await request(app)
            .post('/api/esp32/sensor-data')
            .send({
                chipNumber:      'CHIP-TEST-01',
                tripleDisparoId: 'TD-NOTIF',
                cuchilla1:       false,
                cuchilla2:       false,
                cuchilla3:       true
            });

        const calls  = mockDb.execute.mock.calls.map(c => c[0]);
        const notif  = calls.find(q => q.includes('INSERT INTO notificaciones'));
        expect(notif).toBeDefined();
    });

    test('NO crea notificación en BD cuando status es "green"', async () => {
        const mockDb = buildMockDb({ deviceExists: true, tripleExists: false });
        const app    = buildApp(mockDb);

        await request(app)
            .post('/api/esp32/sensor-data')
            .send({
                chipNumber:      'CHIP-TEST-01',
                tripleDisparoId: 'TD-NO-NOTIF',
                cuchilla1:       true,
                cuchilla2:       true,
                cuchilla3:       true
            });

        const calls = mockDb.execute.mock.calls.map(c => c[0]);
        const notif = calls.find(q => q.includes('INSERT INTO notificaciones'));
        expect(notif).toBeUndefined();
    });
});
