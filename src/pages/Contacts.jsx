import React, { useState } from 'react';
import { api } from '../services/api';
import './Contacts.css';

const Contacts = ({ contacts, onAddContact, onDeleteContact }) => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        role: '',
        telegram_chat_id: '',
        notifications: {
            telegram: true
        }
    });
    const [testingTelegram, setTestingTelegram] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await onAddContact(formData);
            setFormData({
                name: '',
                phone: '',
                role: '',
                telegram_chat_id: '',
                notifications: {
                    telegram: true
                }
            });
            setShowForm(false);
            alert('✅ Contacto agregado correctamente');
        } catch (error) {
            alert('❌ Error al agregar contacto: ' + error.message);
        }
    };

    const deleteContact = async (contactId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
            try {
                await onDeleteContact(contactId);
                alert('✅ Contacto eliminado correctamente');
            } catch (error) {
                alert('❌ Error al eliminar contacto: ' + error.message);
            }
        }
    };

    const testTelegram = async (contact) => {
        setTestingTelegram(contact.id);
        try {
            console.log('📤 Enviando mensaje de prueba a Telegram para:', contact.name);

            const success = await api.testTelegram({
                contactId: contact.id,
                name: contact.name,
                telegramChatId: contact.telegram_chat_id
            });

            if (success) {
                alert('✅ Mensaje de prueba enviado correctamente a Telegram');
            } else {
                alert('❌ Error enviando mensaje de prueba');
            }
        } catch (error) {
            console.error('❌ Error enviando mensaje:', error);
            alert('❌ Error: ' + error.message);
        } finally {
            setTestingTelegram(null);
        }
    };

    return (
        <div className="contacts-page">
            <div className="page-header">
                <div className="header-content">
                    <div className="header-text">
                        <h1>👥 Contactos</h1>
                        <p className="header-subtitle">Gestiona los contactos que recibirán notificaciones de alertas</p>
                    </div>
                    <button
                        className="btn-add-contact"
                        onClick={() => setShowForm(true)}
                    >
                        <span className="btn-icon">+</span>
                        Nuevo Contacto
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>✨ Agregar Nuevo Contacto</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowForm(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="contact-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>✅ Nombre completo: </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Juan Pérez"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>💼 Rol/Cargo:</label>
                                    <input
                                        type="text"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        placeholder="Ej: Supervisor, Técnico"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>📱 Teléfono:</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+52 123 456 7890"
                                />
                            </div>

                            <div className="form-group">
                                <label>💬 Telegram Chat ID:</label>
                                <input
                                    type="text"
                                    value={formData.telegram_chat_id}
                                    onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                                    placeholder="Ej: 123456789"
                                    required
                                />
                                <small className="form-hint">
                                    Para obtener tu Chat ID, envía un mensaje a @userinfobot en Telegram
                                </small>
                            </div>

                            <div className="notifications-settings">
                                <h4>🔔 Configuración de Notificaciones</h4>

                                <div className="checkbox-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.notifications.telegram}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                notifications: {
                                                    telegram: e.target.checked
                                                }
                                            })}
                                        />
                                        <span className="checkbox-text">
                                            <span className="checkbox-icon">💬</span>
                                            Recibir notificaciones por Telegram
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-submit">
                                    <span>✓</span> Guardar Contacto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="contacts-container">
                {contacts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📞</div>
                        <h3>No hay contactos registrados</h3>
                        <p>Agrega contactos para que reciban notificaciones de alertas del sistema</p>
                        <button
                            className="btn-add-contact"
                            onClick={() => setShowForm(true)}
                        >
                            <span className="btn-icon">+</span>
                            Agregar Primer Contacto
                        </button>
                    </div>
                ) : (
                    <div className="contacts-grid">
                        {contacts.map(contact => (
                            <div key={contact.id} className="contact-card">
                                <div className="card-header">
                                    <div className="contact-avatar">
                                        {contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <div className="contact-main-info">
                                        <h4 className="contact-name">{contact.name}</h4>
                                        {contact.role && <p className="contact-role">{contact.role}</p>}
                                    </div>
                                </div>

                                <div className="card-body">
                                    {contact.phone && (
                                        <div className="contact-detail">
                                            <span className="detail-icon">📱</span>
                                            <span className="detail-text">{contact.phone}</span>
                                        </div>
                                    )}
                                    {contact.telegram_chat_id && (
                                        <div className="contact-detail">
                                            <span className="detail-icon">💬</span>
                                            <span className="detail-text">Chat ID: {contact.telegram_chat_id}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="card-footer">
                                    <div className="notification-badges">
                                        {contact.notifications?.telegram && (
                                            <span className="badge badge-telegram">💬 Telegram</span>
                                        )}
                                    </div>

                                    <div className="card-actions">
                                        <button
                                            className="btn-test"
                                            onClick={() => testTelegram(contact)}
                                            disabled={testingTelegram === contact.id}
                                            title="Enviar mensaje de prueba"
                                        >
                                            {testingTelegram === contact.id ? '⏳' : '📤'}
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => deleteContact(contact.id)}
                                            title="Eliminar contacto"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Contacts;
