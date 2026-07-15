-- Script de migración para agregar soporte de Telegram a contactos

-- Agregar columna telegram_chat_id a la tabla contactos
ALTER TABLE contactos 
ADD COLUMN telegram_chat_id VARCHAR(100) DEFAULT NULL AFTER phone;

-- Agregar índice para búsquedas rápidas
ALTER TABLE contactos 
ADD INDEX idx_telegram_chat_id (telegram_chat_id);

-- Verificar la estructura actualizada
DESCRIBE contactos;

-- Mostrar contactos existentes
SELECT id, name, phone, telegram_chat_id FROM contactos;
