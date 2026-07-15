const fs = require('fs');
const path = require('path');

// Carpeta para almacenar datos
const dataDir = path.resolve('./data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// Función para leer/escribir JSON en archivos
const readJSON = (filename) => {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeJSON = (filename, data) => {
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// ======= VARIABLES SIMULADAS =======
let mockDevices = readJSON('devices.json');
let mockTripleDisparos = readJSON('triples.json');
let mockHistory = readJSON('history.json');
let mockContacts = readJSON('contacts.json');
let mockNotifications = readJSON('notifications.json');

// Función para guardar en archivos
const saveToStorage = () => {
    writeJSON('devices.json', mockDevices);
    writeJSON('triples.json', mockTripleDisparos);
    writeJSON('history.json', mockHistory);
    writeJSON('contacts.json', mockContacts);
    writeJSON('notifications.json', mockNotifications);
};

const calculateStatus = (c1, c2, c3) => {
    const activeCount = [c1, c2, c3].filter(Boolean).length;
    if (activeCount === 3) return 'green';
    if (activeCount === 2) return 'yellow';
    if (activeCount === 1) return 'orange';
    return 'red';
};

const getStatusText = (status) => {
    const texts = {
        green: '3 Cuchillas Activas',
        yellow: '2 Cuchillas Activas',
        orange: '1 Cuchilla Activa',
        red: '0 Cuchillas Activas'
    };
    return texts[status] || status;
};

// Callbacks para actualizaciones en tiempo real
let onTripleUpdateCallbacks = [];
let onNotificationCallbacks = [];

// ======= API COMPLETA =======
const api = {
    // ========== DISPOSITIVOS ==========
    getDevices: () => Promise.resolve(mockDevices),

    addDevice: async (device) => {
        const exists = mockDevices.some(d => d.id === device.id || d.chipNumber === device.chipNumber);
        if (exists) throw new Error('El dispositivo ya existe');
        mockDevices.push(device);
        saveToStorage();
        return device;
    },

    getDeviceByChipNumber: async (chipNumber) => {
        const device = mockDevices.find(d => d.chipNumber === chipNumber);
        if (!device) throw new Error(`Dispositivo con chip ${chipNumber} no encontrado`);
        return device;
    },

    deleteDevice: async (deviceId) => {
        const device = mockDevices.find(d => d.id === deviceId);
        mockDevices = mockDevices.filter(d => d.id !== deviceId);
        mockTripleDisparos = mockTripleDisparos.filter(td => td.chipId !== deviceId);
        mockNotifications = mockNotifications.filter(n => n.chipId !== deviceId);
        saveToStorage();

        if (device) {
            mockHistory.push({
                id: `H${Date.now()}`,
                type: 'device_deleted',
                deviceId,
                chipNumber: device.chipNumber,
                subestacion: device.subestacion,
                timestamp: new Date().toISOString(),
                message: `Dispositivo ${device.chipNumber} eliminado de ${device.subestacion}`
            });
            saveToStorage();
        }

        console.log('🗑️ Dispositivo eliminado:', deviceId);
        return Promise.resolve();
    },

    // ========== TRIPLES DISPAROS ==========
    getTripleDisparos: () => Promise.resolve(mockTripleDisparos),

    addTripleDisparo: async (triple) => {
        const existingIndex = mockTripleDisparos.findIndex(td => td.id === triple.id);
        const device = mockDevices.find(d => d.id === triple.chipId);

        if (existingIndex !== -1) {
            mockTripleDisparos[existingIndex] = triple;
            console.log('🔄 Triple disparo actualizado:', triple.id);
        } else {
            mockTripleDisparos.push(triple);
            console.log('✅ Triple disparo creado:', triple.id);
        }

        saveToStorage();

        // Agregar al historial
        const historyItem = {
            id: `H${Date.now()}`,
            type: existingIndex !== -1 ? 'triple_updated' : 'triple_created',
            tripleId: triple.id,
            chipId: triple.chipId,
            chipNumber: device?.chipNumber,
            subestacion: device?.subestacion,
            status: triple.status,
            timestamp: triple.timestamp,
            message: `Triple disparo ${triple.id} - Estado: ${getStatusText(triple.status)}`
        };
        mockHistory.push(historyItem);
        saveToStorage();

        // Ejecutar callbacks
        onTripleUpdateCallbacks.forEach(cb => cb(triple));

        return triple;
    },

    deleteTripleDisparo: async (tripleId) => {
        const triple = mockTripleDisparos.find(td => td.id === tripleId);
        mockTripleDisparos = mockTripleDisparos.filter(td => td.id !== tripleId);
        mockNotifications = mockNotifications.filter(n => n.tripleId !== tripleId);
        saveToStorage();

        if (triple) {
            const device = mockDevices.find(d => d.id === triple.chipId);
            mockHistory.push({
                id: `H${Date.now()}`,
                type: 'triple_deleted',
                tripleId,
                chipId: triple.chipId,
                chipNumber: device?.chipNumber,
                subestacion: device?.subestacion,
                timestamp: new Date().toISOString(),
                message: `Triple disparo ${tripleId} eliminado`
            });
            saveToStorage();
        }

        return Promise.resolve();
    },

    // ========== CONTACTOS ==========
    getContacts: () => Promise.resolve(mockContacts),

    addContact: async (contact) => {
        mockContacts.push(contact);
        saveToStorage();
        return contact;
    },

    deleteContact: async (contactId) => {
        mockContacts = mockContacts.filter(c => c.id !== contactId);
        saveToStorage();
        return Promise.resolve();
    },

    // ========== HISTORIAL ==========
    getHistory: () => Promise.resolve(mockHistory),

    // ========== NOTIFICACIONES ==========
    getNotifications: () => Promise.resolve(mockNotifications),

    addNotification: async (notification) => {
        mockNotifications.push(notification);
        saveToStorage();
        onNotificationCallbacks.forEach(cb => cb(notification));
        return Promise.resolve(notification);
    },

    markNotificationAsRead: async (notificationId) => {
        const notification = mockNotifications.find(n => n.id === notificationId);
        if (notification) notification.read = true;
        saveToStorage();
        return Promise.resolve();
    },

    deleteNotification: async (notificationId) => {
        mockNotifications = mockNotifications.filter(n => n.id !== notificationId);
        saveToStorage();
        return Promise.resolve();
    },

    // ========== CALLBACKS ==========
    onTripleUpdate: (cb) => onTripleUpdateCallbacks.push(cb),
    onNotification: (cb) => onNotificationCallbacks.push(cb),

    // ========== UTILIDADES ==========
    clearAllData: async () => {
        mockDevices = [];
        mockTripleDisparos = [];
        mockHistory = [];
        mockContacts = [];
        mockNotifications = [];
        saveToStorage();
        return Promise.resolve();
    },

    // ========== DATOS DE EJEMPLO ==========
    initializeSampleData: async () => {
        mockDevices = [
            { id: 'CHIP1', chipNumber: 'CHIP001', subestacion: 'Subestación Norte', georeferencia: '19.432608, -99.133209', timestamp: new Date().toISOString() },
            { id: 'CHIP2', chipNumber: 'CHIP002', subestacion: 'Subestación Sur', georeferencia: '19.428471, -99.127631', timestamp: new Date().toISOString() },
            { id: 'CHIP3', chipNumber: 'CHIP003', subestacion: 'Subestación Centro', georeferencia: '19.436100, -99.139300', timestamp: new Date().toISOString() }
        ];

        mockContacts = [
            { id: 'C1', name: 'Daniel Villegas', phone: '+5219984110091', email: 'da.villegas1005@.com', role: 'Supervisor', notifications: { whatsapp: true, email: true, criticalOnly: false }, createdAt: new Date().toISOString() },
            { id: 'C2', name: 'María García', phone: '+5215598765432', email: 'maria@empresa.com', role: 'Técnico', notifications: { whatsapp: true, email: false, criticalOnly: true }, createdAt: new Date().toISOString() }
        ];

        saveToStorage();

        const sampleTriples = [
            { id: 'TD1', chipId: 'CHIP1', cuchilla1: true, cuchilla2: true, cuchilla3: true, status: 'green', timestamp: new Date().toISOString() },
            { id: 'TD2', chipId: 'CHIP2', cuchilla1: true, cuchilla2: false, cuchilla3: true, status: 'yellow', timestamp: new Date().toISOString() },
            { id: 'TD3', chipId: 'CHIP3', cuchilla1: false, cuchilla2: false, cuchilla3: true, status: 'orange', timestamp: new Date().toISOString() }
        ];

        for (const triple of sampleTriples) {
            await api.addTripleDisparo(triple);
        }

        console.log('✅ Datos de ejemplo inicializados');
    }
};

// ======= FUNCIONES DE SIMULACIÓN ESP32 =======
const simulateESP32Data = async (chipNumber, tripleDisparoId, sensorData) => {
    console.log('🔍 Buscando dispositivo:', chipNumber);
    console.log('📋 Dispositivos disponibles:', mockDevices.map(d => d.chipNumber));

    const device = mockDevices.find(d => d.chipNumber === chipNumber);
    if (!device) {
        throw new Error(`Dispositivo con chip ${chipNumber} no encontrado. Disponibles: ${mockDevices.map(d => d.chipNumber).join(', ')}`);
    }

    const status = calculateStatus(sensorData.cuchilla1, sensorData.cuchilla2, sensorData.cuchilla3);

    const tripleDisparo = {
        id: tripleDisparoId || `TD${Date.now()}`,
        chipId: device.id,
        chipNumber: device.chipNumber,
        cuchilla1: sensorData.cuchilla1,
        cuchilla2: sensorData.cuchilla2,
        cuchilla3: sensorData.cuchilla3,
        status: status,
        timestamp: new Date().toISOString()
    };

    console.log('📊 Creando/actualizando triple disparo:', tripleDisparo);

    await api.addTripleDisparo(tripleDisparo);

    return tripleDisparo;
};

// ======= FUNCIÓN PRINCIPAL PARA ESP32 =======
const receiveESP32Data = async (chipNumber, tripleDisparoId, sensorData) => {
    try {
        console.log('📡 Procesando datos del ESP32...');
        console.log('🔧 Datos recibidos:', { chipNumber, tripleDisparoId, sensorData });

        // 1. Procesar los datos y crear/actualizar triple disparo
        const result = await simulateESP32Data(chipNumber, tripleDisparoId, sensorData);

        console.log('✅ Triple disparo procesado:', result.id);

        // 2. Verificar si hay contactos para notificar (solo si no es estado verde)
        if (result.status !== 'green') {
            const contactsToNotify = mockContacts.filter(contact =>
                contact.notifications?.whatsapp &&
                (!contact.notifications?.criticalOnly ||
                    result.status === 'orange' || result.status === 'red')
            );

            console.log(`📱 ${contactsToNotify.length} contactos para notificar`);

            // 3. Enviar notificaciones si hay contactos
            if (contactsToNotify.length > 0) {
                const whatsappService = require('./whatsappService');
                const device = mockDevices.find(d => d.chipNumber === chipNumber);

                for (const contact of contactsToNotify) {
                    try {
                        await whatsappService.sendAlert(contact, device, result);
                        console.log(`✅ Notificación enviada a ${contact.name}`);
                    } catch (error) {
                        console.error(`❌ Error enviando notificación a ${contact.name}:`, error);
                    }
                }
            }
        }

        return {
            success: true,
            tripleDisparoId: result.id,
            status: result.status,
            message: 'Datos procesados correctamente'
        };

    } catch (error) {
        console.error('❌ Error en receiveESP32Data:', error);
        throw error;
    }
};

// ✅ EXPORTA CORRECTAMENTE
module.exports = {
    api,
    receiveESP32Data,
    simulateESP32Data
};