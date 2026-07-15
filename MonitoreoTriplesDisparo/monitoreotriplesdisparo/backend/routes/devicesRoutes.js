const express = require('express');
const router = express.Router();

// Obtener todos los dispositivos
router.get('/', async (req, res) => {
    try {
        const [devices] = await req.db.execute('SELECT * FROM dispositivos ORDER BY created_at DESC');

        const formattedDevices = devices.map(device => {
            const lastSeenDate = device.last_seen ? new Date(device.last_seen) : null;
            const isOnline = lastSeenDate ? (Date.now() - lastSeenDate.getTime()) < (2 * 60 * 1000) : false;
            return {
                id: device.id,
                chipNumber: device.chip_number,
                subestacion: device.subestacion,
                georeferencia: device.georeferencia,
                posteImage: device.poste_image,
                lastSeen: device.last_seen,
                connectionType: device.connection_type || 'WiFi',
                ipAddress: device.ip_address || '192.168.1.100',
                isOnline,
                timestamp: device.timestamp || device.created_at
            };
        });

        res.json(formattedDevices);
    } catch (error) {
        console.error('Error obteniendo dispositivos:', error);
        res.status(500).json({ error: 'Error obteniendo dispositivos' });
    }
});

// Obtener un dispositivo específico
router.get('/:id', async (req, res) => {
    try {
        const deviceId = req.params.id;

        const [devices] = await req.db.execute('SELECT * FROM dispositivos WHERE id = ?', [deviceId]);

        if (devices.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        const device = devices[0];
        const lastSeenDate = device.last_seen ? new Date(device.last_seen) : null;
        const isOnline = lastSeenDate ? (Date.now() - lastSeenDate.getTime()) < (2 * 60 * 1000) : false;

        const formattedDevice = {
            id: device.id,
            chipNumber: device.chip_number,
            subestacion: device.subestacion,
            georeferencia: device.georeferencia,
            posteImage: device.poste_image,
            lastSeen: device.last_seen,
            connectionType: device.connection_type || 'WiFi',
            ipAddress: device.ip_address || '192.168.1.100',
            isOnline,
            timestamp: device.timestamp || device.created_at
        };

        res.json(formattedDevice);
    } catch (error) {
        console.error('Error obteniendo dispositivo:', error);
        res.status(500).json({ error: 'Error obteniendo dispositivo' });
    }
});

// Agregar nuevo dispositivo
router.post('/', async (req, res) => {
    try {
        const { chipNumber, subestacion, georeferencia, posteImage, connectionType, ipAddress } = req.body;

        if (!chipNumber || !subestacion || !georeferencia) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const finalConnType = connectionType || (Math.random() > 0.5 ? 'WiFi' : 'LTE/4G');
        const finalIpAddress = ipAddress || (finalConnType === 'WiFi' 
            ? `192.168.1.${Math.floor(Math.random() * 253 + 2)}` 
            : `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254 + 1)}`);

        const deviceId = `CHIP${Date.now()}`;

        const [result] = await req.db.execute(
            'INSERT INTO dispositivos (id, chip_number, subestacion, georeferencia, poste_image, connection_type, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [deviceId, chipNumber, subestacion, georeferencia, posteImage || null, finalConnType, finalIpAddress]
        );

        // Agregar al historial
        await req.db.execute(
            'INSERT INTO historial (id, type, device_id, chip_number, subestacion, georeferencia, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [`H${Date.now()}`, 'device_added', deviceId, chipNumber, subestacion, georeferencia,
            `Dispositivo ${chipNumber} registrado en ${subestacion}`]
        );

        const newDevice = {
            id: deviceId,
            chipNumber: chipNumber,
            subestacion: subestacion,
            georeferencia: georeferencia,
            posteImage: posteImage,
            connectionType: finalConnType,
            ipAddress: finalIpAddress,
            timestamp: new Date().toISOString()
        };

        res.json({ success: true, device: newDevice });
    } catch (error) {
        console.error('Error agregando dispositivo:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Ya existe un dispositivo con este número de chip' });
        } else {
            res.status(500).json({ error: 'Error agregando dispositivo' });
        }
    }
});

// Actualizar dispositivo
router.put('/:id', async (req, res) => {
    try {
        const deviceId = req.params.id;
        const { chipNumber, subestacion, georeferencia, posteImage, connectionType, ipAddress } = req.body;

        console.log('📝 Actualizando dispositivo:', deviceId, req.body);

        if (!chipNumber || !subestacion || !georeferencia) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        // Verificar que el dispositivo existe
        const [existingDevices] = await req.db.execute('SELECT * FROM dispositivos WHERE id = ?', [deviceId]);
        if (existingDevices.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        const finalConnType = connectionType || existingDevices[0].connection_type || 'WiFi';
        const finalIpAddr = ipAddress || existingDevices[0].ip_address || '192.168.1.100';

        // Actualizar dispositivo (sin updated_at)
        await req.db.execute(
            'UPDATE dispositivos SET chip_number = ?, subestacion = ?, georeferencia = ?, poste_image = ?, connection_type = ?, ip_address = ? WHERE id = ?',
            [chipNumber, subestacion, georeferencia, posteImage || null, finalConnType, finalIpAddr, deviceId]
        );

        console.log('✅ Dispositivo actualizado en BD');

        // Agregar al historial
        try {
            await req.db.execute(
                'INSERT INTO historial (id, type, device_id, chip_number, subestacion, georeferencia, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [`H${Date.now()}`, 'device_updated', deviceId, chipNumber, subestacion, georeferencia,
                `Dispositivo ${chipNumber} actualizado en ${subestacion}`]
            );
        } catch (histError) {
            console.warn('⚠️ Error agregando al historial (no crítico):', histError.message);
        }

        const updatedDevice = {
            id: deviceId,
            chipNumber: chipNumber,
            subestacion: subestacion,
            georeferencia: georeferencia,
            posteImage: posteImage,
            connectionType: finalConnType,
            ipAddress: finalIpAddr,
            timestamp: new Date().toISOString()
        };

        res.json({ success: true, device: updatedDevice });
    } catch (error) {
        console.error('❌ Error actualizando dispositivo:', error);
        res.status(500).json({ error: 'Error actualizando dispositivo: ' + error.message });
    }
});

// Eliminar dispositivo
router.delete('/:id', async (req, res) => {
    try {
        const deviceId = req.params.id;

        // Obtener información del dispositivo antes de eliminar
        const [device] = await req.db.execute('SELECT * FROM dispositivos WHERE id = ?', [deviceId]);

        if (device.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        // Eliminar dispositivo (los triples disparos se eliminarán en cascada)
        await req.db.execute('DELETE FROM dispositivos WHERE id = ?', [deviceId]);

        // Agregar al historial
        await req.db.execute(
            'INSERT INTO historial (id, type, device_id, chip_number, subestacion, message) VALUES (?, ?, ?, ?, ?, ?)',
            [`H${Date.now()}`, 'device_deleted', deviceId, device[0].chip_number, device[0].subestacion,
            `Dispositivo ${device[0].chip_number} eliminado de ${device[0].subestacion}`]
        );

        res.json({ success: true, message: 'Dispositivo eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando dispositivo:', error);
        res.status(500).json({ error: 'Error eliminando dispositivo' });
    }
});

module.exports = router;