const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegramService');

// ✅ Ruta para enviar mensaje de prueba
router.post('/send-test', async (req, res) => {
    try {
        console.log('📨 Request recibido en /send-test:', req.body);

        const { contactId, name, phone, telegramChatId } = req.body;

        // ✅ BUSCAR contacto en la base de datos si se proporciona contactId
        let contact;
        if (contactId) {
            console.log('🔍 Buscando contacto en BD:', contactId);
            try {
                const [contacts] = await req.db.execute('SELECT * FROM contactos WHERE id = ?', [contactId]);
                if (contacts.length > 0) {
                    contact = {
                        id: contacts[0].id,
                        name: contacts[0].name,
                        phone: contacts[0].phone,
                        telegramChatId: contacts[0].telegram_chat_id
                    };
                    console.log('✅ Contacto encontrado en BD:', contact.name);
                }
            } catch (dbError) {
                console.error('❌ Error consultando BD:', dbError.message);
            }
        }

        // ✅ Si no se encontró en BD, usar los datos proporcionados
        if (!contact) {
            contact = {
                id: contactId || 'temp-id',
                name: name || 'Usuario',
                phone: phone,
                telegramChatId: telegramChatId
            };
            console.log('📝 Usando contacto proporcionado:', contact.name);
        }

        console.log('📱 Contacto a enviar:', contact);

        // ✅ ENVIAR mensaje de Telegram
        const result = await telegramService.sendTestMessage(contact);

        if (result.success) {
            res.json({
                success: true,
                message: result.simulated ?
                    'Simulación exitosa (Telegram no configurado)' :
                    'Mensaje de prueba enviado correctamente',
                messageId: result.messageId,
                simulated: result.simulated,
                contact: {
                    name: contact.name,
                    phone: contact.phone
                }
            });
        } else {
            console.error('❌ Error del servicio Telegram:', result.error);
            res.status(500).json({
                success: false,
                error: result.error || 'Error enviando mensaje'
            });
        }

    } catch (error) {
        console.error('❌ Error CRÍTICO en send-test:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor: ' + error.message,
            details: error.stack
        });
    }
});

// ✅ Ruta para enviar alerta manual
router.post('/send-alert', async (req, res) => {
    try {
        const { tripleId } = req.body;

        if (!tripleId) {
            return res.status(400).json({
                success: false,
                error: 'tripleId es requerido'
            });
        }

        // Obtener información del triple disparo
        const [triples] = await req.db.execute(`
            SELECT td.*, d.chip_number, d.subestacion, d.georeferencia 
            FROM triples_disparos td 
            LEFT JOIN dispositivos d ON td.chip_id = d.id 
            WHERE td.id = ?
        `, [tripleId]);

        if (triples.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Triple disparo no encontrado'
            });
        }

        const triple = triples[0];
        const device = {
            id: triple.chip_id,
            chipNumber: triple.chip_number,
            subestacion: triple.subestacion,
            georeferencia: triple.georeferencia
        };

        // Obtener contactos para notificar
        const [contacts] = await req.db.execute(
            'SELECT * FROM contactos WHERE notifications_whatsapp = TRUE AND telegram_chat_id IS NOT NULL AND (notifications_critical_only = FALSE OR ? IN ("orange", "red"))',
            [triple.status]
        );

        console.log(`📱 Enviando alerta a ${contacts.length} contactos`);

        let sentCount = 0;
        let errors = [];

        for (const contact of contacts) {
            try {
                const contactData = {
                    id: contact.id,
                    name: contact.name,
                    phone: contact.phone,
                    telegramChatId: contact.telegram_chat_id
                };

                await telegramService.sendAlert(contactData, device, {
                    id: triple.id,
                    status: triple.status,
                    cuchilla1: triple.cuchilla1,
                    cuchilla2: triple.cuchilla2,
                    cuchilla3: triple.cuchilla3,
                    timestamp: triple.timestamp
                });
                sentCount++;
                console.log(`✅ Alerta enviada a ${contact.name}`);
            } catch (error) {
                console.error(`❌ Error enviando alerta a ${contact.name}:`, error);
                errors.push(`${contact.name}: ${error.message}`);
            }
        }

        res.json({
            success: true,
            message: `Alertas enviadas: ${sentCount} exitosas, ${errors.length} fallidas`,
            sentCount,
            errorCount: errors.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('❌ Error enviando alerta:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor: ' + error.message
        });
    }
});

// ✅ Ruta para verificar configuración
router.get('/config', (req, res) => {
    res.json({
        success: true,
        configured: telegramService.isConfigured,
        message: 'Ruta Telegram funcionando correctamente'
    });
});

module.exports = router;