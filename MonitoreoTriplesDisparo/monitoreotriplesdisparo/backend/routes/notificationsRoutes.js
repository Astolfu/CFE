const express = require('express');
const router = express.Router();

// Obtener notificaciones
router.get('/', async (req, res) => {
    try {
        const [notifications] = await req.db.execute(`
            SELECT * FROM notificaciones 
            ORDER BY timestamp DESC 
            LIMIT 50
        `);

        res.json(notifications);
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error);
        res.status(500).json({ error: 'Error obteniendo notificaciones' });
    }
});

// Marcar notificación como leída
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        await req.db.execute('UPDATE notificaciones SET `read` = TRUE WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marcando notificación como leída:', error);
        res.status(500).json({ error: 'Error actualizando notificación' });
    }
});

module.exports = router;