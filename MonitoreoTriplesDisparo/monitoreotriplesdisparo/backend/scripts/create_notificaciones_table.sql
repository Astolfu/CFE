-- Script para crear la tabla de notificaciones si no existe

CREATE TABLE IF NOT EXISTS notificaciones (
    id VARCHAR(50) PRIMARY KEY,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info',
    triple_id VARCHAR(50),
    chip_id VARCHAR(50),
    chip_number VARCHAR(100),
    subestacion VARCHAR(200),
    georeferencia VARCHAR(200),
    `read` BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_read (`read`),
    INDEX idx_type (type)
);

-- Verificar que la tabla se creó correctamente
SHOW TABLES LIKE 'notificaciones';
DESCRIBE notificaciones;
