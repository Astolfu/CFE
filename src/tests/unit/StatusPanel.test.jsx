// ============================================================
// PRUEBAS UNITARIAS: StatusPanel.jsx
// Verifica que el componente renderice el color/badge correcto
// según los estados pasados por props
// ============================================================

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeAll } from 'vitest';
import StatusPanel from '../../components/StatusPanel';

// ── Mock de la API (para que el componente no haga fetch reales) ──
vi.mock('../../services/api', () => ({
    api: {
        getHistory: vi.fn().mockResolvedValue([])
    }
}));

// ── Mock de StatusPanel.css (no necesitamos estilos en tests) ──
vi.mock('../../components/StatusPanel.css', () => ({}));

// ── Datos de prueba reutilizables ─────────────────────────────
const mockDevice = {
    id: 'DEV001',
    chipNumber: 'CHIP-TEST-01',
    subestacion: 'Subestación Norte',
    georeferencia: '14.0723,-89.2182',
    connectionType: 'WiFi',
    ipAddress: '192.168.1.100',
    isOnline: true,
    lastSeen: new Date().toISOString(),
    posteImage: null
};

const buildTriples = (cuchilla1, cuchilla2, cuchilla3, status) => [{
    id: 'TD001',
    cuchilla1,
    cuchilla2,
    cuchilla3,
    status,
    timestamp: new Date().toISOString()
}];

// ── Helper: renderiza StatusPanel con props dadas ─────────────
function renderPanel({ triples = [], selectedDevice = 'DEV001', devices = [mockDevice] } = {}) {
    return render(
        <StatusPanel
            devices={devices}
            tripleDisparos={triples}
            selectedDevice={selectedDevice}
            deviceTriples={triples}
        />
    );
}

// ============================================================
// SUITE 1: Badges de estado (color y etiqueta)
// ============================================================
describe('StatusPanel — Badge de estado según props', () => {

    test('Con status "green" muestra badge "Normal"', () => {
        renderPanel({
            triples: buildTriples(true, true, true, 'green')
        });
        expect(screen.getByText('Normal')).toBeInTheDocument();
    });

    test('Con status "yellow" muestra badge "Precaución"', () => {
        renderPanel({
            triples: buildTriples(false, true, true, 'yellow')
        });
        expect(screen.getByText('Precaución')).toBeInTheDocument();
    });

    test('Con status "orange" muestra badge "Alerta"', () => {
        renderPanel({
            triples: buildTriples(true, false, false, 'orange')
        });
        expect(screen.getByText('Alerta')).toBeInTheDocument();
    });

    test('Con status "red" muestra badge "Crítico"', () => {
        renderPanel({
            triples: buildTriples(false, false, false, 'red')
        });
        expect(screen.getByText('Crítico')).toBeInTheDocument();
    });

    test('Sin triples (array vacío) muestra badge "Normal" por defecto', () => {
        renderPanel({ triples: [] });
        expect(screen.getByText('Normal')).toBeInTheDocument();
    });
});

// ============================================================
// SUITE 2: Estado visual de las cuchillas físicas
// ============================================================
describe('StatusPanel — Cuchillas físicas (PhysicalCuchilla)', () => {

    test('Cuchilla cerrada (isActive=true) muestra texto "CERRADA"', () => {
        renderPanel({
            triples: buildTriples(true, true, true, 'green')
        });
        const cerradas = screen.getAllByText('CERRADA');
        expect(cerradas).toHaveLength(3);
    });

    test('Cuchilla disparada (isActive=false) muestra "ABIERTA / DISPARADA"', () => {
        renderPanel({
            triples: buildTriples(false, false, false, 'red')
        });
        const abiertas = screen.getAllByText('ABIERTA / DISPARADA');
        expect(abiertas).toHaveLength(3);
    });

    test('Estado mixto: 1 cerrada + 2 abiertas (status "orange")', () => {
        renderPanel({
            triples: buildTriples(true, false, false, 'orange')
        });
        expect(screen.getAllByText('CERRADA')).toHaveLength(1);
        expect(screen.getAllByText('ABIERTA / DISPARADA')).toHaveLength(2);
    });

    test('Estado mixto: 2 cerradas + 1 abierta (status "yellow")', () => {
        renderPanel({
            triples: buildTriples(true, true, false, 'yellow')
        });
        expect(screen.getAllByText('CERRADA')).toHaveLength(2);
        expect(screen.getAllByText('ABIERTA / DISPARADA')).toHaveLength(1);
    });

    test('Las 3 fases aparecen en el panel (Fase A, B, C)', () => {
        renderPanel({
            triples: buildTriples(true, true, true, 'green')
        });
        expect(screen.getByText('Fase A')).toBeInTheDocument();
        expect(screen.getByText('Fase B')).toBeInTheDocument();
        expect(screen.getByText('Fase C')).toBeInTheDocument();
    });
});

// ============================================================
// SUITE 3: Estado vacío — sin dispositivo seleccionado
// ============================================================
describe('StatusPanel — Estado sin dispositivo', () => {

    test('Sin selectedDevice muestra mensaje "Selecciona un dispositivo"', () => {
        renderPanel({ selectedDevice: null });
        expect(screen.getByText('Selecciona un dispositivo')).toBeInTheDocument();
    });

    test('Con selectedDevice inválido (no existe en devices) muestra error', () => {
        renderPanel({
            selectedDevice: 'DEV-NO-EXISTE',
            devices: [mockDevice]
        });
        expect(screen.getByText('Dispositivo no encontrado')).toBeInTheDocument();
    });
});

// ============================================================
// SUITE 4: Información del dispositivo renderizada
// ============================================================
describe('StatusPanel — Información del dispositivo', () => {

    test('Muestra el chipNumber del dispositivo', () => {
        renderPanel({ triples: buildTriples(true, true, true, 'green') });
        expect(screen.getByText('CHIP-TEST-01')).toBeInTheDocument();
    });

    test('Muestra la subestación del dispositivo', () => {
        renderPanel({ triples: buildTriples(true, true, true, 'green') });
        expect(screen.getByText('Subestación Norte')).toBeInTheDocument();
    });

    test('Muestra la georeferencia del dispositivo', () => {
        renderPanel({ triples: buildTriples(true, true, true, 'green') });
        expect(screen.getByText('14.0723,-89.2182')).toBeInTheDocument();
    });
});

// ============================================================
// SUITE 5: Peor estado (worst status) con múltiples triples
// ============================================================
describe('StatusPanel — getWorstStatus con múltiples triples', () => {

    test('Si hay un triple "red" entre varios, muestra badge "Crítico"', () => {
        const multiTriples = [
            { id: 'TD1', cuchilla1: true,  cuchilla2: true,  cuchilla3: true,  status: 'green',  timestamp: new Date().toISOString() },
            { id: 'TD2', cuchilla1: false, cuchilla2: false, cuchilla3: false, status: 'red',    timestamp: new Date().toISOString() },
            { id: 'TD3', cuchilla1: true,  cuchilla2: false, cuchilla3: true,  status: 'yellow', timestamp: new Date().toISOString() },
        ];
        renderPanel({ triples: multiTriples });
        expect(screen.getByText('Crítico')).toBeInTheDocument();
    });

    test('Si el peor triple es "yellow", muestra badge "Precaución"', () => {
        const multiTriples = [
            { id: 'TD1', cuchilla1: true, cuchilla2: true, cuchilla3: true,  status: 'green',  timestamp: new Date().toISOString() },
            { id: 'TD2', cuchilla1: true, cuchilla2: true, cuchilla3: false, status: 'yellow', timestamp: new Date().toISOString() },
        ];
        renderPanel({ triples: multiTriples });
        expect(screen.getByText('Precaución')).toBeInTheDocument();
    });
});
