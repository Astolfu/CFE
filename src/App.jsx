import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import History from './pages/History';
import Notifications from './pages/Notifications';
import Contacts from './pages/Contacts';
import Login from './pages/Login';
import { api } from './services/api';
import './App.css';

function App() {
    // Estado de autenticación
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentView, setCurrentView] = useState('dashboard');
    const [devices, setDevices] = useState([]);
    const [tripleDisparos, setTripleDisparos] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [targetDeviceId, setTargetDeviceId] = useState(null);

    // Verificar autenticación al cargar
    useEffect(() => {
        const authStatus = localStorage.getItem('isAuthenticated');
        if (authStatus === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    const handleLogin = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('username');
        setIsAuthenticated(false);
        setCurrentView('dashboard');
    };

    // ... (existing code)



    // ...



    // ...



    // Cargar todos los datos al iniciar
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [devicesData, triplesData, contactsData, notificationsData] = await Promise.all([
                api.getDevices(),
                api.getTripleDisparos(),
                api.getContacts(),
                api.getNotifications().catch(() => []) // Si falla, usar array vacío
            ]);

            setDevices(devicesData);
            setTripleDisparos(triplesData);
            setContacts(contactsData);
            setNotifications(notificationsData);
        } catch (error) {
            console.error('Error loading data:', error);
            setError('Error cargando datos del servidor. Verifica que el backend esté ejecutándose.');
        } finally {
            setLoading(false);
        }
    };
    // Función para actualizar dispositivos
    const updateDevice = async (deviceId, deviceData) => {
        try {
            const response = await fetch(`http://localhost:3001/api/devices/${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(deviceData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(errorData.error || 'Error actualizando dispositivo');
            }

            const result = await response.json();

            // Actualizar el estado local
            setDevices(prev =>
                prev.map(device =>
                    device.id === deviceId ? result.device : device
                )
            );

            return result.device;
        } catch (error) {
            console.error('Error updating device:', error);
            throw error;
        }
    };

    // Función para manejar actualizaciones de prueba
    const handleTestUpdate = async (updatedTriple) => {
        try {
            // Recargar los triples disparos para obtener los datos actualizados
            const triplesData = await api.getTripleDisparos();
            setTripleDisparos(triplesData);
        } catch (error) {
            console.error('Error updating triples:', error);
            alert('Error actualizando datos: ' + error.message);
        }
    };

    // Funciones para dispositivos
    const addDevice = async (device) => {
        try {
            const newDevice = await api.addDevice(device);
            setDevices(prev => [...prev, newDevice]);
            return newDevice;
        } catch (error) {
            console.error('Error adding device:', error);
            throw error;
        }
    };

    const deleteDevice = async (deviceId) => {
        try {
            await api.deleteDevice(deviceId);
            setDevices(prev => prev.filter(device => device.id !== deviceId));
            setTripleDisparos(prev => prev.filter(triple => triple.chipId !== deviceId));
        } catch (error) {
            console.error('Error deleting device:', error);
            alert('Error eliminando dispositivo: ' + error.message);
        }
    };

    // Funciones para triples disparos
    const addTripleDisparo = async (triple) => {
        try {
            const newTriple = await api.addTripleDisparo(triple);
            setTripleDisparos(prev => [...prev, newTriple]);
            return newTriple;
        } catch (error) {
            console.error('Error adding triple disparo:', error);
            throw error;
        }
    };

    const deleteTripleDisparo = async (tripleId) => {
        try {
            await api.deleteTripleDisparo(tripleId);
            setTripleDisparos(prev => prev.filter(triple => triple.id !== tripleId));
        } catch (error) {
            console.error('Error deleting triple disparo:', error);
            alert('Error eliminando triple disparo: ' + error.message);
        }
    };

    // Funciones para contactos
    const addContact = async (contact) => {
        try {
            const newContact = await api.addContact(contact);
            setContacts(prev => [...prev, newContact]);
            return newContact;
        } catch (error) {
            console.error('Error adding contact:', error);
            throw error;
        }
    };

    const deleteContact = async (contactId) => {
        try {
            await api.deleteContact(contactId);
            setContacts(prev => prev.filter(contact => contact.id !== contactId));
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Error eliminando contacto: ' + error.message);
        }
    };

    const markNotificationAsRead = async (notificationId) => {
        try {
            await api.markNotificationAsRead(notificationId);
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, read: true }
                        : notification
                )
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const unreadNotificationsCount = notifications.filter(n => !n.read).length;

    const handleNotificationClick = async (notification) => {
        // 1. Marcar como leída
        if (!notification.read) {
            await markNotificationAsRead(notification.id);
        }

        // 2. Identificar el dispositivo objetivo
        let deviceId = null;
        if (notification.chipId) {
            // Intentar encontrar por ID o por Chip Number
            const device = devices.find(d => d.id === notification.chipId || d.chipNumber === notification.chipId);
            if (device) {
                deviceId = device.id;
            }
        } else if (notification.tripleId) {
            // Si tiene tripleId, buscamos el triple para obtener el chipId
            const triple = tripleDisparos.find(t => t.id === notification.tripleId);
            if (triple) {
                deviceId = triple.chipId;
            }
        }

        // 3. Navegar al dashboard y seleccionar
        if (deviceId) {
            setTargetDeviceId(deviceId);
            setCurrentView('dashboard');
        } else {
            console.warn('No se pudo identificar el dispositivo para la notificación:', notification);
            setCurrentView('dashboard');
        }
    };

    // Si no está autenticado, mostrar login
    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    if (loading) {
        return (
            <div className="app-loading">
                <div className="loading-spinner"></div>
                <p>Cargando datos del servidor...</p>
                <small>Conectando con la base de datos MySQL</small>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app-error">
                <div className="error-icon">❌</div>
                <h2>Error de Conexión</h2>
                <p>{error}</p>
                <div className="error-actions">
                    <button onClick={loadAllData} className="btn-primary">
                        🔄 Reintentar
                    </button>
                    <div className="error-tips">
                        <h4>Verifica que:</h4>
                        <ul>
                            <li>El servidor backend esté ejecutándose en puerto 3001</li>
                            <li>La base de datos MySQL esté activa</li>
                            <li>Las credenciales de la base de datos sean correctas</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <nav className="navbar">
                <div className="nav-brand">
                    <h2>⚡ Monitoreo Triples Disparos</h2>
                </div>
                <div className="nav-buttons">
                    <button
                        className={currentView === 'dashboard' ? 'active' : ''}
                        onClick={() => setCurrentView('dashboard')}
                    >
                        🗺️ Dashboard
                    </button>
                    <button
                        className={currentView === 'devices' ? 'active' : ''}
                        onClick={() => setCurrentView('devices')}
                    >
                        📱 Dispositivos ({devices.length})
                    </button>
                    <button
                        className={currentView === 'history' ? 'active' : ''}
                        onClick={() => setCurrentView('history')}
                    >
                        📊 Historial
                    </button>
                    <button
                        className={currentView === 'notifications' ? 'active' : ''}
                        onClick={() => setCurrentView('notifications')}
                    >
                        🔔 Notificaciones ({unreadNotificationsCount})
                    </button>
                    <button
                        className={currentView === 'contacts' ? 'active' : ''}
                        onClick={() => setCurrentView('contacts')}
                    >
                        👥 Contactos ({contacts.length})
                    </button>
                    <button
                        className="btn-logout"
                        onClick={handleLogout}
                        title="Cerrar sesión"
                    >
                        🚪 Salir
                    </button>
                </div>
            </nav>

            <div className="main-content">
                {currentView === 'dashboard' && (
                    <Dashboard
                        devices={devices}
                        tripleDisparos={tripleDisparos}
                        notifications={notifications}
                        onTestUpdate={handleTestUpdate}
                        initialSelectedDeviceId={targetDeviceId}
                    />
                )}
                {currentView === 'devices' && (
                    <Devices
                        devices={devices}
                        tripleDisparos={tripleDisparos}
                        onAddDevice={addDevice}
                        onUpdateDevice={updateDevice}
                        onDeleteDevice={deleteDevice}
                        onAddTripleDisparo={addTripleDisparo}
                        onDeleteTripleDisparo={deleteTripleDisparo}
                    />
                )}
                {currentView === 'history' && (
                    <History
                        devices={devices}
                        tripleDisparos={tripleDisparos}
                    />
                )}
                {currentView === 'notifications' && (
                    <Notifications
                        notifications={notifications}
                        onMarkAsRead={markNotificationAsRead}
                        onNotificationClick={handleNotificationClick}
                    />
                )}
                {currentView === 'contacts' && (
                    <Contacts
                        contacts={contacts}
                        onAddContact={addContact}
                        onDeleteContact={deleteContact}
                    />
                )}
            </div>

            <footer className="app-footer">
                <p>
                    Sistema de Monitoreo |
                    Dispositivos: {devices.length} |
                    Triples: {tripleDisparos.length} |
                    Contactos: {contacts.length}
                </p>
            </footer>
        </div>
    );
}

export default App;