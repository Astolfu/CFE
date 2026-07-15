const express = require('express');
const router = express.Router();

// Obtener historial
router.get('/', async (req, res) => {
    try {
        let query = 'SELECT * FROM historial';
        const queryParams = [];
        if (req.query.deviceId || req.query.chipId) {
            const id = req.query.deviceId || req.query.chipId;
            query += ' WHERE chip_id = ? OR device_id = ?';
            queryParams.push(id, id);
        }
        query += ' ORDER BY timestamp DESC LIMIT 100';

        const [history] = await req.db.execute(query, queryParams);

        // Formatear datos para el frontend (convertir snake_case a camelCase)
        const formattedHistory = history.map(item => ({
            id: item.id,
            type: item.type,
            tripleId: item.triple_id,
            chipId: item.chip_id,
            chipNumber: item.chip_number,
            subestacion: item.subestacion,
            georeferencia: item.georeferencia,
            status: item.status,
            message: item.message,
            timestamp: item.timestamp
        }));

        res.json(formattedHistory);
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ error: 'Error obteniendo historial' });
    }
});

module.exports = router;