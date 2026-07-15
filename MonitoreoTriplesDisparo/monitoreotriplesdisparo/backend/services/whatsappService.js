const dotenv = require('dotenv');
dotenv.config();

class WhatsAppService {
    constructor() {
        this.isConfigured = false;
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.whatsappFrom = process.env.WHATSAPP_FROM_NUMBER;
        this.configure();
    }

    configure() {
        if (this.accountSid && this.authToken && this.whatsappFrom) {
            this.isConfigured = true;
            console.log('✅ WhatsApp Service configurado con Twilio');
            console.log('📞 Número de WhatsApp:', this.whatsappFrom);
        } else {
            console.warn('⚠️ Configuración de WhatsApp incompleta - Modo simulación activado');
        }
    }

    async sendTestMessage(contact) {
        console.log('📱 Intentando enviar WhatsApp a:', contact);

        if (!this.isConfigured) {
            console.log('📱 SIMULACIÓN WhatsApp (no configurado)');
            return {
                success: true,
                simulated: true,
                message: 'WhatsApp simulado - Servicio no configurado'
            };
        }

        // Validar que el contacto tenga los datos necesarios
        if (!contact || !contact.phone) {
            console.error('❌ Contacto inválido:', contact);
            return {
                success: false,
                error: 'Contacto inválido: falta número de teléfono'
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
            const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
            const formattedPhone = this.formatPhoneNumber(contact.phone);

            console.log(`📤 Enviando a: ${formattedPhone}`);

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`
                },
                body: new URLSearchParams({
                    From: `whatsapp:${this.whatsappFrom}`,
                    To: `whatsapp:${formattedPhone}`,
                    Body: testMessage
                })
            });

            const result = await response.json();

            if (response.ok) {
                console.log(`✅ WhatsApp enviado a ${contact.name || 'Usuario'}:`, result.sid);
                return {
                    success: true,
                    messageId: result.sid,
                    message: 'Mensaje enviado correctamente'
                };
            } else {
                console.error('❌ Error de Twilio:', result);
                return {
                    success: false,
                    error: result.message || 'Error enviando mensaje',
                    code: result.code
                };
            }
        } catch (error) {
            console.error('❌ Error en WhatsApp Service:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendAlert(contact, device, tripleDisparo) {
        console.log('🚨 Enviando alerta WhatsApp:', {
            contact: contact.name,
            device: device,
            tripleDisparo: tripleDisparo
        });

        if (!this.isConfigured) {
            console.log('📱 SIMULACIÓN Alerta WhatsApp');
            return {
                success: true,
                simulated: true,
                message: 'Alerta simulada - Servicio no configurado'
            };
        }

        // Validar datos del contacto
        if (!contact || !contact.phone) {
            console.error('❌ Contacto inválido para alerta:', contact);
            return {
                success: false,
                error: 'Contacto inválido: falta número de teléfono'
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

        const alertMessage = `${status.icon} *${status.urgency}*

🔧 *ALERTA - TRIPLE DISPARO*

📱 *Dispositivo:* ${deviceChipNumber}
🏭 *Subestación:* ${deviceSubestacion}
📍 *Ubicación:* ${deviceGeoreferencia}

⚡ *Triple Disparo:* ${tripleDisparo.id || 'N/A'}
📊 *Estado:* ${status.text}
🔢 *Cuchillas Activas:* ${activeCount}/3
⏰ *Hora:* ${new Date(tripleDisparo.timestamp || new Date()).toLocaleString('es-MX')}

🚀 *ACCIÓN REQUERIDA:*
Monitorear situación inmediatamente

---
*Sistema de Monitoreo Automático*`;

        try {
            const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
            const formattedPhone = this.formatPhoneNumber(contact.phone);

            console.log(`📤 Enviando alerta a: ${formattedPhone}`);

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`
                },
                body: new URLSearchParams({
                    From: `whatsapp:${this.whatsappFrom}`,
                    To: `whatsapp:${formattedPhone}`,
                    Body: alertMessage
                })
            });

            const result = await response.json();

            if (response.ok) {
                console.log(`✅ Alerta enviada a ${contact.name}`);
                return {
                    success: true,
                    messageId: result.sid,
                    message: 'Alerta enviada correctamente'
                };
            } else {
                console.error('❌ Error enviando alerta:', result);
                return {
                    success: false,
                    error: result.message || 'Error enviando alerta'
                };
            }
        } catch (error) {
            console.error('❌ Error en alerta WhatsApp:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    formatPhoneNumber(phone) {
        if (!phone) {
            console.error('❌ Número de teléfono vacío');
            return '';
        }

        let formatted = phone.toString().replace(/\s+/g, '').replace(/\+/g, '').trim();

        // Asegurar formato internacional para México
        if (!formatted.startsWith('52') && formatted.length === 10) {
            formatted = '52' + formatted;
        }

        return formatted;
    }
}

module.exports = new WhatsAppService();