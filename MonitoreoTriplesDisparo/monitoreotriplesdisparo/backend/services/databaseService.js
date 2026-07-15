const mysql = require('mysql2/promise');

class DatabaseService {
    constructor() {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
            multipleStatements: true
        };
    }

    async initializeDatabase() {
        try {
            const dbName = process.env.DB_NAME || 'monitoreo_triples_disparos';
            // Conectar sin especificar base de datos para crearla
            const connection = await mysql.createConnection(this.config);

            console.log('🔌 Inicializando base de datos...');

            // Crear base de datos si no existe
            await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
            console.log('✅ Base de datos verificada/creada');

            // Usar la base de datos
            await connection.query(`USE ${dbName}`);
            console.log('✅ Usando base de datos');

            // Asegurar que las columnas existen en dispositivos (por si la tabla ya existía)
            try {
                const [columns] = await connection.query(`SHOW COLUMNS FROM dispositivos LIKE 'last_seen'`);
                if (columns.length === 0) {
                    await connection.query(`ALTER TABLE dispositivos ADD COLUMN last_seen TIMESTAMP NULL DEFAULT NULL AFTER poste_image`);
                    console.log('✅ Columna last_seen agregada a la tabla dispositivos');
                }
            } catch (err) {
                console.log('ℹ️ Nota: No se pudo verificar la columna last_seen:', err.message);
            }

            try {
                const [columns] = await connection.query(`SHOW COLUMNS FROM dispositivos LIKE 'connection_type'`);
                if (columns.length === 0) {
                    await connection.query(`ALTER TABLE dispositivos ADD COLUMN connection_type VARCHAR(10) DEFAULT 'WiFi' AFTER last_seen`);
                    console.log('✅ Columna connection_type agregada a la tabla dispositivos');
                }
            } catch (err) {
                console.log('ℹ️ Nota: No se pudo verificar la columna connection_type:', err.message);
            }

            try {
                const [columns] = await connection.query(`SHOW COLUMNS FROM dispositivos LIKE 'ip_address'`);
                if (columns.length === 0) {
                    await connection.query(`ALTER TABLE dispositivos ADD COLUMN ip_address VARCHAR(50) DEFAULT '192.168.1.100' AFTER connection_type`);
                    console.log('✅ Columna ip_address agregada a la tabla dispositivos');
                }
            } catch (err) {
                console.log('ℹ️ Nota: No se pudo verificar la columna ip_address:', err.message);
            }

            // Ejecutar script SQL para crear tablas
            const sqlScript = `
                -- Tabla de dispositivos (chips)
                CREATE TABLE IF NOT EXISTS dispositivos (
                    id VARCHAR(50) PRIMARY KEY,
                    chip_number VARCHAR(50) UNIQUE NOT NULL,
                    subestacion VARCHAR(100) NOT NULL,
                    georeferencia VARCHAR(100) NOT NULL,
                    poste_image LONGTEXT,
                    last_seen TIMESTAMP NULL DEFAULT NULL,
                    connection_type VARCHAR(10) DEFAULT 'WiFi',
                    ip_address VARCHAR(50) DEFAULT '192.168.1.100',
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );

                -- Tabla de triples disparos
                CREATE TABLE IF NOT EXISTS triples_disparos (
                    id VARCHAR(50) PRIMARY KEY,
                    chip_id VARCHAR(50) NOT NULL,
                    cuchilla1 BOOLEAN DEFAULT TRUE,
                    cuchilla2 BOOLEAN DEFAULT TRUE,
                    cuchilla3 BOOLEAN DEFAULT TRUE,
                    status ENUM('green', 'yellow', 'orange', 'red') NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (chip_id) REFERENCES dispositivos(id) ON DELETE CASCADE,
                    INDEX idx_chip_id (chip_id),
                    INDEX idx_status (status),
                    INDEX idx_timestamp (timestamp)
                );

                -- Tabla de contactos para notificaciones
                CREATE TABLE IF NOT EXISTS contactos (
                    id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    email VARCHAR(100),
                    role VARCHAR(50),
                    notifications_whatsapp BOOLEAN DEFAULT TRUE,
                    notifications_email BOOLEAN DEFAULT FALSE,
                    notifications_critical_only BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_phone (phone)
                );

                -- Tabla de historial de eventos
                CREATE TABLE IF NOT EXISTS historial (
                    id VARCHAR(50) PRIMARY KEY,
                    type ENUM('device_added', 'device_deleted', 'triple_created', 'triple_updated', 'triple_deleted') NOT NULL,
                    device_id VARCHAR(50),
                    triple_id VARCHAR(50),
                    chip_id VARCHAR(50),
                    chip_number VARCHAR(50),
                    subestacion VARCHAR(100),
                    georeferencia VARCHAR(100),
                    status ENUM('green', 'yellow', 'orange', 'red'),
                    message TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_type (type),
                    INDEX idx_device_id (device_id),
                    INDEX idx_triple_id (triple_id),
                    INDEX idx_timestamp (timestamp),
                    INDEX idx_status (status)
                );

                -- Tabla de notificaciones
                CREATE TABLE IF NOT EXISTS notificaciones (
                    id VARCHAR(50) PRIMARY KEY,
                    type ENUM('warning', 'error', 'info') DEFAULT 'warning',
                    message TEXT NOT NULL,
                    triple_id VARCHAR(50),
                    chip_id VARCHAR(50),
                    chip_number VARCHAR(50),
                    subestacion VARCHAR(100),
                    georeferencia VARCHAR(100),
                    status ENUM('green', 'yellow', 'orange', 'red'),
                    \`read\` BOOLEAN DEFAULT FALSE,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_type (type),
                    INDEX idx_triple_id (triple_id),
                    INDEX idx_chip_id (chip_id),
                    INDEX idx_read (\`read\`),
                    INDEX idx_timestamp (timestamp)
                );

                -- Insertar datos de ejemplo
                INSERT IGNORE INTO dispositivos (id, chip_number, subestacion, georeferencia) VALUES
                ('CHIP1', 'CHIP001', 'Subestacion Norte', '19.432608, -99.133209'),
                ('CHIP2', 'CHIP002', 'Subestacion Sur', '19.428471, -99.127631'),
                ('CHIP3', 'CHIP003', 'Subestacion Centro', '19.436100, -99.139300');

                INSERT IGNORE INTO triples_disparos (id, chip_id, cuchilla1, cuchilla2, cuchilla3, status) VALUES
                ('TD1', 'CHIP1', TRUE, TRUE, TRUE, 'green'),
                ('TD2', 'CHIP2', TRUE, FALSE, TRUE, 'yellow'),
                ('TD3', 'CHIP3', FALSE, FALSE, TRUE, 'orange');

                INSERT IGNORE INTO contactos (id, name, phone, email, role, notifications_whatsapp, notifications_email, notifications_critical_only) VALUES
                ('C1', 'Daniel Villegas', '+5219984110091', 'da.villegas1005@.com', 'Supervisor', TRUE, TRUE, FALSE),
                ('C2', 'Maris Garcia', '+5215598765432', 'maria@empresa.com', 'Tecnico', TRUE, FALSE, TRUE);
            `;

            await connection.query(sqlScript);
            console.log('✅ Tablas creadas y datos de ejemplo insertados');

            await connection.end();
            console.log('🎉 Base de datos inicializada correctamente');

        } catch (error) {
            console.error('❌ Error inicializando base de datos:', error);
            throw error;
        }
    }
}

module.exports = new DatabaseService();