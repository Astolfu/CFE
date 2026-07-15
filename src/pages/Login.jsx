import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Credenciales hardcodeadas
        const VALID_USERNAME = 'Victor Gomez';
        const VALID_PASSWORD = 'TODOLOPUEDO';

        setTimeout(() => {
            if (formData.username === VALID_USERNAME && formData.password === VALID_PASSWORD) {
                // Login exitoso
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('username', VALID_USERNAME);
                onLogin();
            } else {
                setError('❌ Usuario o contraseña incorrectos');
                setIsLoading(false);
            }
        }, 500);
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-icon">⚡</div>
                    <h1>Monitor de Triples Disparos</h1>
                    <p>Sistema de Monitoreo y Alertas</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>👤 Usuario</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="Ingresa tu usuario"
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label>🔒 Contraseña</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Ingresa tu contraseña"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-login"
                        disabled={isLoading}
                    >
                        {isLoading ? '⏳ Verificando...' : '🚀 Iniciar Sesión'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>🔐 Acceso restringido solo para personal autorizado</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
