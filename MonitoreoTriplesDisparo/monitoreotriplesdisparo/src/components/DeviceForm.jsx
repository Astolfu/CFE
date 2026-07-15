import React, { useState, useEffect } from 'react';
import './Forms.css';

const LocationPicker = ({ onLocationSelect, onClose, initialLocation }) => {
    const [selectedLocation, setSelectedLocation] = useState(() => {
        if (initialLocation) {
            try {
                const [lat, lng] = initialLocation.split(',').map(coord => parseFloat(coord.trim()));
                return { lat, lng };
            } catch (error) {
                return null;
            }
        }
        return null;
    });

    const [manualCoords, setManualCoords] = useState({
        lat: '',
        lng: ''
    });

    useEffect(() => {
        if (initialLocation) {
            try {
                const [lat, lng] = initialLocation.split(',').map(coord => parseFloat(coord.trim()));
                setManualCoords({
                    lat: lat.toString(),
                    lng: lng.toString()
                });
            } catch (error) {
                console.error('Error parsing initial location:', error);
            }
        }
    }, [initialLocation]);

    const handleManualCoordsChange = (field, value) => {
        setManualCoords(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleUseManualCoords = () => {
        const lat = parseFloat(manualCoords.lat);
        const lng = parseFloat(manualCoords.lng);

        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            setSelectedLocation({ lat, lng });
        } else {
            alert('Por favor ingresa coordenadas válidas\nLatitud: -90 a 90\nLongitud: -180 a 180');
        }
    };

    const handleConfirm = () => {
        if (selectedLocation) {
            onLocationSelect(selectedLocation.lat, selectedLocation.lng);
        } else {
            alert('Por favor ingresa coordenadas manuales');
        }
    };

    return (
        <div className="map-modal-overlay">
            <div className="map-modal">
                <div className="map-modal-header">
                    <h3>🗺️ Seleccionar Ubicación del Chip</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="map-modal-body">
                    <div className="map-instructions">
                        <p><strong>Ingresa las coordenadas manuales del poste:</strong></p>
                        {selectedLocation && (
                            <p className="selected-coords">
                                ✅ <strong>{selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</strong>
                            </p>
                        )}
                    </div>

                    <div className="manual-coords-section">
                        <h4>📍 Coordenadas del Poste</h4>
                        <div className="coords-inputs">
                            <div className="coord-input">
                                <label>Latitud *</label>
                                <input
                                    type="text"
                                    placeholder="Ej: 19.432608"
                                    value={manualCoords.lat}
                                    onChange={(e) => handleManualCoordsChange('lat', e.target.value)}
                                    required
                                />
                                <small>Ejemplo: 19.432608 (CDMX Centro)</small>
                            </div>
                            <div className="coord-input">
                                <label>Longitud *</label>
                                <input
                                    type="text"
                                    placeholder="Ej: -99.133209"
                                    value={manualCoords.lng}
                                    onChange={(e) => handleManualCoordsChange('lng', e.target.value)}
                                    required
                                />
                                <small>Ejemplo: -99.133209 (CDMX Centro)</small>
                            </div>
                        </div>

                        <button
                            className="btn-use-coords"
                            onClick={handleUseManualCoords}
                            disabled={!manualCoords.lat || !manualCoords.lng}
                        >
                            📍 Usar estas coordenadas
                        </button>
                    </div>
                </div>

                <div className="map-modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleConfirm}
                        disabled={!selectedLocation}
                    >
                        ✅ Confirmar Ubicación
                    </button>
                </div>
            </div>
        </div>
    );
};

const DeviceForm = ({ devices, onAddDevice, onUpdateDevice, onDeleteDevice }) => {
    const [formData, setFormData] = useState({
        chipNumber: '',
        subestacion: '',
        georeferencia: '',
        posteImage: null,
        posteImageUrl: ''
    });

    const [editingDevice, setEditingDevice] = useState(null);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [imagePreview, setImagePreview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form cuando cambia editingDevice
    useEffect(() => {
        if (editingDevice) {
            setFormData({
                chipNumber: editingDevice.chipNumber || '',
                subestacion: editingDevice.subestacion || '',
                georeferencia: editingDevice.georeferencia || '',
                posteImage: null,
                posteImageUrl: editingDevice.posteImage || ''
            });
            setImagePreview(editingDevice.posteImage || '');
        } else {
            setFormData({
                chipNumber: '',
                subestacion: '',
                georeferencia: '',
                posteImage: null,
                posteImageUrl: ''
            });
            setImagePreview('');
        }
    }, [editingDevice]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.chipNumber || !formData.subestacion || !formData.georeferencia) {
            alert('Por favor, completa todos los campos obligatorios');
            return;
        }

        if (isSubmitting) return;

        setIsSubmitting(true);

        try {
            const deviceData = {
                chipNumber: formData.chipNumber,
                subestacion: formData.subestacion,
                georeferencia: formData.georeferencia,
                posteImage: formData.posteImageUrl,
            };

            if (editingDevice) {
                console.log('✏️ Actualizando dispositivo:', editingDevice.id, deviceData);
                await onUpdateDevice(editingDevice.id, deviceData);
                alert('✅ Dispositivo actualizado correctamente');
                setEditingDevice(null);
            } else {
                console.log('➕ Agregando dispositivo:', deviceData);
                await onAddDevice(deviceData);
                alert('✅ Dispositivo agregado correctamente');
            }

            // Reset form
            setFormData({
                chipNumber: '',
                subestacion: '',
                georeferencia: '',
                posteImage: null,
                posteImageUrl: ''
            });
            setImagePreview('');
            setShowLocationPicker(false);

        } catch (error) {
            console.error('Error en handleSubmit:', error);
            alert('❌ Error: ' + (error.message || 'No se pudo guardar el dispositivo'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditDevice = (device) => {
        setEditingDevice(device);
    };

    const handleCancelEdit = () => {
        setEditingDevice(null);
        setFormData({
            chipNumber: '',
            subestacion: '',
            georeferencia: '',
            posteImage: null,
            posteImageUrl: ''
        });
        setImagePreview('');
    };

    const handleMapLocationSelect = (lat, lng) => {
        const georeferencia = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setFormData({ ...formData, georeferencia });
        setShowLocationPicker(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Por favor selecciona un archivo de imagen válido');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen debe ser menor a 5MB');
                return;
            }

            // Convertir imagen a Base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                setImagePreview(base64String);
                setFormData({
                    ...formData,
                    posteImage: file,
                    posteImageUrl: base64String
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImagePreview('');
        setFormData({
            ...formData,
            posteImage: null,
            posteImageUrl: ''
        });
    };

    const handleDeleteDevice = async (deviceId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este chip?')) {
            try {
                await onDeleteDevice(deviceId);
                if (editingDevice && editingDevice.id === deviceId) {
                    setEditingDevice(null);
                }
            } catch (error) {
                console.error('Error eliminando dispositivo:', error);
                alert('❌ Error eliminando dispositivo: ' + error.message);
            }
        }
    };

    return (
        <div className="devices-management">
            {/* Formulario de registro/edición */}
            <div className="device-form-section">
                <h3>{editingDevice ? '✏️ Editar Chip' : '📱 Registrar Nuevo Chip'}</h3>
                <form onSubmit={handleSubmit} className="device-form">
                    <div className="form-group">
                        <label>Número de Chip *</label>
                        <input
                            type="text"
                            placeholder="Ej: CHIP001, 123456789"
                            value={formData.chipNumber}
                            onChange={(e) => setFormData({ ...formData, chipNumber: e.target.value })}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label>Subestación *</label>
                        <input
                            type="text"
                            placeholder="Ej: Subestación Norte, Centro, Sur"
                            value={formData.subestacion}
                            onChange={(e) => setFormData({ ...formData, subestacion: e.target.value })}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label>Ubicación en el Mapa *</label>
                        <div className="location-section">
                            {formData.georeferencia ? (
                                <div className="location-selected">
                                    <span className="location-icon">📍</span>
                                    <span className="location-coords">{formData.georeferencia}</span>
                                    <button
                                        type="button"
                                        className="btn-change-location"
                                        onClick={() => setShowLocationPicker(true)}
                                        disabled={isSubmitting}
                                    >
                                        Cambiar
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="btn-pick-location"
                                    onClick={() => setShowLocationPicker(true)}
                                    disabled={isSubmitting}
                                >
                                    🗺️ Ingresar Coordenadas
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>📸 Foto del Poste (Opcional)</label>
                        <div className="image-upload-section">
                            {!imagePreview ? (
                                <div className="image-upload-placeholder">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="image-input"
                                        id="poste-image"
                                        disabled={isSubmitting}
                                    />
                                    <label htmlFor="poste-image" className="image-upload-btn">
                                        📷 Seleccionar Foto
                                    </label>
                                    <small>Formatos: JPG, PNG, GIF (Máx. 5MB)</small>
                                </div>
                            ) : (
                                <div className="image-preview">
                                    <div className="preview-container">
                                        <img src={imagePreview} alt="Vista previa del poste" />
                                        <button
                                            type="button"
                                            className="remove-image-btn"
                                            onClick={handleRemoveImage}
                                            title="Eliminar imagen"
                                            disabled={isSubmitting}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <small>Foto del poste seleccionada</small>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-actions">
                        {editingDevice && (
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleCancelEdit}
                                disabled={isSubmitting}
                            >
                                ❌ Cancelar
                            </button>
                        )}
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting || !formData.chipNumber || !formData.subestacion || !formData.georeferencia}
                        >
                            {isSubmitting
                                ? '⏳ Procesando...'
                                : editingDevice
                                    ? '💾 Guardar Cambios'
                                    : '✅ Registrar Chip'
                            }
                        </button>
                    </div>
                </form>
            </div>

            {/* Lista de chips existentes */}
            <div className="devices-list-section">
                <h3>📋 Chips Registrados ({devices.length})</h3>
                <div className="devices-grid">
                    {devices.map(device => (
                        <div key={device.id} className="device-card">
                            <div className="device-info">
                                <div className="device-header">
                                    <span className="chip-number">📱 {device.chipNumber}</span>
                                    <div className="device-actions">
                                        <button
                                            className="edit-btn"
                                            onClick={() => handleEditDevice(device)}
                                            title="Editar chip"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDeleteDevice(device.id)}
                                            title="Eliminar chip"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <p className="subestacion">🏭 {device.subestacion}</p>
                                <p className="location">📍 {device.georeferencia}</p>

                                {device.posteImage && (
                                    <div className="poste-image-preview">
                                        <img
                                            src={device.posteImage}
                                            alt={`Poste ${device.chipNumber}`}
                                            style={{ maxWidth: '100%', maxHeight: '150px', marginTop: '10px', borderRadius: '8px' }}
                                        />
                                        <small>📸 Foto del poste</small>
                                    </div>
                                )}

                                <small className="timestamp">
                                    {editingDevice?.id === device.id ? '🟢 Editando...' : `Registrado: ${new Date(device.timestamp).toLocaleDateString()}`}
                                </small>
                            </div>
                        </div>
                    ))}
                </div>

                {devices.length === 0 && (
                    <div className="empty-state">
                        <p>No hay chips registrados</p>
                        <small>Los chips que agregues se guardarán en la base de datos</small>
                    </div>
                )}
            </div>

            {/* Modal para seleccionar ubicación */}
            {showLocationPicker && (
                <LocationPicker
                    onLocationSelect={handleMapLocationSelect}
                    onClose={() => setShowLocationPicker(false)}
                    initialLocation={formData.georeferencia}
                />
            )}
        </div>
    );
};

export default DeviceForm;