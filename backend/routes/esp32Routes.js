const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegramService');

// Endpoint para recibir datos del ESP32
router.post('/sensor-data', async (req, res) => {
    console.log('🔄 Iniciando procesamiento de sensor-data');
    console.log('📨 Headers recibidos:', req.headers);
    console.log('📦 Body recibido:', req.body);

    let chipNumber, tripleDisparoId, cuchilla1, cuchilla2, cuchilla3;

    // INTENTAR OBTENER DATOS DEL BODY PRIMERO
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('🔍 Buscando datos en body...');
        chipNumber = req.body.chipNumber || req.body.chipnumber;
        tripleDisparoId = req.body.tripleDisparoId || req.body.tripledisparoid;
        cuchilla1 = req.body.cuchilla1;
        cuchilla2 = req.body.cuchilla2;
        cuchilla3 = req.body.cuchilla3;
    }

    // SI NO HAY DATOS EN EL BODY, BUSCAR EN LOS HEADERS
    if (!chipNumber && req.headers.chipnumber) {
        console.log('🔍 Buscando datos en headers...');
        chipNumber = req.headers.chipnumber;
        tripleDisparoId = req.headers.tripledisparoid;
        cuchilla1 = req.headers.cuchilla1;
        cuchilla2 = req.headers.cuchilla2;
        cuchilla3 = req.headers.cuchilla3;
    }

    // SI TODAVÍA NO HAY DATOS, BUSCAR EN QUERY PARAMS
    if (!chipNumber && req.query.chipNumber) {
        console.log('🔍 Buscando datos en query params...');
        chipNumber = req.query.chipNumber;
        tripleDisparoId = req.query.tripleDisparoId;
        cuchilla1 = req.query.cuchilla1;
        cuchilla2 = req.query.cuchilla2;
        cuchilla3 = req.query.cuchilla3;
    }

    console.log('📡 Datos extraídos:', {
        chipNumber,
        tripleDisparoId,
        cuchilla1,
        cuchilla2,
        cuchilla3
    });

    // Validaciones
    if (!chipNumber || chipNumber.toString().trim() === '') {
        console.log('❌ chipNumber faltante o vacío');
        return res.status(400).json({
            success: false,
            error: 'chipNumber es requerido y no puede estar vacío',
            receivedHeaders: req.headers,
            receivedBody: req.body,
            receivedQuery: req.query,
            help: 'Envía los datos como JSON en el body con Content-Type: application/json'
        });
    }

    if (!tripleDisparoId || tripleDisparoId.toString().trim() === '') {
        console.log('❌ tripleDisparoId faltante o vacío');
        return res.status(400).json({
            success: false,
            error: 'tripleDisparoId es requerido. Un chip puede tener múltiples triples disparos.',
            receivedHeaders: req.headers,
            receivedBody: req.body
        });
    }

    try {
        // Limpiar y validar datos
        const cleanChipNumber = chipNumber.toString().trim().toUpperCase();
        const cleanTripleDisparoId = tripleDisparoId.toString().trim();

        // Convertir cuchillas a boolean (manejar strings "0"/"1", "true"/"false")
        const boolCuchilla1 = convertToBoolean(cuchilla1);
        const boolCuchilla2 = convertToBoolean(cuchilla2);
        const boolCuchilla3 = convertToBoolean(cuchilla3);

        console.log('🔍 Buscando dispositivo en BD:', cleanChipNumber);
        console.log(`⚡ Cuchillas convertidas: ${boolCuchilla1}, ${boolCuchilla2}, ${boolCuchilla3}`);

        // Buscar el dispositivo por chipNumber
        const [devices] = await req.db.execute('SELECT * FROM dispositivos WHERE chip_number = ?', [cleanChipNumber]);

        if (devices.length === 0) {
            console.log('❌ Dispositivo no encontrado:', cleanChipNumber);

            // Listar dispositivos disponibles para debugging
            const [allDevices] = await req.db.execute('SELECT chip_number FROM dispositivos');
            const availableDevices = allDevices.map(d => d.chip_number);
            console.log('📋 Dispositivos disponibles:', availableDevices);

            return res.status(404).json({
                success: false,
                error: `Dispositivo con chip ${cleanChipNumber} no encontrado`,
                availableDevices: availableDevices
            });
        }

        const device = devices[0];
        console.log('✅ Dispositivo encontrado:', device.chip_number);

        const status = calculateStatus(boolCuchilla1, boolCuchilla2, boolCuchilla3);

        console.log(`🔄 Procesando triple disparo: ${cleanTripleDisparoId} para chip ${cleanChipNumber}`);
        console.log(`⚡ Estado calculado: ${status} (Cuchillas: ${boolCuchilla1}, ${boolCuchilla2}, ${boolCuchilla3})`);

        // Actualizar last_seen con la hora actual
        await req.db.execute(
            'UPDATE dispositivos SET last_seen = NOW() WHERE id = ?',
            [device.id]
        );
        console.log(`📡 last_seen actualizado para dispositivo ${device.chip_number}`);

        // Verificar si el triple disparo ya existe para este chip
        const [existingTriple] = await req.db.execute(
            'SELECT * FROM triples_disparos WHERE id = ? AND chip_id = ?',
            [cleanTripleDisparoId, device.id]
        );

        const changes = [];

        if (existingTriple.length > 0) {
            const prev = existingTriple[0];
            if (Boolean(prev.cuchilla1) !== boolCuchilla1) {
                changes.push(`Cuchilla 1 ${boolCuchilla1 ? 'cerrada' : 'abierta / disparada ⚠️'}`);
            }
            if (Boolean(prev.cuchilla2) !== boolCuchilla2) {
                changes.push(`Cuchilla 2 ${boolCuchilla2 ? 'cerrada' : 'abierta / disparada ⚠️'}`);
            }
            if (Boolean(prev.cuchilla3) !== boolCuchilla3) {
                changes.push(`Cuchilla 3 ${boolCuchilla3 ? 'cerrada' : 'abierta / disparada ⚠️'}`);
            }

            // Actualizar triple disparo existente
            await req.db.execute(
                'UPDATE triples_disparos SET cuchilla1 = ?, cuchilla2 = ?, cuchilla3 = ?, status = ?, timestamp = NOW() WHERE id = ? AND chip_id = ?',
                [boolCuchilla1, boolCuchilla2, boolCuchilla3, status, cleanTripleDisparoId, device.id]
            );
            console.log(`✏️ Triple disparo actualizado: ${cleanTripleDisparoId} para chip ${cleanChipNumber}`);
        } else {
            // Es un nuevo triple. Registrar estados iniciales que estén abiertos
            if (!boolCuchilla1) changes.push('Cuchilla 1 abierta / disparada ⚠️');
            if (!boolCuchilla2) changes.push('Cuchilla 2 abierta / disparada ⚠️');
            if (!boolCuchilla3) changes.push('Cuchilla 3 abierta / disparada ⚠️');

            // Crear nuevo triple disparo
            await req.db.execute(
                'INSERT INTO triples_disparos (id, chip_id, cuchilla1, cuchilla2, cuchilla3, status) VALUES (?, ?, ?, ?, ?, ?)',
                [cleanTripleDisparoId, device.id, boolCuchilla1, boolCuchilla2, boolCuchilla3, status]
            );
            console.log(`✅ Nuevo triple disparo creado: ${cleanTripleDisparoId} para chip ${cleanChipNumber}`);
        }

        // Si hay cambios individuales, guardarlos en el historial
        if (changes.length > 0) {
            for (let i = 0; i < changes.length; i++) {
                const changeMsg = changes[i];
                const historyId = `H${Date.now()}_${i}_${Math.floor(Math.random()*1000)}`;
                await req.db.execute(
                    'INSERT INTO historial (id, type, triple_id, chip_id, chip_number, subestacion, georeferencia, status, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [historyId, 'triple_updated', cleanTripleDisparoId, device.id, device.chip_number, device.subestacion, device.georeferencia, status, changeMsg]
                );
            }
            console.log(`📝 ${changes.length} transiciones de cuchillas registradas en el historial`);
        } else {
            // Si no hay cambios en cuchillas, registrar evento general
            const historyId = `H${Date.now()}`;
            await req.db.execute(
                'INSERT INTO historial (id, type, triple_id, chip_id, chip_number, subestacion, georeferencia, status, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    historyId,
                    'triple_updated',
                    cleanTripleDisparoId,
                    device.id,
                    device.chip_number,
                    device.subestacion,
                    device.georeferencia,
                    status,
                    `Reporte general de estado - Cuchillas estables`
                ]
            );
            console.log('📝 Registro de estabilidad agregado al historial');
        }

        // Crear notificación en la base de datos (solo si no es estado verde)
        if (status !== 'green') {
            const notificationId = `N${Date.now()}`;
            const notificationMessage = `⚠️ Alerta: ${getStatusText(status)} en ${device.subestacion}`;
            const notificationType = status === 'red' ? 'error' : (status === 'orange' ? 'warning' : 'warning');

            await req.db.execute(
                'INSERT INTO notificaciones (id, message, type, triple_id, chip_id, chip_number, subestacion, georeferencia, `read`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    notificationId,
                    notificationMessage,
                    notificationType,
                    cleanTripleDisparoId,
                    device.id,
                    device.chip_number,
                    device.subestacion,
                    device.georeferencia,
                    false
                ]
            );
            console.log('🔔 Notificación creada en la base de datos');
        }

        // Verificar si hay contactos para notificar por Telegram (solo si no es estado verde)
        if (status !== 'green') {
            console.log('🔔 Estado NO verde detectado, buscando contactos para notificar...');
            console.log(`📊 Estado actual: ${status}`);

            // Obtener todos los contactos con notificaciones activas
            const [allContacts] = await req.db.execute(
                'SELECT * FROM contactos WHERE notifications_whatsapp = TRUE AND telegram_chat_id IS NOT NULL'
            );

            // Filtrar en JavaScript para evitar error de "Illegal mix of collations" en SQL
            const contacts = allContacts.filter(c => {
                const criticalOnly = Boolean(c.notifications_critical_only);
                // Si no es solo críticos, enviar siempre. Si es solo críticos, enviar solo si es orange/red.
                if (!criticalOnly) return true;
                return ['orange', 'red'].includes(status);
            });

            console.log(`📱 ${contacts.length} contactos encontrados para notificar por Telegram`);

            if (contacts.length > 0) {
                console.log('👥 Contactos a notificar:', contacts.map(c => ({ name: c.name, chatId: c.telegram_chat_id })));

                for (const contact of contacts) {
                    try {
                        console.log(`📤 Enviando notificación a ${contact.name} (Chat ID: ${contact.telegram_chat_id})...`);

                        const contactData = {
                            id: contact.id,
                            name: contact.name,
                            phone: contact.phone,
                            telegramChatId: contact.telegram_chat_id
                        };

                        const result = await telegramService.sendAlert(contactData, device, {
                            id: cleanTripleDisparoId,
                            status,
                            cuchilla1: boolCuchilla1,
                            cuchilla2: boolCuchilla2,
                            cuchilla3: boolCuchilla3,
                            timestamp: new Date().toISOString()
                        });

                        console.log(`✅ Notificación Telegram enviada a ${contact.name}:`, result);
                    } catch (error) {
                        console.error(`❌ Error enviando notificación Telegram a ${contact.name}:`, error);
                        console.error('Stack:', error.stack);
                    }
                }
            } else {
                console.log('⚠️ No se encontraron contactos. Verificando razones...');

                // Debug: verificar cuántos contactos hay en total
                const [allContactsDebug] = await req.db.execute('SELECT id, name, notifications_whatsapp, telegram_chat_id, notifications_critical_only FROM contactos');
                console.log('📋 Total de contactos en BD:', allContactsDebug.length);
                console.log('📋 Detalles de contactos:', allContactsDebug.map(c => ({
                    name: c.name,
                    notificationsEnabled: c.notifications_whatsapp,
                    hasChatId: c.telegram_chat_id !== null,
                    chatId: c.telegram_chat_id,
                    criticalOnly: c.notifications_critical_only
                })));
            }
        } else {
            console.log('✅ Estado verde - No se envían notificaciones');
        }

        // Obtener todos los triples disparos de este chip para la respuesta
        const [chipTriples] = await req.db.execute(
            'SELECT * FROM triples_disparos WHERE chip_id = ? ORDER BY created_at DESC',
            [device.id]
        );

        const response = {
            success: true,
            message: 'Datos procesados correctamente',
            data: {
                chipNumber: device.chip_number,
                chipId: device.id,
                tripleDisparoId: cleanTripleDisparoId,
                status: status,
                cuchilla1: boolCuchilla1,
                cuchilla2: boolCuchilla2,
                cuchilla3: boolCuchilla3,
                totalTriplesForChip: chipTriples.length,
                subestacion: device.subestacion,
                georeferencia: device.georeferencia
            },
            chipTriples: chipTriples.map(t => ({
                id: t.id,
                status: t.status,
                cuchilla1: Boolean(t.cuchilla1),
                cuchilla2: Boolean(t.cuchilla2),
                cuchilla3: Boolean(t.cuchilla3),
                timestamp: t.timestamp
            }))
        };

        console.log('✅ Respuesta enviada:', response);
        res.json(response);

    } catch (error) {
        console.error('❌ Error en /sensor-data:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Error interno del servidor',
            receivedHeaders: req.headers,
            receivedBody: req.body
        });
    }
});

// Función para convertir diferentes formatos a boolean
function convertToBoolean(value) {
    if (value === undefined || value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const str = value.toLowerCase().trim();
        if (str === 'true' || str === '1' || str === 'yes' || str === 'on') return true;
        if (str === 'false' || str === '0' || str === 'no' || str === 'off') return false;
    }
    return Boolean(value);
}

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

// Endpoint de Ping para ESP32
router.all('/ping', async (req, res) => {
    console.log('🔄 Iniciando procesamiento de ping');
    console.log('📨 Headers recibidos:', req.headers);
    console.log('📦 Body recibido:', req.body);
    console.log('❓ Query recibido:', req.query);

    let chipNumber;

    // Buscar en body, headers o query params
    if (req.body && (req.body.chipNumber || req.body.chipnumber)) {
        chipNumber = req.body.chipNumber || req.body.chipnumber;
    } else if (req.headers.chipnumber) {
        chipNumber = req.headers.chipnumber;
    } else if (req.query.chipNumber || req.query.chipnumber) {
        chipNumber = req.query.chipNumber || req.query.chipnumber;
    }

    if (!chipNumber || chipNumber.toString().trim() === '') {
        console.log('❌ chipNumber faltante en ping');
        return res.status(400).json({
            success: false,
            error: 'chipNumber es requerido para el ping'
        });
    }

    try {
        const cleanChipNumber = chipNumber.toString().trim().toUpperCase();
        console.log('🔍 Buscando dispositivo para ping:', cleanChipNumber);

        // Actualizar last_seen con la hora actual
        const [result] = await req.db.execute(
            'UPDATE dispositivos SET last_seen = NOW() WHERE chip_number = ?',
            [cleanChipNumber]
        );

        if (result.affectedRows === 0) {
            console.log('❌ Dispositivo no encontrado para ping:', cleanChipNumber);
            return res.status(404).json({
                success: false,
                error: `Dispositivo con chip ${cleanChipNumber} no encontrado`
            });
        }

        console.log(`✅ Ping exitoso para dispositivo: ${cleanChipNumber}`);
        res.json({
            success: true,
            message: `Ping recibido y registrado correctamente para ${cleanChipNumber}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error en /ping:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;