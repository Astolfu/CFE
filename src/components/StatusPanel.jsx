import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import './StatusPanel.css';

const PhysicalCuchilla = ({ phaseName, label, isActive }) => {
    return (
        <div className={`physical-cuchilla-row ${isActive ? 'closed' : 'open'}`}>
            <div className="cuchilla-info">
                <span className="phase-badge">{phaseName}</span>
                <span className="cuchilla-label">{label}</span>
            </div>
            
            <div className="cuchilla-switch-visual">
                <svg width="120" height="40" viewBox="0 0 120 40" className="cuchilla-svg">
                    {/* Líneas de conexión izquierda y derecha */}
                    <line x1="10" y1="20" x2="30" y2="20" className="cuchilla-bus-line" />
                    <line x1="90" y1="20" x2="110" y2="20" className="cuchilla-bus-line" />
                    
                    {/* Bornes de conexión */}
                    <circle cx="30" cy="20" r="4" className="cuchilla-terminal" />
                    <circle cx="90" cy="20" r="4" className="cuchilla-terminal" />
                    
                    {/* Brazo de la cuchilla giratorio */}
                    <line 
                        x1="30" 
                        y1="20" 
                        x2="90" 
                        y2="20" 
                        className="cuchilla-blade" 
                        style={{
                            transformOrigin: '30px 20px',
                            transform: isActive ? 'rotate(0deg)' : 'rotate(-40deg)',
                            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            stroke: isActive ? '#10b981' : '#ef4444'
                        }}
                    />
                </svg>
            </div>
            
            <div className={`cuchilla-status ${isActive ? 'closed' : 'open'}`}>
                <span className="status-indicator"></span>
                <span className="status-text">{isActive ? 'CERRADA' : 'ABIERTA / DISPARADA'}</span>
                {!isActive && <span className="warning-icon-mini">⚠️</span>}
            </div>
        </div>
    );
};

const StatusPanel = ({ devices, tripleDisparos, selectedDevice, deviceTriples }) => {
    const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' o 'history'
    const [historyEvents, setHistoryEvents] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    // Estados para el Zoom Interactivo
    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const [zoomScale, setZoomScale] = useState(1);
    const [panPos, setPanPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const imageRef = useRef(null);

    // Estado para el cálculo del tiempo transcurrido del Ping en vivo
    const [elapsedTimeText, setElapsedTimeText] = useState('Cargando...');

    const device = devices.find(d => d.id === selectedDevice);

    // Efecto para calcular el tiempo del ping transcurrido
    useEffect(() => {
        if (!device) return;

        const calculateElapsed = () => {
            const lastSeenVal = device.lastSeen || device.last_seen;
            if (!lastSeenVal) {
                setElapsedTimeText('Nunca conectado');
                return;
            }
            
            const diffMs = Date.now() - new Date(lastSeenVal).getTime();
            const diffSec = Math.floor(diffMs / 1000);
            
            if (diffSec < 0) {
                setElapsedTimeText('Hace 0s');
            } else if (diffSec < 60) {
                setElapsedTimeText(`Hace ${diffSec}s`);
            } else if (diffSec < 3600) {
                const min = Math.floor(diffSec / 60);
                const sec = diffSec % 60;
                setElapsedTimeText(`Hace ${min}m ${sec}s`);
            } else if (diffSec < 86400) {
                const hr = Math.floor(diffSec / 3600);
                const min = Math.floor((diffSec % 3600) / 60);
                setElapsedTimeText(`Hace ${hr}h ${min}m`);
            } else {
                const days = Math.floor(diffSec / 86400);
                setElapsedTimeText(`Hace ${days}d`);
            }
        };

        calculateElapsed();
        const interval = setInterval(calculateElapsed, 2000);
        return () => clearInterval(interval);
    }, [device?.lastSeen, device?.last_seen, selectedDevice]);

    // Efecto para obtener el historial rápido del nodo
    useEffect(() => {
        if (activeTab === 'history' && device?.id) {
            setLoadingHistory(true);
            api.getHistory({ deviceId: device.id })
                .then(data => {
                    // Filtrar solo los últimos 5 eventos para el nodo
                    setHistoryEvents(data.slice(0, 5));
                    setLoadingHistory(false);
                })
                .catch(err => {
                    console.error('Error obteniendo historial del nodo:', err);
                    setLoadingHistory(false);
                });
        }
    }, [activeTab, device?.id, tripleDisparos]);

    if (!selectedDevice) {
        return (
            <div className="status-panel">
                <div className="panel-empty-state">
                    <div className="empty-icon">🗺️</div>
                    <h3>Selecciona un dispositivo</h3>
                    <p>Haz clic en un marcador del mapa para ver su información detallada</p>
                </div>
            </div>
        );
    }

    if (!device) {
        return (
            <div className="status-panel">
                <div className="panel-error">
                    <span className="error-icon">⚠️</span>
                    <p>Dispositivo no encontrado</p>
                </div>
            </div>
        );
    }

    const getStatusInfo = (status) => {
        const statusMap = {
            green: { label: 'Normal', icon: '✅', color: '#059669', bg: '#d1fae5' },
            yellow: { label: 'Precaución', icon: '⚠️', color: '#d97706', bg: '#fef3c7' },
            orange: { label: 'Alerta', icon: '🟠', color: '#ea580c', bg: '#ffedd5' },
            red: { label: 'Crítico', icon: '🚨', color: '#dc2626', bg: '#fee2e2' }
        };
        return statusMap[status] || statusMap.green;
    };

    const getWorstStatus = () => {
        if (!deviceTriples || deviceTriples.length === 0) return 'green';
        const statusPriority = { red: 4, orange: 3, yellow: 2, green: 1 };
        return deviceTriples.reduce((worst, triple) => {
            return statusPriority[triple.status] > statusPriority[worst] ? triple.status : worst;
        }, 'green');
    };

    const worstStatus = getWorstStatus();
    const statusInfo = getStatusInfo(worstStatus);

    // Obtener los datos del último triple disparo para simular las cuchillas físicas
    const latestTriple = deviceTriples && deviceTriples.length > 0 ? deviceTriples[0] : null;
    const c1 = latestTriple ? latestTriple.cuchilla1 : true;
    const c2 = latestTriple ? latestTriple.cuchilla2 : true;
    const c3 = latestTriple ? latestTriple.cuchilla3 : true;

    // Controladores de Zoom Interactivo (Mouse)
    const handleMouseDown = (e) => {
        if (zoomScale === 1) return;
        setIsDragging(true);
        dragStart.current = { x: e.clientX - panPos.x, y: e.clientY - panPos.y };
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPanPos({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Controladores de Zoom Interactivo (Touch)
    const handleTouchStart = (e) => {
        if (zoomScale === 1 || e.touches.length !== 1) return;
        setIsDragging(true);
        const touch = e.touches[0];
        dragStart.current = { x: touch.clientX - panPos.x, y: touch.clientY - panPos.y };
    };

    const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const touch = e.touches[0];
        setPanPos({
            x: touch.clientX - dragStart.current.x,
            y: touch.clientY - dragStart.current.y
        });
    };

    const handleZoomIn = () => {
        setZoomScale(prev => Math.min(prev + 0.5, 4));
    };

    const handleZoomOut = () => {
        setZoomScale(prev => {
            const next = Math.max(prev - 0.5, 1);
            if (next === 1) setPanPos({ x: 0, y: 0 });
            return next;
        });
    };

    const handleZoomReset = () => {
        setZoomScale(1);
        setPanPos({ x: 0, y: 0 });
    };

    return (
        <div className="status-panel">
            <div className="panel-header">
                <div className="device-badge">
                    <span className="badge-icon">📱</span>
                    <span className="badge-text">{device.chipNumber || device.chip_number}</span>
                </div>
                <div className="status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                    <span>{statusInfo.icon}</span>
                    <span>{statusInfo.label}</span>
                </div>
            </div>

            {/* PESTAÑAS DEL PANEL */}
            <div className="panel-tabs-header">
                <button 
                    className={`tab-btn ${activeTab === 'monitoring' ? 'active' : ''}`}
                    onClick={() => setActiveTab('monitoring')}
                >
                    🔍 Monitoreo
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📊 Historial Rápido
                </button>
            </div>

            <div className="panel-tab-content">
                {activeTab === 'monitoring' && (
                    <>
                        {/* SECCIÓN DE SIMULACIÓN DE CUCHILLAS FÍSICAS VERTICALES */}
                        <div className="panel-section">
                            <h4 className="section-title">⚡ Cuchillas Físicas (Media Tensión)</h4>
                            <div className="physical-cuchillas-container">
                                <PhysicalCuchilla phaseName="Fase A" label="Cuchilla 1" isActive={c1} />
                                <PhysicalCuchilla phaseName="Fase B" label="Cuchilla 2" isActive={c2} />
                                <PhysicalCuchilla phaseName="Fase C" label="Cuchilla 3" isActive={c3} />
                            </div>
                        </div>

                        {/* SECCIÓN DE DIAGNÓSTICO DE SEÑAL */}
                        <div className="panel-section">
                            <h4 className="section-title">📡 Diagnóstico de Red y Señal</h4>
                            <div className="diagnostic-grid">
                                <div className="diag-card">
                                    <span className="diag-icon">📡</span>
                                    <div className="diag-info">
                                        <span className="diag-label">Conexión</span>
                                        <span className="diag-value highlight">{device.connectionType || 'WiFi'}</span>
                                    </div>
                                </div>
                                <div className="diag-card">
                                    <span className="diag-icon">🕒</span>
                                    <div className="diag-info">
                                        <span className="diag-label">Último Ping</span>
                                        <span className={`diag-value ${device.isOnline ? 'online' : 'offline'}`}>
                                            {elapsedTimeText}
                                        </span>
                                    </div>
                                </div>
                                <div className="diag-card full-width">
                                    <span className="diag-icon">🌐</span>
                                    <div className="diag-info">
                                        <span className="diag-label">IP de Red</span>
                                        <span className="diag-value ip-addr">{device.ipAddress || '192.168.1.100'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* INFORMACIÓN GENERAL */}
                        <div className="panel-section">
                            <h4 className="section-title">ℹ️ Detalles del Dispositivo</h4>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Subestación</span>
                                    <span className="info-value">{device.subestacion || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Ubicación</span>
                                    <span className="info-value">{device.georeferencia || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* IMAGEN DEL POSTE CON ZOOM CLICKABLE */}
                        {(device.posteImage || device.poste_image) && (
                            <div className="panel-section">
                                <h4 className="section-title">📷 Imagen del Poste (Referencia)</h4>
                                <div className="poste-image-container" onClick={() => { setIsZoomOpen(true); handleZoomReset(); }}>
                                    <img src={device.posteImage || device.poste_image} alt="Poste" className="poste-image-thumb" />
                                    <div className="image-overlay-prompt">
                                        <span>🔍 Ampliar Imagen</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="panel-section">
                        <h4 className="section-title">📊 Últimos 5 Eventos en este Nodo</h4>
                        {loadingHistory ? (
                            <div className="history-loader">
                                <div className="spinner"></div>
                                <p>Cargando historial...</p>
                            </div>
                        ) : historyEvents.length > 0 ? (
                            <div className="fast-history-list">
                                {historyEvents.map((event, index) => (
                                    <div key={event.id || index} className={`fast-history-item ${event.status || 'green'}`}>
                                        <div className="history-item-marker"></div>
                                        <div className="history-item-content">
                                            <p className="history-item-message">{event.message}</p>
                                            <span className="history-item-time">
                                                {new Date(event.timestamp).toLocaleString('es-MX', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-events-state">
                                <p>No hay eventos registrados recientemente para este dispositivo.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL DE ZOOM INTERACTIVO */}
            {isZoomOpen && (device.posteImage || device.poste_image) && (
                <div className="zoom-modal-overlay" onClick={() => setIsZoomOpen(false)}>
                    <div className="zoom-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="zoom-modal-header">
                            <h3>🔍 Vista Ampliada del Poste</h3>
                            <button className="zoom-close-btn" onClick={() => setIsZoomOpen(false)}>×</button>
                        </div>
                        
                        <div 
                            className="zoom-image-viewport"
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleMouseUp}
                            style={{ cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                        >
                            <div 
                                className="zoom-image-wrapper"
                                style={{
                                    transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomScale})`,
                                    transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                                }}
                            >
                                <img 
                                    ref={imageRef}
                                    src={device.posteImage || device.poste_image} 
                                    alt="Poste Ampliado" 
                                    className="poste-image-zoomed"
                                    onMouseDown={handleMouseDown}
                                    onTouchStart={handleTouchStart}
                                    draggable="false"
                                />
                            </div>
                        </div>

                        <div className="zoom-controls">
                            <button className="zoom-btn" onClick={handleZoomOut} disabled={zoomScale === 1}>➖ Alejar</button>
                            <span className="zoom-level">{Math.round(zoomScale * 100)}%</span>
                            <button className="zoom-btn" onClick={handleZoomIn} disabled={zoomScale >= 4}>➕ Acercar</button>
                            <button className="zoom-btn reset" onClick={handleZoomReset}>🔄 Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusPanel;
