-- SOLUCIÓN RÁPIDA: Trigger para crear notificaciones automáticamente
-- Este trigger se ejecutará cada vez que se actualice un triple_disparo

DELIMITER $$

CREATE TRIGGER after_triple_update
AFTER UPDATE ON triples_disparos
FOR EACH ROW
BEGIN
    DECLARE device_chip VARCHAR(100);
    DECLARE device_subestacion VARCHAR(200);
    DECLARE device_georef VARCHAR(200);
    DECLARE status_text VARCHAR(50);
    DECLARE notif_type VARCHAR(20);
    
    -- Obtener datos del dispositivo
    SELECT chip_number, subestacion, georeferencia 
    INTO device_chip, device_subestacion, device_georef
    FROM dispositivos 
    WHERE id = NEW.chip_id;
    
    -- Determinar texto del estado
    SET status_text = CASE NEW.status
        WHEN 'green' THEN '3 Cuchillas Activas'
        WHEN 'yellow' THEN '2 Cuchillas Activas'
        WHEN 'orange' THEN '1 Cuchilla Activa'
        WHEN 'red' THEN '0 Cuchillas Activas'
        ELSE NEW.status
    END;
    
    -- Determinar tipo de notificación
    SET notif_type = CASE NEW.status
        WHEN 'red' THEN 'error'
        WHEN 'orange' THEN 'warning'
        WHEN 'yellow' THEN 'warning'
        ELSE 'info'
    END;
    
    -- Solo crear notificación si NO es verde (estado normal)
    IF NEW.status != 'green' THEN
        INSERT INTO notificaciones (
            id, 
            message, 
            type, 
            triple_id, 
            chip_id, 
            chip_number, 
            subestacion, 
            georeferencia, 
            `read`
        ) VALUES (
            CONCAT('N', UNIX_TIMESTAMP(NOW()), FLOOR(RAND() * 1000)),
            CONCAT('⚠️ Alerta: ', status_text, ' en ', device_subestacion),
            notif_type,
            NEW.id,
            NEW.chip_id,
            device_chip,
            device_subestacion,
            device_georef,
            FALSE
        );
    END IF;
    
    -- Actualizar historial con TODOS los datos
    INSERT INTO historial (
        id, 
        type, 
        triple_id, 
        chip_id, 
        chip_number, 
        subestacion, 
        georeferencia, 
        status, 
        message
    ) VALUES (
        CONCAT('H', UNIX_TIMESTAMP(NOW()), FLOOR(RAND() * 1000)),
        'triple_updated',
        NEW.id,
        NEW.chip_id,
        device_chip,
        device_subestacion,
        device_georef,
        NEW.status,
        CONCAT('Triple disparo ', NEW.id, ' actualizado - Estado: ', status_text)
    );
END$$

DELIMITER ;

-- Verificar que el trigger se creó
SHOW TRIGGERS LIKE 'triples_disparos';
