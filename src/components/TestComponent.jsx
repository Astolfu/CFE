import React, { useState } from 'react';
import { api } from '../services/api';
import './TestComponent.css';

const TestComponent = ({ devices, tripleDisparos, onTestUpdate }) => {
    const [testData, setTestData] = useState({
        chipNumber: '',
        tripleDisparoId: '',
        cuchilla1: true,
        cuchilla2: true,
        cuchilla3: true
    });

    const [selectedDeviceTriples, setSelectedDeviceTriples] = useState([]);
    const [isTesting, setIsTesting] = useState(false);

    const handleChipChange = (chipNumber) => {
        setTestData(prev => ({ ...prev, chipNumber, tripleDisparoId: '' }));

        const device = devices.find(d => d.chipNumber === chipNumber);
        if (device) {
            const deviceTriples = tripleDisparos.filter(td => td.chipId === device.id);
            setSelectedDeviceTriples(deviceTriples);
        } else {
            setSelectedDeviceTriples([]);
        }
    };

    const handleTest = async () => {
        if (!testData.chipNumber) {
            alert('Por favor selecciona un chip');
            return;
        }

        const deviceExists = devices.find(d => d.chipNumber === testData.chipNumber);
        if (!deviceExists) {
            alert('El número de chip no existe. Primero agrega el dispositivo.');
            return;
        }

        setIsTesting(true);

        try {
            console.log('🧪 Enviando prueba:', testData);

            const result = await api.simulateESP32Data(
                testData.chipNumber,
                testData.tripleDisparoId,
                {
                    cuchilla1: testData.cuchilla1,
                    cuchilla2: testData.cuchilla2,
                    cuchilla3: testData.cuchilla3
                }
            );

            if (result.success) {
                if (onTestUpdate) {
                    onTestUpdate(result);
                }
                alert(`✅ Datos de prueba enviados al Triple Disparo: ${testData.tripleDisparoId || 'Nuevo'}`);

                setTestData({
                    chipNumber: '',
                    tripleDisparoId: '',
                    cuchilla1: true,
                    cuchilla2: true,
                    cuchilla3: true
                });
                setSelectedDeviceTriples([]);
            } else {
                throw new Error(result.error || 'No se recibió respuesta del servidor');
            }

        } catch (error) {
            console.error('Error en prueba:', error);
            alert('Error al enviar datos de prueba: ' + error.message);
        } finally {
            setIsTesting(false);
        }
    };

    const getTripleDisparoInfo = (tripleId) => {
        const triple = tripleDisparos.find(td => td.id === tripleId);
        if (triple) {
            const activeCount = [triple.cuchilla1, triple.cuchilla2, triple.cuchilla3].filter(Boolean).length;
            return `${triple.id} (${activeCount} cuchillas activas)`;
        }
        return tripleId;
    };

    const getStatusColor = (c1, c2, c3) => {
        const activeCount = [c1, c2, c3].filter(Boolean).length;
        if (activeCount === 3) return 'green';
        if (activeCount === 2) return 'yellow';
        if (activeCount === 1) return 'orange';
        return 'red';
    };

    const getStatusText = (c1, c2, c3) => {
        const activeCount = [c1, c2, c3].filter(Boolean).length;
        return `${activeCount} cuchilla(s) activa(s)`;
    };

    return (
        <div className="test-panel">
            <h3>🧪 Simular Datos del ESP32</h3>

            <div className="test-form">
                <div className="form-group">
                    <label>Chip a Probar *</label>
                    <select
                        value={testData.chipNumber}
                        onChange={(e) => handleChipChange(e.target.value)}
                        disabled={isTesting}
                    >
                        <option value="">Seleccionar Chip</option>
                        {devices.map(device => (
                            <option key={device.id} value={device.chipNumber}>
                                {device.chipNumber} - {device.subestacion}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedDeviceTriples.length > 0 && (
                    <div className="form-group">
                        <label>Triple Disparo Específico</label>
                        <select
                            value={testData.tripleDisparoId}
                            onChange={(e) => setTestData({ ...testData, tripleDisparoId: e.target.value })}
                            disabled={isTesting}
                        >
                            <option value="">Crear nuevo triple disparo</option>
                            {selectedDeviceTriples.map(triple => (
                                <option key={triple.id} value={triple.id}>
                                    {getTripleDisparoInfo(triple.id)}
                                </option>
                            ))}
                        </select>
                        <small>
                            {testData.tripleDisparoId
                                ? `Editando: ${getTripleDisparoInfo(testData.tripleDisparoId)}`
                                : 'Creando nuevo triple disparo'
                            }
                        </small>
                    </div>
                )}

                <div className="form-group">
                    <label>Estado de Cuchillas a Simular</label>
                    <div className="cuchillas-test">
                        <label>
                            <input
                                type="checkbox"
                                checked={testData.cuchilla1}
                                onChange={(e) => setTestData({ ...testData, cuchilla1: e.target.checked })}
                                disabled={isTesting}
                            />
                            Cuchilla 1
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={testData.cuchilla2}
                                onChange={(e) => setTestData({ ...testData, cuchilla2: e.target.checked })}
                                disabled={isTesting}
                            />
                            Cuchilla 2
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={testData.cuchilla3}
                                onChange={(e) => setTestData({ ...testData, cuchilla3: e.target.checked })}
                                disabled={isTesting}
                            />
                            Cuchilla 3
                        </label>
                    </div>
                </div>

                <div className="test-status">
                    Estado simulado:
                    <span className={getStatusColor(testData.cuchilla1, testData.cuchilla2, testData.cuchilla3)}>
                        {getStatusText(testData.cuchilla1, testData.cuchilla2, testData.cuchilla3)}
                    </span>
                </div>

                <button
                    onClick={handleTest}
                    className="test-button"
                    disabled={!testData.chipNumber || isTesting}
                >
                    {isTesting ? '⏳ Enviando...' : '📡 Enviar Datos de Prueba'}
                </button>
            </div>

            <div className="test-instructions">
                <h4>Instrucciones para pruebas:</h4>
                <ol>
                    <li>Selecciona un chip de la lista</li>
                    <li>Elige un triple disparo específico o crea uno nuevo</li>
                    <li>Configura el estado de las cuchillas</li>
                    <li>Haz clic en "Enviar Datos de Prueba"</li>
                    <li>Los cambios se verán inmediatamente en el mapa y notificaciones</li>
                </ol>
            </div>
        </div>
    );
};

export default TestComponent;