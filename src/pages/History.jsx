import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ChartsModal from '../components/ChartsModal';
import './History.css';

const History = () => {
    const [history, setHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [showChartsModal, setShowChartsModal] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        subestacion: '',
        dateFrom: '',
        dateTo: '',
        type: '',
        chipNumber: ''
    });

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [history, filters]);

    const loadHistory = async () => {
        try {
            const historyData = await api.getHistory();
            setHistory(historyData);
            console.log('📊 Historial cargado:', historyData.length, 'eventos');
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    };

    const applyFilters = () => {
        let filtered = history;

        if (filters.status) {
            filtered = filtered.filter(item => item.status === filters.status);
        }

        if (filters.subestacion) {
            filtered = filtered.filter(item =>
                item.subestacion?.toLowerCase().includes(filters.subestacion.toLowerCase())
            );
        }

        if (filters.type) {
            filtered = filtered.filter(item => item.type === filters.type);
        }

        if (filters.chipNumber) {
            filtered = filtered.filter(item =>
                item.chipNumber?.toLowerCase().includes(filters.chipNumber.toLowerCase())
            );
        }

        if (filters.dateFrom) {
            filtered = filtered.filter(item =>
                new Date(item.timestamp) >= new Date(filters.dateFrom)
            );
        }

        if (filters.dateTo) {
            filtered = filtered.filter(item =>
                new Date(item.timestamp) <= new Date(filters.dateTo + 'T23:59:59')
            );
        }

        setFilteredHistory(filtered);
    };

    const clearFilters = () => {
        setFilters({
            status: '',
            subestacion: '',
            dateFrom: '',
            dateTo: '',
            type: '',
            chipNumber: ''
        });
    };

    const getStatusText = (status) => {
        const texts = {
            green: '3 Cuchillas Activas 🟢',
            yellow: '2 Cuchillas Activas 🟡',
            orange: '1 Cuchilla Activa 🟠',
            red: '0 Cuchillas Activas 🔴'
        };
        return texts[status] || status;
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

    const getEventTypeText = (type) => {
        const texts = {
            'device_added': 'Dispositivo Agregado',
            'device_deleted': 'Dispositivo Eliminado',
            'triple_created': 'Triple Disparo Creado',
            'triple_updated': 'Triple Disparo Actualizado',
            'triple_deleted': 'Triple Disparo Eliminado'
        };
        return texts[type] || type;
    };

    const exportToCSV = () => {
        const headers = ['ID', 'Tipo', 'Triple Disparo', 'Chip ID', 'Subestación', 'Estado', 'Georeferencia', 'Fecha', 'Mensaje'];
        const csvData = filteredHistory.map(item => [
            item.id,
            getEventTypeText(item.type),
            item.tripleId || 'N/A',
            item.chipNumber || 'N/A',
            item.subestacion || 'N/A',
            item.status ? getStatusText(item.status) : 'N/A',
            item.georeferencia || 'N/A',
            new Date(item.timestamp).toLocaleString(),
            item.message || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historial_triples_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="history-page">
            <div className="page-header">
                <h1>📊 Historial de Eventos</h1>
                <div className="header-actions">
                    <button className="btn-charts" onClick={() => setShowChartsModal(true)}>
                        📈 Ver Gráficas
                    </button>
                    <button className="btn-secondary" onClick={exportToCSV}>
                        📥 Exportar CSV
                    </button>
                </div>
            </div>

            <div className="filters-section">
                <h3>🔍 Filtros de Búsqueda</h3>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>Estado</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">Todos los estados</option>
                            <option value="green">Verde (Normal)</option>
                            <option value="yellow">Amarillo (Precaución)</option>
                            <option value="orange">Naranja (Alerta)</option>
                            <option value="red">Rojo (Crítico)</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Tipo de Evento</label>
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        >
                            <option value="">Todos los tipos</option>
                            <option value="device_added">Dispositivo Agregado</option>
                            <option value="device_deleted">Dispositivo Eliminado</option>
                            <option value="triple_created">Triple Disparo Creado</option>
                            <option value="triple_updated">Triple Disparo Actualizado</option>
                            <option value="triple_deleted">Triple Disparo Eliminado</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Subestación</label>
                        <input
                            type="text"
                            placeholder="Buscar subestación..."
                            value={filters.subestacion}
                            onChange={(e) => setFilters({ ...filters, subestacion: e.target.value })}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Chip Number</label>
                        <input
                            type="text"
                            placeholder="Buscar chip..."
                            value={filters.chipNumber}
                            onChange={(e) => setFilters({ ...filters, chipNumber: e.target.value })}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Fecha desde</label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Fecha hasta</label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        />
                    </div>
                </div>

                <div className="filter-actions">
                    <button className="btn-secondary" onClick={clearFilters}>
                        🗑️ Limpiar
                    </button>
                </div>
            </div>

            <div className="history-summary">
                <div className="summary-card">
                    <h4>Total de Eventos</h4>
                    <span className="summary-count">{filteredHistory.length}</span>
                </div>
                <div className="summary-card">
                    <h4>Eventos Críticos</h4>
                    <span className="summary-count critical">
                        {filteredHistory.filter(item => item.status === 'red').length}
                    </span>
                </div>
                <div className="summary-card">
                    <h4>Eventos Recientes (7 días)</h4>
                    <span className="summary-count">
                        {filteredHistory.filter(item =>
                            new Date(item.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        ).length}
                    </span>
                </div>
            </div>

            <div className="history-table-container">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>ID Evento</th>
                            <th>Tipo</th>
                            <th>Triple Disparo</th>
                            <th>Chip ID</th>
                            <th>Subestación</th>
                            <th>Estado</th>
                            <th>Fecha y Hora</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistory.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="no-data">
                                    <div className="empty-state">
                                        <div className="empty-icon">📊</div>
                                        <h3>No hay eventos que coincidan con los filtros</h3>
                                        <p>Intenta ajustar los criterios de búsqueda</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredHistory.map(item => (
                                <tr key={item.id}>
                                    <td className="event-id">{item.id}</td>
                                    <td>
                                        <span className="event-type">{getEventTypeText(item.type)}</span>
                                    </td>
                                    <td>
                                        {item.tripleId ? (
                                            <strong className="triple-id">{item.tripleId}</strong>
                                        ) : (
                                            <span className="no-data-text">N/A</span>
                                        )}
                                    </td>
                                    <td>
                                        {item.chipNumber ? (
                                            <span className="chip-code">{item.chipNumber}</span>
                                        ) : (
                                            <span className="no-data-text">N/A</span>
                                        )}
                                    </td>
                                    <td>{item.subestacion || 'N/A'}</td>
                                    <td>
                                        {item.status ? (
                                            <span
                                                className="status-badge"
                                                style={{ backgroundColor: getStatusColor(item.status) }}
                                            >
                                                {getStatusText(item.status)}
                                            </span>
                                        ) : (
                                            <span className="no-data-text">N/A</span>
                                        )}
                                    </td>
                                    <td className="timestamp">{new Date(item.timestamp).toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Gráficas */}
            <ChartsModal
                isOpen={showChartsModal}
                onClose={() => setShowChartsModal(false)}
                historyData={filteredHistory}
            />
        </div>
    );
};

export default History;
