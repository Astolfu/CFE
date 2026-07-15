import React, { useState, useEffect, useRef, useCallback } from 'react';

const MapComponent = ({ devices, tripleDisparos, onDeviceClick, selectedDevice, searchResult }) => {
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(null);
    const [currentSelectedDevice, setCurrentSelectedDevice] = useState(selectedDevice);
    const [mapType, setMapType] = useState('roadmap');
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const infoWindowsRef = useRef([]);

    // Función para crear el contenido del InfoWindow
    const createInfoWindowContent = (device, deviceTriples, hasWarning, criticalCount) => {
        const statusTexts = {
            green: '🟢 3 Cuchillas',
            yellow: '🟡 2 Cuchillas',
            orange: '🟠 1 Cuchilla',
            red: '🔴 0 Cuchillas'
        };

        return `
            <div class="device-info-window">
                <div class="device-header">
                    <h3>📱 ${device.chipNumber || 'N/A'}</h3>
                    <div class="device-status ${hasWarning ? 'warning' : 'normal'}">
                        ${hasWarning ? '⚠️ CON ALERTAS' : '✅ NORMAL'}
                    </div>
                </div>
                
                <div class="device-details">
                    <p><strong>🏭 Subestación:</strong> ${device.subestacion || 'N/A'}</p>
                    <p><strong>📍 Ubicación:</strong> ${device.georeferencia || 'N/A'}</p>
                    <p><strong>📅 Registrado:</strong> ${device.timestamp ? new Date(device.timestamp).toLocaleDateString() : 'N/A'}</p>
                </div>

                ${device.posteImage ? `
                    <div class="poste-image-section">
                        <h4>📸 Foto del Poste:</h4>
                        <div class="poste-image-container">
                            <img src="${device.posteImage}" alt="Foto del poste ${device.chipNumber}" 
                                 onclick="window.openImageModal('${device.posteImage}')" />
                            <button class="view-image-btn" onclick="window.openImageModal('${device.posteImage}')">
                                🔍 Ver imagen completa
                            </button>
                        </div>
                    </div>
                ` : ''}

                <div class="triples-section">
                    <h4>⚡ Triples Disparos Asociados: ${deviceTriples.length}</h4>
                    ${deviceTriples.length > 0 ? `
                        <div class="triples-list">
                            ${deviceTriples.map(triple => `
                                <div class="triple-item ${triple.status}">
                                    <span class="triple-id">${triple.id}</span>
                                    <span class="triple-status ${triple.status}">
                                        ${statusTexts[triple.status] || 'Estado desconocido'}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="no-triples">No hay triples disparos asociados</p>'}
                </div>

                ${criticalCount > 0 ? `
                    <div class="critical-alert">
                        ⚠️ <strong>${criticalCount} alerta(s) crítica(s)</strong>
                    </div>
                ` : ''}

                <div class="info-window-actions">
                    <button onclick="window.selectDeviceInMap('${device.id}')" class="view-details-btn">
                        👁️ Ver Detalles en Panel
                    </button>
                </div>
            </div>
        `;
    };

    const addMarkersToMap = useCallback(() => {
        if (!mapInstanceRef.current || !devices || devices.length === 0) {
            console.log('No hay dispositivos para mostrar en el mapa');
            return;
        }

        try {
            // Limpiar marcadores anteriores
            markersRef.current.forEach(marker => {
                if (marker) marker.setMap(null);
            });
            infoWindowsRef.current.forEach(infoWindow => {
                if (infoWindow) infoWindow.close();
            });

            markersRef.current = [];
            infoWindowsRef.current = [];

            console.log(`🗺️ Agregando ${devices.length} marcadores al mapa`);

            devices.forEach(device => {
                try {
                    // Parsear coordenadas
                    let lat = 19.4326;
                    let lng = -99.1332;

                    if (device.georeferencia && typeof device.georeferencia === 'string' && device.georeferencia.includes(',')) {
                        const coords = device.georeferencia.split(',').map(coord => parseFloat(coord.trim()));
                        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                            lat = coords[0];
                            lng = coords[1];
                        }
                    }

                    const deviceTriples = tripleDisparos.filter(td => td.chipId === device.id);
                    const alertLevel = deviceTriples.some(td => td.status === 'red')
                        ? 'red'
                        : deviceTriples.some(td => td.status === 'orange')
                            ? 'orange'
                            : deviceTriples.some(td => td.status === 'yellow')
                                ? 'yellow'
                                : 'green';
                    const hasWarning = alertLevel !== 'green';
                    const criticalCount = deviceTriples.filter(td => ['red', 'orange', 'yellow'].includes(td.status)).length;
                    const statusColors = {
                        green: '#22c55e',
                        yellow: '#facc15',
                        orange: '#fb923c',
                        red: '#ef4444',
                        gray: '#94a3b8'
                    };
                    const markerColor = device.status === 'offline' ? statusColors.gray : statusColors[alertLevel] || statusColors.green;

                    // Crear marcador
                    const marker = new window.google.maps.Marker({
                        position: { lat, lng },
                        map: mapInstanceRef.current,
                        title: `${device.chipNumber} - ${device.subestacion}`,
                        optimized: false,
                        zIndex: hasWarning ? 1000 : 1,
                        animation: hasWarning ? window.google.maps.Animation.BOUNCE : null,
                        icon: {
                            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <radialGradient id="pulse" cx="50%" cy="50%" r="60%">
                                            <stop offset="0%" stop-color="${markerColor}" stop-opacity="0.45" />
                                            <stop offset="100%" stop-color="${markerColor}" stop-opacity="0" />
                                        </radialGradient>
                                    </defs>
                                    <circle cx="22" cy="22" r="18" fill="url(#pulse)" />
                                    <circle cx="22" cy="22" r="14" fill="${markerColor}" stroke="#ffffff" stroke-width="2.5" />
                                    <text x="22" y="27" text-anchor="middle" fill="white" font-family="Arial" font-size="11" font-weight="700">
                                        ${(device.chipNumber || 'CHP').slice(-3)}
                                    </text>
                                </svg>
                            `)}`,
                            scaledSize: new window.google.maps.Size(44, 44),
                            anchor: new window.google.maps.Point(22, 22)
                        }
                    });

                    if (hasWarning) {
                        setTimeout(() => marker.setAnimation(null), 1800);
                    }

                    // Crear InfoWindow
                    const infoWindow = new window.google.maps.InfoWindow({
                        content: createInfoWindowContent(device, deviceTriples, hasWarning, criticalCount)
                    });

                    // Agregar evento click al marcador
                    marker.addListener('click', () => {
                        infoWindowsRef.current.forEach(iw => {
                            if (iw && iw !== infoWindow) iw.close();
                        });

                        if (mapInstanceRef.current) {
                            mapInstanceRef.current.panTo(marker.getPosition());
                            mapInstanceRef.current.setZoom(15);
                        }

                        infoWindow.open(mapInstanceRef.current, marker);
                        setCurrentSelectedDevice(device.id);
                        onDeviceClick(device.id);
                    });

                    markersRef.current.push(marker);
                    infoWindowsRef.current.push(infoWindow);

                } catch (error) {
                    console.error('Error creating marker for device:', device.id, error);
                }
            });

            // Si hay un dispositivo seleccionado, centrar en él
            if (currentSelectedDevice) {
                centerMapOnDevice(currentSelectedDevice);
            }

        } catch (error) {
            console.error('Error adding markers to map:', error);
        }
    }, [devices, tripleDisparos, currentSelectedDevice, onDeviceClick]);

    const centerMapOnDevice = useCallback((deviceId) => {
        const device = devices.find(d => d.id === deviceId);
        if (device && device.georeferencia && mapInstanceRef.current) {
            try {
                const [lat, lng] = device.georeferencia.split(',').map(coord => parseFloat(coord.trim()));
                mapInstanceRef.current.panTo({ lat, lng });
                mapInstanceRef.current.setZoom(15);

                // Encontrar y abrir el infoWindow del dispositivo seleccionado
                const markerIndex = devices.findIndex(d => d.id === deviceId);
                if (markerIndex !== -1 && infoWindowsRef.current[markerIndex]) {
                    // Cerrar todos los infoWindows primero
                    infoWindowsRef.current.forEach(iw => {
                        if (iw) iw.close();
                    });

                    // Abrir el infoWindow del dispositivo seleccionado
                    setTimeout(() => {
                        if (infoWindowsRef.current[markerIndex] && markersRef.current[markerIndex]) {
                            infoWindowsRef.current[markerIndex].open(
                                mapInstanceRef.current,
                                markersRef.current[markerIndex]
                            );
                        }
                    }, 300);
                }
            } catch (error) {
                console.error('Error centering on selected device:', error);
            }
        }
    }, [devices]);

    const initMap = useCallback(() => {
        if (!window.google) {
            setMapError('Google Maps no está disponible');
            return;
        }

        try {
            const mapOptions = {
                zoom: 10,
                center: { lat: 20.696417743733047, lng: -88.18973457438301 },
                mapTypeId: 'roadmap',
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                    position: window.google.maps.ControlPosition.TOP_RIGHT
                },
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true,
                gestureHandling: 'greedy',
                styles: [
                    {
                        featureType: "all",
                        elementType: "geometry",
                        stylers: [{ color: "#242f3e" }]
                    },
                    {
                        featureType: "all",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#746855" }]
                    },
                    {
                        featureType: "all",
                        elementType: "labels.text.stroke",
                        stylers: [{ color: "#242f3e" }]
                    },
                    {
                        featureType: "water",
                        elementType: "geometry",
                        stylers: [{ color: "#17263c" }]
                    }
                ]
            };

            mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
            setMapLoaded(true);
            addMarkersToMap();
        } catch (error) {
            console.error('Error initializing map:', error);
            setMapError('Error al inicializar el mapa');
        }
    }, [addMarkersToMap]);

    // Manejar resultados de búsqueda
    useEffect(() => {
        if (searchResult && mapLoaded && mapInstanceRef.current) {
            console.log('🗺️ Centrando mapa en resultado de búsqueda:', searchResult);

            let targetDeviceId = null;

            if (searchResult.type === 'device') {
                targetDeviceId = searchResult.id;
            } else if (searchResult.type === 'triple') {
                targetDeviceId = searchResult.chipId;
            }

            if (targetDeviceId) {
                setCurrentSelectedDevice(targetDeviceId);
                centerMapOnDevice(targetDeviceId);
                onDeviceClick(targetDeviceId);
            }
        }
    }, [searchResult, mapLoaded, centerMapOnDevice, onDeviceClick]);

    // Cargar Google Maps API
    useEffect(() => {
        const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        if (!API_KEY) {
            setMapError('API Key de Google Maps no configurada en el archivo .env');
            return;
        }

        if (window.google && window.google.maps) {
            console.log('✅ Google Maps ya está cargado');
            initMap();
            return;
        }

        const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
        if (existingScript) {
            console.log('🔄 Reutilizando script existente de Google Maps');
            existingScript.addEventListener('load', () => initMap(), { once: true });
            return;
        }

        // Configurar funciones globales antes de cargar el script
        window.selectDeviceInMap = (deviceId) => {
            onDeviceClick(deviceId);
            infoWindowsRef.current.forEach(iw => {
                if (iw) iw.close();
            });
        };

        window.openImageModal = (imageUrl) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                cursor: pointer;
            `;

            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.cssText = `
                max-width: 90%;
                max-height: 90%;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            `;

            modal.appendChild(img);
            modal.onclick = () => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            };
            document.body.appendChild(modal);
        };

        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            console.log('✅ Google Maps API cargada correctamente');
            setTimeout(initMap, 100);
        };

        script.onerror = () => {
            console.error('❌ Error cargando Google Maps API');
            setMapError('Error al cargar Google Maps API. Verifica tu API Key.');
        };

        document.head.appendChild(script);

        return () => {
            // Cleanup
            markersRef.current.forEach(marker => {
                if (marker) marker.setMap(null);
            });
            infoWindowsRef.current.forEach(infoWindow => {
                if (infoWindow) infoWindow.close();
            });
        };
    }, [initMap, onDeviceClick]);

    // Actualizar marcadores cuando cambien los dispositivos
    useEffect(() => {
        if (mapLoaded && mapInstanceRef.current) {
            addMarkersToMap();
        }
    }, [addMarkersToMap, mapLoaded]);

    // Manejar cambios en el dispositivo seleccionado
    useEffect(() => {
        if (selectedDevice && selectedDevice !== currentSelectedDevice) {
            setCurrentSelectedDevice(selectedDevice);
            if (mapLoaded) {
                centerMapOnDevice(selectedDevice);
            }
        }
    }, [selectedDevice, currentSelectedDevice, mapLoaded, centerMapOnDevice]);

    const handleMapTypeToggle = (nextMode) => {
        setMapType(nextMode);
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setMapTypeId(nextMode === 'satellite' ? 'hybrid' : 'roadmap');
        }
    };

    if (mapError) {
        return (
            <div className="map-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                <div className="map-error-state">
                    <div className="error-icon">🗺️</div>
                    <h3>Error al cargar el mapa</h3>
                    <p>{mapError}</p>
                    <div className="debug-info">
                        <p><strong>Dispositivos:</strong> {devices?.length || 0}</p>
                        <p><strong>Triples:</strong> {tripleDisparos?.length || 0}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="map-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
            {!mapLoaded && !mapError && (
                <div className="map-loading">
                    <div className="loading-spinner"></div>
                    <p>Cargando mapa de Google...</p>
                    <small>Dispositivos: {devices?.length || 0} | Triples: {tripleDisparos?.length || 0}</small>
                </div>
            )}

            <div
                ref={mapRef}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '8px',
                    display: mapLoaded ? 'block' : 'none'
                }}
            />

            <div className="map-controls-floating">
                <button
                    type="button"
                    className={`map-view-toggle ${mapType === 'roadmap' ? 'active' : ''}`}
                    onClick={() => handleMapTypeToggle('roadmap')}
                >
                    🗺️ Mapa
                </button>
                <button
                    type="button"
                    className={`map-view-toggle ${mapType === 'satellite' ? 'active' : ''}`}
                    onClick={() => handleMapTypeToggle('satellite')}
                >
                    🛰️ Satélite
                </button>
            </div>

            <div className="map-floating-legend">
                <h4>📌 Leyenda</h4>
                <div className="legend-row"><span className="legend-dot green"></span> Verde — Normal</div>
                <div className="legend-row"><span className="legend-dot yellow"></span> Amarillo — 1 falla</div>
                <div className="legend-row"><span className="legend-dot orange"></span> Naranja — 2 fallas</div>
                <div className="legend-row"><span className="legend-dot red"></span> Rojo — Disparo total</div>
                <div className="legend-row"><span className="legend-dot gray"></span> Gris — Desconectado / Offline</div>
            </div>
        </div>
    );
};

export default MapComponent;