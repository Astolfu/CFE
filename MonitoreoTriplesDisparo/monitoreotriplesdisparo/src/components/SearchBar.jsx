import React, { useState, useEffect } from 'react';
import './SearchBar.css';

const SearchBar = ({ devices, tripleDisparos, onSearchSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('all');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        let results = [];

        const searchLower = searchTerm.toLowerCase();

        try {
            switch (searchType) {
                case 'chip':
                    results = devices
                        .filter(device =>
                            device.chipNumber?.toLowerCase().includes(searchLower) ||
                            device.id?.toLowerCase().includes(searchLower) ||
                            device.subestacion?.toLowerCase().includes(searchLower)
                        )
                        .map(device => ({
                            type: 'device',
                            id: device.id,
                            name: `📱 ${device.chipNumber} - ${device.subestacion}`,
                            georeferencia: device.georeferencia,
                            chipNumber: device.chipNumber,
                            subestacion: device.subestacion
                        }));
                    break;

                case 'triple':
                    results = tripleDisparos
                        .filter(td => td.id?.toLowerCase().includes(searchLower))
                        .map(td => {
                            const device = devices.find(d => d.id === td.chipId);
                            return {
                                type: 'triple',
                                id: td.id,
                                name: `⚡ ${td.id} - ${getStatusText(td.status)}`,
                                chipId: td.chipId,
                                deviceId: device?.id,
                                status: td.status,
                                subestacion: device?.subestacion
                            };
                        });
                    break;

                case 'subestacion':
                    results = devices
                        .filter(device => device.subestacion?.toLowerCase().includes(searchLower))
                        .map(device => ({
                            type: 'device',
                            id: device.id,
                            name: `🏭 ${device.subestacion} - ${device.chipNumber}`,
                            georeferencia: device.georeferencia,
                            chipNumber: device.chipNumber,
                            subestacion: device.subestacion
                        }));
                    break;

                case 'status':
                    const statusMap = {
                        'verde': 'green', 'green': 'green',
                        'amarillo': 'yellow', 'yellow': 'yellow',
                        'naranja': 'orange', 'orange': 'orange',
                        'rojo': 'red', 'red': 'red'
                    };
                    const status = statusMap[searchLower];
                    if (status) {
                        results = tripleDisparos
                            .filter(td => td.status === status)
                            .map(td => {
                                const device = devices.find(d => d.id === td.chipId);
                                return {
                                    type: 'triple',
                                    id: td.id,
                                    name: `⚡ ${td.id} - ${getStatusText(td.status)}`,
                                    chipId: td.chipId,
                                    deviceId: device?.id,
                                    status: td.status,
                                    subestacion: device?.subestacion
                                };
                            });
                    }
                    break;

                default:
                    const deviceResults = devices
                        .filter(device =>
                            device.chipNumber?.toLowerCase().includes(searchLower) ||
                            device.subestacion?.toLowerCase().includes(searchLower) ||
                            device.id?.toLowerCase().includes(searchLower)
                        )
                        .map(device => ({
                            type: 'device',
                            id: device.id,
                            name: `📱 ${device.chipNumber} - ${device.subestacion}`,
                            georeferencia: device.georeferencia,
                            chipNumber: device.chipNumber,
                            subestacion: device.subestacion
                        }));

                    const tripleResults = tripleDisparos
                        .filter(td =>
                            td.id?.toLowerCase().includes(searchLower) ||
                            getStatusText(td.status).toLowerCase().includes(searchLower)
                        )
                        .map(td => {
                            const device = devices.find(d => d.id === td.chipId);
                            return {
                                type: 'triple',
                                id: td.id,
                                name: `⚡ ${td.id} - ${getStatusText(td.status)}`,
                                chipId: td.chipId,
                                deviceId: device?.id,
                                status: td.status,
                                subestacion: device?.subestacion
                            };
                        });

                    results = [...deviceResults, ...tripleResults];
            }

            setSuggestions(results.slice(0, 8));
            setShowSuggestions(results.length > 0);
        } catch (error) {
            console.error('Error en búsqueda:', error);
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchTerm, searchType, devices, tripleDisparos]);

    const getStatusText = (status) => {
        const texts = {
            green: '3 Cuchillas 🟢',
            yellow: '2 Cuchillas 🟡',
            orange: '1 Cuchilla 🟠',
            red: '0 Cuchillas 🔴'
        };
        return texts[status] || status;
    };

    const getStatusColor = (status) => {
        const colors = {
            green: '#22c55e',
            yellow: '#eab308',
            orange: '#f97316',
            red: '#ef4444'
        };
        return colors[status];
    };

    const handleSuggestionClick = (suggestion) => {
        console.log('🔍 Suggestion clicked:', suggestion);
        onSearchSelect(suggestion);
        setSearchTerm('');
        setShowSuggestions(false);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (suggestions.length > 0) {
            handleSuggestionClick(suggestions[0]);
        }
    };

    const getSearchPlaceholder = () => {
        switch (searchType) {
            case 'chip': return 'Buscar por número de chip...';
            case 'triple': return 'Buscar por ID de triple disparo...';
            case 'subestacion': return 'Buscar por subestación...';
            case 'status': return 'Buscar por estado (verde, amarillo, etc.)...';
            default: return 'Buscar dispositivos, triples disparos...';
        }
    };

    return (
        <div className="search-bar-container">
            <form onSubmit={handleSearch} className="search-bar">
                <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="search-type"
                >
                    <option value="all">Todo</option>
                    <option value="chip">Chip</option>
                    <option value="triple">Triple</option>
                    <option value="subestacion">Subestación</option>
                    <option value="status">Estado</option>
                </select>

                <div className="search-input-container">
                    <input
                        type="text"
                        placeholder={getSearchPlaceholder()}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowSuggestions(suggestions.length > 0)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="search-input"
                    />

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="suggestions-dropdown">
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={`${suggestion.type}-${suggestion.id}-${index}`}
                                    className="suggestion-item"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    <div className="suggestion-content">
                                        <span className="suggestion-name">{suggestion.name}</span>
                                        {suggestion.status && (
                                            <span
                                                className="suggestion-status"
                                                style={{ backgroundColor: getStatusColor(suggestion.status) }}
                                            >
                                                {getStatusText(suggestion.status)}
                                            </span>
                                        )}
                                    </div>
                                    <small className="suggestion-type">
                                        {suggestion.type === 'device' ? '📱 Dispositivo' : '⚡ Triple Disparo'}
                                    </small>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button type="submit" className="search-button">
                    🔍 <span>Buscar</span>
                </button>
            </form>
        </div>
    );
};

export default SearchBar;