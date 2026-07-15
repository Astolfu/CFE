import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import './ChartsModal.css';

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const ChartsModal = ({ isOpen, onClose, historyData }) => {
    if (!isOpen) return null;

    // Debug: ver estructura de datos
    console.log('📊 Datos de historial para gráficas:', historyData.slice(0, 3));

    // Procesar datos para gráficas
    const processChartData = () => {
        // 1. Fallas por dispositivo (chipNumber)
        const failuresByDevice = {};
        historyData.forEach(record => {
            if (record.status && record.status !== 'green') {
                const deviceKey = record.chipNumber || 'Desconocido';
                failuresByDevice[deviceKey] = (failuresByDevice[deviceKey] || 0) + 1;
            }
        });

        // 2. Fallas por triple disparo
        const failuresByTriple = {};
        historyData.forEach(record => {
            if (record.status && record.status !== 'green') {
                const tripleKey = record.tripleId || 'Desconocido';
                if (tripleKey && tripleKey !== 'Desconocido') {
                    failuresByTriple[tripleKey] = (failuresByTriple[tripleKey] || 0) + 1;
                }
            }
        });

        // 3. Distribución de estados
        const statusDistribution = {
            green: 0,
            yellow: 0,
            orange: 0,
            red: 0
        };
        historyData.forEach(record => {
            if (record.status && statusDistribution.hasOwnProperty(record.status)) {
                statusDistribution[record.status]++;
            }
        });

        // 4. Fallas por día (últimos 7 días)
        const failuresByDay = {};
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days.push(dateStr);
            failuresByDay[dateStr] = 0;
        }

        historyData.forEach(record => {
            if (record.status && record.status !== 'green' && record.timestamp) {
                const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
                if (failuresByDay.hasOwnProperty(recordDate)) {
                    failuresByDay[recordDate]++;
                }
            }
        });

        console.log('📊 Fallas por dispositivo:', failuresByDevice);
        console.log('📊 Fallas por triple:', failuresByTriple);
        console.log('📊 Distribución de estados:', statusDistribution);

        return {
            failuresByDevice,
            failuresByTriple,
            statusDistribution,
            failuresByDay: last7Days.map(date => failuresByDay[date])
        };
    };

    const chartData = processChartData();

    // Configuración de gráfica de barras (Fallas por dispositivo)
    const barChartData = {
        labels: Object.keys(chartData.failuresByDevice),
        datasets: [{
            label: 'Número de Fallas',
            data: Object.values(chartData.failuresByDevice),
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 2,
        }]
    };

    // Configuración de gráfica de línea (Fallas por día)
    const lineChartData = {
        labels: ['Hace 6 días', 'Hace 5 días', 'Hace 4 días', 'Hace 3 días', 'Hace 2 días', 'Ayer', 'Hoy'],
        datasets: [{
            label: 'Fallas por Día',
            data: chartData.failuresByDay,
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
        }]
    };

    // Configuración de gráfica de dona (Distribución de estados)
    const doughnutChartData = {
        labels: ['Normal (Verde)', 'Precaución (Amarillo)', 'Alerta (Naranja)', 'Crítico (Rojo)'],
        datasets: [{
            data: [
                chartData.statusDistribution.green,
                chartData.statusDistribution.yellow,
                chartData.statusDistribution.orange,
                chartData.statusDistribution.red
            ],
            backgroundColor: [
                'rgba(5, 150, 105, 0.8)',
                'rgba(217, 119, 6, 0.8)',
                'rgba(234, 88, 12, 0.8)',
                'rgba(220, 38, 38, 0.8)'
            ],
            borderColor: [
                'rgba(5, 150, 105, 1)',
                'rgba(217, 119, 6, 1)',
                'rgba(234, 88, 12, 1)',
                'rgba(220, 38, 38, 1)'
            ],
            borderWidth: 2,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#f8fafc',
                    font: {
                        size: 12
                    }
                }
            },
            title: {
                display: false
            }
        },
        scales: {
            y: {
                ticks: {
                    color: '#94a3b8'
                },
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)'
                }
            },
            x: {
                ticks: {
                    color: '#94a3b8'
                },
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)'
                }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#f8fafc',
                    font: {
                        size: 12
                    },
                    padding: 15
                }
            }
        }
    };

    return (
        <div className="charts-modal-overlay" onClick={onClose}>
            <div className="charts-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="charts-modal-header">
                    <h2>📊 Análisis de Fallas</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="charts-grid">
                    <div className="chart-container">
                        <h3>📉 Fallas por Dispositivo</h3>
                        <div className="chart-wrapper">
                            <Bar data={barChartData} options={chartOptions} />
                        </div>
                    </div>

                    <div className="chart-container">
                        <h3>📈 Tendencia de Fallas (Últimos 7 Días)</h3>
                        <div className="chart-wrapper">
                            <Line data={lineChartData} options={chartOptions} />
                        </div>
                    </div>

                    <div className="chart-container">
                        <h3>🎯 Distribución de Estados</h3>
                        <div className="chart-wrapper">
                            <Doughnut data={doughnutChartData} options={doughnutOptions} />
                        </div>
                    </div>
                </div>

                <div className="charts-footer">
                    <p>Total de registros analizados: <strong>{historyData.length}</strong></p>
                    <p>Fallas detectadas: <strong>{historyData.filter(r => r.status !== 'green').length}</strong></p>
                </div>
            </div>
        </div>
    );
};

export default ChartsModal;
