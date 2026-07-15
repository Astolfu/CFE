import React, { useState } from 'react';
import { calculateStatus } from '../services/api';
import './Forms.css';

const TripleDisparoForm = ({ devices, tripleDisparos, onAddTripleDisparo, onDeleteTripleDisparo }) => {
    const [formData, setFormData] = useState({
        chipId: '',
        cuchilla1: true,
        cuchilla2: true,
        cuchilla3: true
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    console.log('🔧 TripleDisparoForm rendered - Devices:', devices.length, 'Triples:', tripleDisparos.length);

    if (devices.length === 0) {
        return (
            <div className="triples-management">
                <div className="triple-form-section">
                    <h3>⚡ Crear Triple Disparo</h3>
                    <div className="empty-state">
                        <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🚫 No hay chips registrados</p>
                        <p>Primero debes registrar al menos un chip en la sección de dispositivos</p>
                    </div>
                </div>
            </div>
        );
    }

    const getStatusText = (status) => {
        const texts = {
            green: '3 Cuchillas Activas 🟢',
            yellow: '2 Cuchillas Activas 🟡',
            orange: '1 Cuchilla Activa 🟠',
            red: '0 Cuchillas Activas 🔴'
        };
        return texts[status];
    };

    const getStatusColor = (status) => {
        const colors = {
            green: '#059669',
            yellow: '#d97706',
            orange: '#ea580c',
            red: '#dc2626'
        };
        return colors[status];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        if (!formData.chipId) {
            alert('Por favor, selecciona un chip');
            return;
        }

        setIsSubmitting(true);

        try {
            const newTripleDisparo = {
                chipId: formData.chipId,
                cuchilla1: formData.cuchilla1,
                cuchilla2: formData.cuchilla2,
                cuchilla3: formData.cuchilla3,
            };

            console.log('⚡ Enviando triple disparo:', newTripleDisparo);
            await onAddTripleDisparo(newTripleDisparo);

            // Reset form
            setFormData({
                chipId: '',
                cuchilla1: true,
                cuchilla2: true,
                cuchilla3: true
            });

        } catch (error) {
            // El error ya se maneja en el App.jsx
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTriple = async (tripleId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este triple disparo?')) {
            try {
                await onDeleteTripleDisparo(tripleId);
            } catch (error) {
                // El error ya se maneja en el App.jsx
            }
        }
    };

    const currentStatus = calculateStatus(formData.cuchilla1, formData.cuchilla2, formData.cuchilla3);

    return (
        <div className="triples-management">
            {/* Formulario de registro */}
            <div className="triple-form-section">
                <h3>⚡ Crear Triple Disparo</h3>
                <form onSubmit={handleSubmit} className="triple-form">
                    <div className="form-group">
                        <label>Chip Asociado *</label>
                        <select
                            value={formData.chipId}
                            onChange={(e) => setFormData({ ...formData, chipId: e.target.value })}
                            required
                            disabled={isSubmitting}
                        >
                            <option value="">Seleccionar Chip</option>
                            {devices.map(device => (
                                <option key={device.id} value={device.id}>
                                    {device.chipNumber} - {device.subestacion}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Estado de Cuchillas</label>
                        <div className="cuchillas-control">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.cuchilla1}
                                    onChange={(e) => setFormData({ ...formData, cuchilla1: e.target.checked })}
                                    disabled={isSubmitting}
                                />
                                Cuchilla 1
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.cuchilla2}
                                    onChange={(e) => setFormData({ ...formData, cuchilla2: e.target.checked })}
                                    disabled={isSubmitting}
                                />
                                Cuchilla 2
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.cuchilla3}
                                    onChange={(e) => setFormData({ ...formData, cuchilla3: e.target.checked })}
                                    disabled={isSubmitting}
                                />
                                Cuchilla 3
                            </label>
                        </div>
                    </div>

                    <div
                        className="status-preview"
                        style={{ backgroundColor: getStatusColor(currentStatus) }}
                    >
                        Estado: {getStatusText(currentStatus)}
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={!formData.chipId || isSubmitting}
                        >
                            {isSubmitting ? '⏳ Creando...' : '⚡ Crear Triple Disparo'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Lista de triples disparos existentes */}
            <div className="triples-list-section">
                <h3>📋 Triples Disparos Registrados ({tripleDisparos.length})</h3>
                <div className="triples-grid">
                    {tripleDisparos.map(triple => {
                        const device = devices.find(d => d.id === triple.chipId);
                        return (
                            <div
                                key={triple.id}
                                className="triple-card"
                                style={{ borderLeftColor: getStatusColor(triple.status) }}
                            >
                                <div className="triple-header">
                                    <span className="triple-id">{triple.id}</span>
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleDeleteTriple(triple.id)}
                                        title="Eliminar triple disparo"
                                    >
                                        🗑️
                                    </button>
                                </div>

                                <div className="triple-info">
                                    <p><strong>Chip:</strong> {device ? device.chipNumber : 'N/A'}</p>
                                    <p><strong>Subestación:</strong> {device ? device.subestacion : 'N/A'}</p>
                                    <p><strong>Ubicación:</strong> {device ? device.georeferencia : 'N/A'}</p>
                                    <p>
                                        <strong>Estado:</strong>
                                        <span
                                            className="status-badge"
                                            style={{ backgroundColor: getStatusColor(triple.status) }}
                                        >
                                            {getStatusText(triple.status)}
                                        </span>
                                    </p>
                                    <p>
                                        <strong>Cuchillas activas:</strong>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: getStatusColor(triple.status),
                                            marginLeft: '0.5rem'
                                        }}>
                                            {[triple.cuchilla1, triple.cuchilla2, triple.cuchilla3].filter(Boolean).length}
                                        </span>
                                    </p>
                                    <div className="cuchillas-visual">
                                        <span className={triple.cuchilla1 ? 'cuchilla active' : 'cuchilla inactive'}>1</span>
                                        <span className={triple.cuchilla2 ? 'cuchilla active' : 'cuchilla inactive'}>2</span>
                                        <span className={triple.cuchilla3 ? 'cuchilla active' : 'cuchilla inactive'}>3</span>
                                    </div>
                                    <small className="timestamp">
                                        Creado: {new Date(triple.timestamp).toLocaleString()}
                                    </small>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {tripleDisparos.length === 0 && (
                    <div className="empty-state">
                        <p>No hay triples disparos registrados</p>
                        <small>Los triples disparos que crees se guardarán en la base de datos</small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TripleDisparoForm;