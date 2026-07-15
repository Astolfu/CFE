const express = require('express');
const router = express.Router();

// Obtener todos los triples disparos
router.get('/', async (req, res) => {
    try {
        const [triples] = await req.db.execute(`
            SELECT td.*, d.chip_number, d.subestacion, d.georeferencia 
            FROM triples_disparos td 
            LEFT JOIN dispositivos d ON td.chip_id = d.id 
            ORDER BY td.created_at DESC
        `);

        console.log('📋 Triples disparos encontrados en BD:', triples.length);

        // Formatear respuesta correctamente - MAPPING CORRECTO
        const formattedTriples = triples.map(triple => ({
            id: triple.id,
            chipId: triple.chip_id,
            chipNumber: triple.chip_number, // ← ESTA ES LA CLAVE - mapear chip_number a chipNumber
            subestacion: triple.subestacion,
            georeferencia: triple.georeferencia,
            cuchilla1: Boolean(triple.cuchilla1),
            cuchilla2: Boolean(triple.cuchilla2),
            cuchilla3: Boolean(triple.cuchilla3),
            status: triple.status,
            timestamp: triple.timestamp || triple.created_at
        }));

        console.log('🔧 Triples formateados:', formattedTriples);
        res.json(formattedTriples);
    } catch (error) {
        console.error('Error obteniendo triples disparos:', error);
        res.status(500).json({ error: 'Error obteniendo triples disparos' });
    }
});

// Agregar nuevo triple disparo
router.post('/', async (req, res) => {
    try {
        const { chipId, cuchilla1, cuchilla2, cuchilla3 } = req.body;

        console.log('📨 Datos recibidos para nuevo triple:', { chipId, cuchilla1, cuchilla2, cuchilla3 });

        if (!chipId) {
            return res.status(400).json({ error: 'El chipId es requerido' });
        }

        // Verificar que el dispositivo existe
        const [device] = await req.db.execute('SELECT * FROM dispositivos WHERE id = ?', [chipId]);
        if (device.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        // Obtener el último triple para comparar cambios
        const [lastTriple] = await req.db.execute(
            'SELECT * FROM triples_disparos WHERE chip_id = ? ORDER BY timestamp DESC LIMIT 1',
            [chipId]
        );

        const tripleId = `TD${device[0].chip_number}_${Date.now()}`;
        const status = calculateStatus(cuchilla1, cuchilla2, cuchilla3);

        const [result] = await req.db.execute(
            'INSERT INTO triples_disparos (id, chip_id, cuchilla1, cuchilla2, cuchilla3, status) VALUES (?, ?, ?, ?, ?, ?)',
            [tripleId, chipId, cuchilla1, cuchilla2, cuchilla3, status]
        );

        // Actualizar last_seen con la hora actual
        await req.db.execute(
            'UPDATE dispositivos SET last_seen = NOW() WHERE id = ?',
            [chipId]
        );

        const changes = [];
        if (lastTriple.length > 0) {
            const prev = lastTriple[0];
            if (Boolean(prev.cuchilla1) !== Boolean(cuchilla1)) {
                changes.push(`Cuchilla 1 ${cuchilla1 ? 'cerrada' : 'abierta / disparada ⚠️'}`);
            }
            if (Boolean(prev.cuchilla2) !== Boolean(cuchilla2)) {
                changes.push(`Cuchilla 2 ${cuchilla2 ? 'cerrada' : 'abierta / disparada ⚠️'}`);
            }
            if (Boolean(prev.cuchilla3) !== Boolean(cuchilla3)) {
                changes.push(`Cuchilla 3 ${cuchilla3 ? 'cerrada' : 'abierta / disparada ⚠️'}`);
            }
        } else {
            if (!cuchilla1) changes.push('Cuchilla 1 abierta / disparada ⚠️');
            if (!cuchilla2) changes.push('Cuchilla 2 abierta / disparada ⚠️');
            if (!cuchilla3) changes.push('Cuchilla 3 abierta / disparada ⚠️');
        }

        // Registrar cambios en el historial
        if (changes.length > 0) {
            for (let i = 0; i < changes.length; i++) {
                const changeMsg = changes[i];
                const changeId = `H${Date.now()}_${i}_${Math.floor(Math.random()*1000)}`;
                await req.db.execute(
                    'INSERT INTO historial (id, type, triple_id, chip_id, chip_number, subestacion, status, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [changeId, 'triple_created', tripleId, chipId, device[0].chip_number, device[0].subestacion, status, changeMsg]
                );
            }
        } else {
            await req.db.execute(
                'INSERT INTO historial (id, type, triple_id, chip_id, chip_number, subestacion, status, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [`H${Date.now()}`, 'triple_created', tripleId, chipId, device[0].chip_number, device[0].subestacion, status, `Triple disparo manual registrado - Estado: ${getStatusText(status)}`]
            );
        }

        const newTriple = {
            id: tripleId,
            chipId,
            chipNumber: device[0].chip_number, // ← Asegurar que se envía como chipNumber
            subestacion: device[0].subestacion,
            georeferencia: device[0].georeferencia,
            cuchilla1,
            cuchilla2,
            cuchilla3,
            status,
            timestamp: new Date().toISOString()
        };

        console.log('✅ Triple disparo creado:', newTriple);
        res.json({ success: true, triple: newTriple });
    } catch (error) {
        console.error('Error agregando triple disparo:', error);
        res.status(500).json({ error: 'Error agregando triple disparo' });
    }
});

// Eliminar triple disparo
router.delete('/:id', async (req, res) => {
    try {
        const tripleId = req.params.id;

        // Obtener información del triple disparo antes de eliminar
        const [triple] = await req.db.execute(`
            SELECT td.*, d.chip_number, d.subestacion 
            FROM triples_disparos td 
            LEFT JOIN dispositivos d ON td.chip_id = d.id 
            WHERE td.id = ?
        `, [tripleId]);

        if (triple.length === 0) {
            return res.status(404).json({ error: 'Triple disparo no encontrado' });
        }

        await req.db.execute('DELETE FROM triples_disparos WHERE id = ?', [tripleId]);

        // Agregar al historial
        await req.db.execute(
            'INSERT INTO historial (id, type, triple_id, chip_id, chip_number, subestacion, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [`H${Date.now()}`, 'triple_deleted', tripleId, triple[0].chip_id, triple[0].chip_number, triple[0].subestacion,
            `Triple disparo ${tripleId} eliminado`]
        );

        res.json({ success: true, message: 'Triple disparo eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando triple disparo:', error);
        res.status(500).json({ error: 'Error eliminando triple disparo' });
    }
});

// Función para calcular el estado
function calculateStatus(c1, c2, c3) {
    const activeCount = [c1, c2, c3].filter(Boolean).length;
    if (activeCount === 3) return 'green';
    if (activeCount === 2) return 'yellow';
    if (activeCount === 1) return 'orange';
    return 'red';
}

// Función para obtener texto del estado
function getStatusText(status) {
    const texts = {
        green: '3 Cuchillas Activas',
        yellow: '2 Cuchillas Activas',
        orange: '1 Cuchilla Activa',
        red: '0 Cuchillas Activas'
    };
    return texts[status] || status;
}

module.exports = router;