import React, { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import StatusPanel from '../components/StatusPanel';
import SearchBar from '../components/SearchBar';
import TestComponent from '../components/TestComponent';
import { api } from '../services/api';
import './Dashboard.css';

const Dashboard = ({ devices, tripleDisparos, notifications, onTestUpdate, initialSelectedDeviceId }) => {
    const [selectedDevice, setSelectedDevice] = useState(initialSelectedDeviceId || null);
    const [searchResult, setSearchResult] = useState(null);
    const [stats, setStats] = useState(null);

    // Actualizar selección cuando cambia el prop (desde notificaciones)
    useEffect(() => {
        if (initialSelectedDeviceId) {
            setSelectedDevice(initialSelectedDeviceId);
        }
    }, [initialSelectedDeviceId]);

    // Manejar deep links desde Telegram
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const deviceParam = urlParams.get('device');
        const tripleParam = urlParams.get('triple');

        if (deviceParam && devices.length > 0) {
            console.log('🔗 Deep link detectado - Dispositivo:', deviceParam);

            // Buscar el dispositivo por chipNumber
            const device = devices.find(d => d.chipNumber === deviceParam);

            if (device) {
                console.log('✅ Dispositivo encontrado:', device);
                setSelectedDevice(device.id);

                // Si hay un triple específico, buscarlo y establecerlo como resultado de búsqueda
                if (tripleParam) {
                    const triple = tripleDisparos.find(t => t.id === tripleParam);
                    if (triple) {
                        console.log('✅ Triple disparo encontrado:', triple);
                        setSearchResult({
                            ...triple,
                            type: 'triple'
                        });
                    }
                }

                // Limpiar los parámetros URL después de procesarlos (opcional)
                window.history.replaceState({}, '', window.location.pathname);
            } else {
                console.warn('⚠️ Dispositivo no encontrado:', deviceParam);
            }
        }
    }, [devices, tripleDisparos]);

    useEffect(() => {
        loadStats();
    }, [devices, tripleDisparos]);

    const loadStats = async () => {
        try {
            const statsData = await api.getStats();
            setStats(statsData);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const handleDeviceClick = (deviceId) => {
        setSelectedDevice(deviceId);
        setSearchResult(null);
    };

    const handleSearchSelect = (result) => {
        console.log('🔍 Resultado de búsqueda seleccionado:', result);

        if (!result) {
            console.error('Resultado de búsqueda es null o undefined');
            return;
        }

        if (result.type === 'device') {
            setSelectedDevice(result.id);
            setSearchResult(result);
        } else if (result.type === 'triple') {
            const device = devices.find(d => d.id === result.chipId);
            if (device) {
                setSelectedDevice(device.id);
                setSearchResult(result);
            } else {
                console.error('No se encontró el dispositivo para el triple disparo:', result.chipId);
            }
        }
    };

    const deviceTriples = selectedDevice
        ? tripleDisparos.filter(td => td.chipId === selectedDevice)
        : [];

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>Monitor de Triples Disparos</h1>
                    {stats && (
                        <div className="dashboard-stats">
                            <span className="stat-item">
                                📱 {stats.totalDevices} Dispositivos
                            </span>
                            <span className="stat-item">
                                ⚡ {stats.totalTriples} Triples
                            </span>
                            <span className="stat-item">
                                ⚠️ {stats.criticalTriples} Críticos
                            </span>
                        </div>
                    )}
                </div>
                <SearchBar
                    devices={devices}
                    tripleDisparos={tripleDisparos}
                    onSearchSelect={handleSearchSelect}
                />
            </div>

            <div className="dashboard-content">
                <div className="map-section">
                    <MapComponent
                        devices={devices}
                        tripleDisparos={tripleDisparos}
                        onDeviceClick={handleDeviceClick}
                        selectedDevice={selectedDevice}
                        searchResult={searchResult}
                    />
                </div>

                <div className="panels-section">
                    <StatusPanel
                        devices={devices}
                        tripleDisparos={tripleDisparos}
                        selectedDevice={selectedDevice}
                        deviceTriples={deviceTriples}
                    />

                    {/* TEST COMPONENT - SIMULADOR DISPONIBLE */}
                    <TestComponent
                        devices={devices}
                        tripleDisparos={tripleDisparos}
                        onTestUpdate={onTestUpdate}
                    />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;