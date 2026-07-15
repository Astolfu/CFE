const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Función para hacer requests al backend
const apiRequest = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error en API request ${endpoint}:`, error);
        throw error;
    }
};

export const api = {
    // ========== DISPOSITIVOS ==========
    getDevices: () => apiRequest('/api/devices'),

    addDevice: async (device) => {
        const response = await apiRequest('/api/devices', {
            method: 'POST',
            body: JSON.stringify(device),
        });
        return response.device;
    },

    deleteDevice: async (deviceId) => {
        await apiRequest(`/api/devices/${deviceId}`, {
            method: 'DELETE',
        });
    },

    // ========== TRIPLES DISPAROS ==========
    getTripleDisparos: () => apiRequest('/api/triples'),

    addTripleDisparo: async (triple) => {
        const response = await apiRequest('/api/triples', {
            method: 'POST',
            body: JSON.stringify(triple),
        });
        return response.triple;
    },

    deleteTripleDisparo: async (tripleId) => {
        await apiRequest(`/api/triples/${tripleId}`, {
            method: 'DELETE',
        });
    },

    // ========== CONTACTOS ==========
    getContacts: () => apiRequest('/api/contacts'),

    addContact: async (contact) => {
        const response = await apiRequest('/api/contacts', {
            method: 'POST',
            body: JSON.stringify(contact),
        });
        return response.contact;
    },

    deleteContact: async (contactId) => {
        await apiRequest(`/api/contacts/${contactId}`, {
            method: 'DELETE',
        });
    },

    // ========== WHATSAPP / TELEGRAM ==========
    testWhatsApp: async (contactData) => {
        const response = await apiRequest('/api/whatsapp/send-test', {
            method: 'POST',
            body: JSON.stringify(contactData),
        });
        return response.success;
    },

    testTelegram: async (contactData) => {
        const response = await apiRequest('/api/whatsapp/send-test', {
            method: 'POST',
            body: JSON.stringify(contactData),
        });
        return response.success;
    },

    sendAlert: async (tripleId) => {
        const response = await apiRequest('/api/whatsapp/send-alert', {
            method: 'POST',
            body: JSON.stringify({ tripleId }),
        });
        return response;
    },

    // ========== ESTADÍSTICAS ==========
    getStats: () => apiRequest('/api/stats'),

    // ========== HISTORIAL ==========
    getHistory: async (filters = {}) => {
        const queryParams = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) queryParams.append(key, filters[key]);
        });

        const queryString = queryParams.toString();
        return apiRequest(`/api/history${queryString ? `?${queryString}` : ''}`);
    },

    // ========== NOTIFICACIONES ==========
    getNotifications: () => apiRequest('/api/notifications'),

    markNotificationAsRead: async (notificationId) => {
        await apiRequest(`/api/notifications/${notificationId}/read`, {
            method: 'PUT',
        });
    },

    // ========== SIMULACIÓN ESP32 ==========
    simulateESP32Data: async (chipNumber, tripleDisparoId, sensorData) => {
        const response = await apiRequest('/api/esp32/sensor-data', {
            method: 'POST',
            body: JSON.stringify({
                chipNumber,
                tripleDisparoId,
                cuchilla1: sensorData.cuchilla1,
                cuchilla2: sensorData.cuchilla2,
                cuchilla3: sensorData.cuchilla3,
            }),
        });
        return response;
    },

    // ========== SALUD DEL SISTEMA ==========
    healthCheck: () => apiRequest('/health'),
};

// Función auxiliar para calcular estado (solo para UI)
export const calculateStatus = (c1, c2, c3) => {
    const activeCount = [c1, c2, c3].filter(Boolean).length;
    if (activeCount === 3) return 'green';
    if (activeCount === 2) return 'yellow';
    if (activeCount === 1) return 'orange';
    return 'red';
};

export const getStatusText = (status) => {
    const texts = {
        green: '3 Cuchillas Activas',
        yellow: '2 Cuchillas Activas',
        orange: '1 Cuchilla Activa',
        red: '0 Cuchillas Activas'
    };
    return texts[status] || status;
};