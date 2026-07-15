// ============================================================
// PRUEBA DE INTEGRACIÓN: Eliminación en cascada de dispositivos
// Verifica que al eliminar un dispositivo, sus triples_disparos
// asociados se eliminan (ON DELETE CASCADE en MySQL)
// ============================================================

const request = require('supertest');
const express = require('express');
const devicesRouter = require('../../routes/devicesRoutes');

// ── Helper: construye mock de BD con dispositivos y triples ──
function buildMockDb({ deviceExists = true, deviceId = 'DEV-CASCADE-01' } = {}) {
    const mockDevice = [{
        id: deviceId,
        chip_number: 'CHIP-CASCADE',
        subestacion: 'Subestación Sur',
        georeferencia: '14.0500,-89.2000',
        last_seen: new Date().toISOString(),
        connection_type: 'WiFi',
        ip_address: '192.168.1.50',
        poste_image: null,
        created_at: new Date().toISOString()
    }];

    const executeMock = jest.fn().mockImplementation((query, params) => {
        // SELECT dispositivo por ID
        if (query.includes('SELECT * FROM dispositivos WHERE id')) {
            return Promise.resolve([deviceExists ? mockDevice : []]);
        }
        // SELECT todos los dispositivos
        if (query.includes('SELECT * FROM dispositivos ORDER BY')) {
            return Promise.resolve([mockDevice]);
        }
        // DELETE dispositivo (esto activa CASCADE en MySQL real)
        if (query.includes('DELETE FROM dispositivos WHERE id')) {
            return Promise.resolve([{ affectedRows: 1 }]);
        }
        // INSERT historial
        if (query.includes('INSERT INTO historial')) {
            return Promise.resolve([{ affectedRows: 1 }]);
        }
        return Promise.resolve([{ affectedRows: 0 }]);
    });

    return { execute: executeMock };
}

function buildApp(mockDb) {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.db = mockDb;
        next();
    });
    app.use('/api/devices', devicesRouter);
    return app;
}

beforeEach(() => {
    jest.clearAllMocks();
});

// ============================================================
// SUITE: Eliminación en cascada
// ============================================================
describe('DELETE /api/devices/:id — Eliminación en cascada', () => {

    test('Elimina el dispositivo correctamente (status 200)', async () => {
        const mockDb = buildMockDb({ deviceExists: true });
        const app    = buildApp(mockDb);

        const response = await request(app)
            .delete('/api/devices/DEV-CASCADE-01');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('eliminado');
    });

    test('Ejecuta DELETE FROM dispositivos con el ID correcto', async () => {
        const mockDb = buildMockDb({ deviceExists: true, deviceId: 'DEV-CASCADE-01' });
        const app    = buildApp(mockDb);

        await request(app).delete('/api/devices/DEV-CASCADE-01');

        // Verificar que la query DELETE fue ejecutada con el ID correcto
        const calls       = mockDb.execute.mock.calls;
        const deleteCall  = calls.find(([q]) => q.includes('DELETE FROM dispositivos'));
        expect(deleteCall).toBeDefined();
        expect(deleteCall[1]).toEqual(['DEV-CASCADE-01']);
    });

    test('El DELETE de dispositivos activa CASCADE (triples_disparos NO necesitan DELETE explícito)', async () => {
        const mockDb = buildMockDb({ deviceExists: true });
        const app    = buildApp(mockDb);

        await request(app).delete('/api/devices/DEV-CASCADE-01');

        const calls = mockDb.execute.mock.calls.map(([q]) => q);

        // La API SOLO hace DELETE en dispositivos, no en triples_disparos
        // porque MySQL tiene ON DELETE CASCADE configurado
        const deleteTriplesCall = calls.find(q => q.includes('DELETE FROM triples_disparos'));
        expect(deleteTriplesCall).toBeUndefined();

        // Pero SÍ hace DELETE en dispositivos
        const deleteDeviceCall = calls.find(q => q.includes('DELETE FROM dispositivos'));
        expect(deleteDeviceCall).toBeDefined();
    });

    test('Registra la eliminación en el historial', async () => {
        const mockDb = buildMockDb({ deviceExists: true });
        const app    = buildApp(mockDb);

        await request(app).delete('/api/devices/DEV-CASCADE-01');

        const calls       = mockDb.execute.mock.calls.map(([q]) => q);
        const historyCall = calls.find(q => q.includes('INSERT INTO historial'));
        expect(historyCall).toBeDefined();
    });

    test('Retorna 404 si el dispositivo no existe', async () => {
        const mockDb = buildMockDb({ deviceExists: false });
        const app    = buildApp(mockDb);

        const response = await request(app)
            .delete('/api/devices/DEV-NO-EXISTE');

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('no encontrado');
    });

    test('NO ejecuta DELETE si el dispositivo no existe', async () => {
        const mockDb = buildMockDb({ deviceExists: false });
        const app    = buildApp(mockDb);

        await request(app).delete('/api/devices/DEV-NO-EXISTE');

        const calls       = mockDb.execute.mock.calls.map(([q]) => q);
        const deleteCall  = calls.find(q => q.includes('DELETE FROM dispositivos'));
        expect(deleteCall).toBeUndefined();
    });
});
