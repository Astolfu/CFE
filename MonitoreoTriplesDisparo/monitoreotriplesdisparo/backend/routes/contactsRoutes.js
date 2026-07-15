const express = require('express');
const router = express.Router();

// Obtener todos los contactos
router.get('/', async (req, res) => {
    try {
        const [contacts] = await req.db.execute('SELECT * FROM contactos ORDER BY created_at DESC');

        const formattedContacts = contacts.map(contact => ({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            role: contact.role,
            telegram_chat_id: contact.telegram_chat_id,
            notifications: {
                whatsapp: Boolean(contact.notifications_whatsapp),
                email: Boolean(contact.notifications_email),
                criticalOnly: Boolean(contact.notifications_critical_only)
            },
            createdAt: contact.created_at
        }));

        res.json(formattedContacts);
    } catch (error) {
        console.error('Error obteniendo contactos:', error);
        res.status(500).json({ error: 'Error obteniendo contactos' });
    }
});

// Agregar nuevo contacto
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, role, telegram_chat_id, notifications } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Nombre y teléfono son requeridos' });
        }

        const contactId = `C${Date.now()}`;

        const [result] = await req.db.execute(
            'INSERT INTO contactos (id, name, phone, email, role, telegram_chat_id, notifications_whatsapp, notifications_email, notifications_critical_only) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                contactId,
                name,
                phone,
                email || null,
                role || null,
                telegram_chat_id || null,
                notifications?.whatsapp || true,
                notifications?.email || false,
                notifications?.criticalOnly || false
            ]
        );

        const newContact = {
            id: contactId,
            name,
            phone,
            email,
            role,
            telegram_chat_id,
            notifications: {
                whatsapp: notifications?.whatsapp || true,
                email: notifications?.email || false,
                criticalOnly: notifications?.criticalOnly || false
            },
            createdAt: new Date().toISOString()
        };

        res.json({ success: true, contact: newContact });
    } catch (error) {
        console.error('Error agregando contacto:', error);
        res.status(500).json({ error: 'Error agregando contacto' });
    }
});

// Eliminar contacto
router.delete('/:id', async (req, res) => {
    try {
        const contactId = req.params.id;

        const [result] = await req.db.execute('DELETE FROM contactos WHERE id = ?', [contactId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }

        res.json({ success: true, message: 'Contacto eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando contacto:', error);
        res.status(500).json({ error: 'Error eliminando contacto' });
    }
});

module.exports = router;
