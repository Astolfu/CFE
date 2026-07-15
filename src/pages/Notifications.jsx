import React, { useState } from 'react';
import './Notifications.css';

const Notifications = ({ notifications, onMarkAsRead, onNotificationClick }) => {
    const [filter, setFilter] = useState('all');

    const filteredNotifications = notifications.filter(notification => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !notification.read;
        return notification.type === filter;
    });

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'info': return 'ℹ️';
            default: return '📢';
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'warning': return '#f59e0b';
            case 'error': return '#ef4444';
            case 'info': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    const handleMarkAsRead = (notificationId) => {
        onMarkAsRead(notificationId);
    };

    const handleMarkAllAsRead = () => {
        notifications.forEach(notification => {
            if (!notification.read) {
                onMarkAsRead(notification.id);
            }
        });
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="notifications-page">
            <div className="page-header">
                <h1>🔔 Notificaciones</h1>
                <div className="header-actions">
                    {unreadCount > 0 && (
                        <button className="btn-secondary" onClick={handleMarkAllAsRead}>
                            📬 Marcar todas como leídas
                        </button>
                    )}
                    <span className="badge">{unreadCount} sin leer</span>
                </div>
            </div>

            {/* Filtros */}
            <div className="filters-section">
                <div className="filter-buttons">
                    <button
                        className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
                        onClick={() => setFilter('all')}
                    >
                        Todas ({notifications.length})
                    </button>
                    <button
                        className={filter === 'unread' ? 'filter-btn active' : 'filter-btn'}
                        onClick={() => setFilter('unread')}
                    >
                        No leídas ({unreadCount})
                    </button>
                    <button
                        className={filter === 'warning' ? 'filter-btn active' : 'filter-btn'}
                        onClick={() => setFilter('warning')}
                    >
                        Advertencias
                    </button>
                </div>
            </div>

            {/* Lista de notificaciones */}
            <div className="notifications-list">
                {filteredNotifications.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🎉</div>
                        <h3>No hay notificaciones</h3>
                        <p>Todo está funcionando correctamente</p>
                    </div>
                ) : (
                    filteredNotifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`notification-card ${notification.read ? 'read' : 'unread'}`}
                            style={{
                                borderLeft: `4px solid ${getNotificationColor(notification.type)}`,
                                cursor: 'pointer'
                            }}
                            onClick={() => onNotificationClick && onNotificationClick(notification)}
                        >
                            <div className="notification-header">
                                <span className="notification-icon">
                                    {getNotificationIcon(notification.type)}
                                </span>
                                <div className="notification-title">
                                    <h4>{notification.message}</h4>
                                    <small>{new Date(notification.timestamp).toLocaleString()}</small>
                                </div>
                                {!notification.read && (
                                    <span className="unread-dot"></span>
                                )}
                            </div>

                            <div className="notification-details">
                                {notification.tripleId && (
                                    <p><strong>Triple Disparo:</strong> {notification.tripleId}</p>
                                )}
                                {notification.chipId && (
                                    <p><strong>Chip ID:</strong> {notification.chipId}</p>
                                )}
                                {notification.subestacion && (
                                    <p><strong>Subestación:</strong> {notification.subestacion}</p>
                                )}
                                {notification.georeferencia && (
                                    <p><strong>Ubicación:</strong> {notification.georeferencia}</p>
                                )}
                            </div>

                            <div className="notification-actions">
                                {!notification.read && (
                                    <button
                                        className="btn-mark-read"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkAsRead(notification.id);
                                        }}
                                    >
                                        ✅ Marcar como leída
                                    </button>
                                )}
                                <span className={`notification-status ${notification.read ? 'read' : 'unread'}`}>
                                    {notification.read ? '📬 Leída' : '📪 No leída'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notifications;