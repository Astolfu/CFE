const dotenv = require('dotenv');
dotenv.config();

class TelegramService {
    constructor() {
        this.isConfigured = false;
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.configure();
    }

    configure() {
        if (this.botToken) {
            this.isConfigured = true;
            console.log('✅ Telegram Service configurado');
            console.log('🤖 Bot Token:', this.botToken.substring(0, 10) + '...');
        } else {
            console.warn('⚠️ Configuración de Telegram incompleta - Modo simulación activado');
        }
    }

    async sendTestMessage(contact) {
        console.log('📱 Intentando enviar mensaje de Telegram a:', contact);

        if (!this.isConfigured) {
            console.log('📱 SIMULACIÓN Telegram (no configurado)');
            return {
                success: true,
                simulated: true,
                message: 'Telegram simulado - Servicio no configurado'
            };
        }

        // Validar que el contacto tenga chatId
        if (!contact || !contact.telegramChatId) {
            console.error('❌ Contacto sin Chat ID de Telegram:', contact);
            return {
                success: false,
                error: 'Contacto inválido: falta Chat ID de Telegram'
            };
        }

        const testMessage = `🧪 *PRUEBA DEL SISTEMA DE MONITOREO*

Hola ${contact.name || 'Usuario'},

Este es un mensaje de prueba para verificar la conectividad del sistema de monitoreo de triples disparos.

✅ Estado del Sistema: OPERATIVO
📅 Fecha: ${new Date().toLocaleString('es-MX')}

---
*Sistema de Monitoreo Automático*`;

        try {
            const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: contact.telegramChatId,
                    text: testMessage,
                    parse_mode: 'Markdown'
                })
            });

            const result = await response.json();

            if (result.ok) {
                console.log(`✅ Mensaje de Telegram enviado a ${contact.name || 'Usuario'}`);
                return {
                    success: true,
                    messageId: result.result.message_id,
                    message: 'Mensaje enviado correctamente'
                };
            } else {
                console.error('❌ Error de Telegram:', result);
                return {
                    success: false,
                    error: result.description || 'Error enviando mensaje',
                    code: result.error_code
                };
            }
        } catch (error) {
            console.error('❌ Error en Telegram Service:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendAlert(contact, device, tripleDisparo) {
        console.log('🚨 Enviando alerta Telegram:', {
            contact: contact.name,
            device: device,
            tripleDisparo: tripleDisparo
        });

        if (!this.isConfigured) {
            console.log('📱 SIMULACIÓN Alerta Telegram');
            return {
                success: true,
                simulated: true,
                message: 'Alerta simulada - Servicio no configurado'
            };
        }

        // Validar datos del contacto
        if (!contact || !contact.telegramChatId) {
            console.error('❌ Contacto sin Chat ID de Telegram para alerta:', contact);
            return {
                success: false,
                error: 'Contacto inválido: falta Chat ID de Telegram'
            };
        }

        const statusInfo = {
            green: { icon: '🟢', text: 'NORMAL - 3 Cuchillas Activas', urgency: 'INFORMATIVO' },
            yellow: { icon: '🟡', text: 'ADVERTENCIA - 2 Cuchillas Activas', urgency: 'ATENCIÓN REQUERIDA' },
            orange: { icon: '🟠', text: 'ALERTA - 1 Cuchilla Activa', urgency: 'ALTA PRIORIDAD' },
            red: { icon: '🔴', text: 'CRÍTICO - 0 Cuchillas Activas', urgency: 'URGENCIA MÁXIMA' }
        };

        const status = statusInfo[tripleDisparo.status] || statusInfo.red;
        const activeCount = [tripleDisparo.cuchilla1, tripleDisparo.cuchilla2, tripleDisparo.cuchilla3].filter(Boolean).length;

        // Asegurar que los datos del dispositivo no sean undefined
        const deviceChipNumber = device?.chipNumber || device?.chip_number || 'N/A';
        const deviceSubestacion = device?.subestacion || 'N/A';
        const deviceGeoreferencia = device?.georeferencia || 'N/A';

        // URL del sistema web (ajusta según tu dominio en producción)
        const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:5173';
        const deviceLink = `${webAppUrl}/?device=${encodeURIComponent(deviceChipNumber)}&triple=${encodeURIComponent(tripleDisparo.id || '')}`;

        // Telegram no acepta URLs localhost en botones inline
        const isProduction = webAppUrl && !webAppUrl.includes('localhost');

        // Usar HTML en lugar de Markdown para evitar problemas con caracteres especiales
        const alertMessage = `${status.icon} <b>${status.urgency}</b>

🔧 <b>ALERTA - TRIPLE DISPARO</b>

📱 <b>Dispositivo:</b> ${deviceChipNumber}
🏭 <b>Subestación:</b> ${deviceSubestacion}
📍 <b>Ubicación:</b> ${deviceGeoreferencia}

⚡ <b>Triple Disparo:</b> ${tripleDisparo.id || 'N/A'}
📊 <b>Estado:</b> ${status.text}
🔢 <b>Cuchillas Activas:</b> ${activeCount}/3
⏰ <b>Hora:</b> ${new Date(tripleDisparo.timestamp || new Date()).toLocaleString('es-MX')}

🚀 <b>ACCIÓN REQUERIDA:</b>
Monitorear situación inmediatamente

---
<b>Sistema de Monitoreo Automático</b>`;

        // Preparar el payload base
        const messagePayload = {
            chat_id: contact.telegramChatId,
            text: alertMessage,
            parse_mode: 'HTML'
        };

        // Solo agregar botón inline si es producción (no localhost)
        if (isProduction) {
            messagePayload.reply_markup = {
                inline_keyboard: [[
                    {
                        text: '🗺️ Ver en Mapa',
                        url: deviceLink
                    }
                ]]
            };
        }

        try {
            const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messagePayload)
            });

            const result = await response.json();

            if (result.ok) {
                console.log(`✅ Alerta de Telegram enviada a ${contact.name}`);
                return {
                    success: true,
                    messageId: result.result.message_id,
                    message: 'Alerta enviada correctamente'
                };
            } else {
                console.error('❌ Error enviando alerta Telegram:', result);
                return {
                    success: false,
                    error: result.description || 'Error enviando alerta'
                };
            }
        } catch (error) {
            console.error('❌ Error en alerta Telegram:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new TelegramService();
