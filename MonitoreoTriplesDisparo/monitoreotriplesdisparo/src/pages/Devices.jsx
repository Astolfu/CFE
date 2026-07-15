import React from 'react';
import './Devices.css';
import DeviceForm from '../components/DeviceForm';
import TripleDisparoForm from '../components/TripleDisparoForm';

const Devices = ({
    devices,
    tripleDisparos,
    onAddDevice,
    onUpdateDevice,
    onDeleteDevice,
    onAddTripleDisparo,
    onDeleteTripleDisparo
}) => {
    console.log('🔧 Devices component - Dispositivos:', devices.length, 'Triples:', tripleDisparos.length);

    return (
        <div className="devices-page">
            <div className="page-header">
                <h1>Gestión de Dispositivos y Triples Disparos</h1>
                <div className="page-stats">
                    <span>📱 {devices.length} Dispositivos</span>
                    <span>⚡ {tripleDisparos.length} Triples Disparos</span>
                </div>
            </div>

            <div className="management-sections">
                {/* Sección de Dispositivos */}
                <div className="management-section">
                    <DeviceForm
                        devices={devices}
                        onAddDevice={onAddDevice}
                        onUpdateDevice={onUpdateDevice}
                        onDeleteDevice={onDeleteDevice}
                    />
                </div>

                {/* Sección de Triples Disparos */}
                <div className="management-section">
                    <TripleDisparoForm
                        devices={devices}
                        tripleDisparos={tripleDisparos}
                        onAddTripleDisparo={onAddTripleDisparo}
                        onDeleteTripleDisparo={onDeleteTripleDisparo}
                    />
                </div>
            </div>
        </div>
    );
};

export default Devices;