require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const esp32Routes = require('./routes/esp32Routes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const devicesRoutes = require('./routes/devicesRoutes');
const triplesRoutes = require('./routes/triplesRoutes');
const contactsRoutes = require('./routes/contactsRoutes');
const historyRoutes = require('./routes/historyRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Logging de requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'tripledisparo',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Crear pool de conexiones a la base de datos
const pool = mysql.createPool(dbConfig);

// Middleware para inyectar la base de datos
app.use((req, res, next) => {
    req.db = pool;
    next();
});

// Rutas
app.use('/api/esp32', esp32Routes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/triples', triplesRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/notifications', notificationsRoutes);

// Ruta de salud (Keep-Alive)
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Sistema de Monitoreo Triples Disparos',
        timestamp: new Date().toISOString(),
        database: 'MySQL'
    });
});

// Ruta para obtener estadísticas
app.get('/api/stats', async (req, res) => {
    try {
        const [devices] = await req.db.execute('SELECT COUNT(*) as total FROM dispositivos');
        const [triples] = await req.db.execute('SELECT COUNT(*) as total FROM triples_disparos');
        const [critical] = await req.db.execute('SELECT COUNT(*) as total FROM triples_disparos WHERE status IN ("red", "orange")');

        res.json({
            totalDevices: devices[0].total,
            totalTriples: triples[0].total,
            criticalTriples: critical[0].total
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

// KEEP-ALIVE SYSTEM
// Render duerme los servicios gratuitos tras 15 min de inactividad.
// Este intervalo hace una petición a sí mismo cada 10 min para mantenerlo despierto.
const https = require('https');
const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutos

function keepAlive() {
    const backendUrl = process.env.VITE_BACKEND_URL || 'https://cfe-production.up.railway.app';

    // Solo activar si estamos en producción (URL remota)
    if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
        console.log('ℹ️ Keep-Alive desactivado en localhost');
        return;
    }

    https.get(`${backendUrl}/health`, (resp) => {
        if (resp.statusCode === 200) {
            console.log(`💓 Keep-Alive Ping exitoso: ${new Date().toISOString()}`);
        } else {
            console.warn(`⚠️ Keep-Alive Ping falló con código: ${resp.statusCode}`);
        }
    }).on("error", (err) => {
        console.error("❌ Error en Keep-Alive:", err.message);
    });
}

// Iniciar el intervalo
setInterval(keepAlive, KEEP_ALIVE_INTERVAL);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en puerto ${PORT}`);
    console.log(`📊 Base de datos: MySQL`);

    // Ejecutar un ping inicial tras 10 segundos
    setTimeout(keepAlive, 10000);
});