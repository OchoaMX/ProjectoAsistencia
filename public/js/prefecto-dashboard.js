/**
 * Portal de Prefectos - Dashboard Principal
 * JavaScript para manejo de métricas en tiempo real
 */

// Función auxiliar para obtener fecha local (evita problema de UTC)
function obtenerFechaLocal(fecha = null) {
    const fechaObj = fecha ? new Date(fecha) : new Date();
    const año = fechaObj.getFullYear();
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

// Variables globales
let tendenciaChart = null;
let dashboardData = null;
let refreshInterval = null;

// Configuración
const CONFIG = {
    REFRESH_INTERVAL: 60000, // 1 minuto
    CHART_COLORS: {
        primary: '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#06b6d4'
    }
};

// Las funciones de autenticación están en auth-utils.js

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏫 Iniciando Portal de Prefectos - Dashboard');
    
    // Inicializar autenticación
    if (!initializeAuth()) {
        return;
    }
    
    // Configurar fecha actual
    updateCurrentDate();
    
    // Cargar datos iniciales
    loadDashboardData();
    
    // Configurar actualización automática
    startAutoRefresh();
    
    // Configurar eventos
    setupEventListeners();
    
    console.log('✅ Dashboard inicializado correctamente');
});

/**
 * Actualizar fecha actual en el header
 */
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateString = now.toLocaleDateString('es-ES', options);
    const formattedDate = `HOY: ${dateString.charAt(0).toUpperCase() + dateString.slice(1)}`;
    
    document.getElementById('currentDate').textContent = formattedDate;
}

/**
 * Configurar listeners de eventos
 */
function setupEventListeners() {
    // Refresh manual
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshDashboard);
    }
    
    // Cambio de período en tendencia
    const tendenciaPeriodo = document.getElementById('tendenciaPeriodo');
    if (tendenciaPeriodo) {
        tendenciaPeriodo.addEventListener('change', updateTendencia);
    }
}

/**
 * Cargar todos los datos del dashboard
 */
async function loadDashboardData() {
    try {
        showLoading(true);
        
        console.log('📊 Cargando datos del dashboard...');
        
        const response = await authenticatedFetch('/api/prefectos/dashboard');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        dashboardData = await response.json();
        console.log('📈 Datos recibidos:', dashboardData);
        
        // Actualizar todas las secciones
        updateMetricas(dashboardData.metricas);
        updateAlertas(dashboardData.alertas);
        updateRankings(dashboardData.ranking);
        updateTendenciaChart(dashboardData.tendencia);
        updateEstadisticasGrupos(dashboardData.estadisticas_grupos);
        
        console.log('✅ Dashboard actualizado correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
        showError('Error al cargar los datos del dashboard');
    } finally {
        showLoading(false);
    }
}

/**
 * Actualizar métricas principales
 */
function updateMetricas(metricas) {
    if (!metricas) return;
    
    console.log('📊 Actualizando métricas:', metricas);
    
    // Total de alumnos
    updateElement('totalAlumnos', metricas.total_alumnos || 0);
    
    // Presentes hoy
    updateElement('presentesHoy', metricas.presentes_hoy || 0);
    updateElement('porcentajePresentes', `${metricas.porcentaje_asistencia || 0}% ✅`);
    
    // Faltas hoy
    updateElement('faltasHoy', metricas.faltas_hoy || 0);
    updateElement('porcentajeFaltas', `${metricas.porcentaje_faltas || 0}% ⚠️`);
    
    // Justificantes hoy
    updateElement('justificantesHoy', metricas.justificantes_hoy || 0);
    updateElement('porcentajeJustificantes', `${metricas.porcentaje_justificantes || 0}%`);
    
    // Actualizar colores según porcentajes
    updateMetricColors(metricas);
}

/**
 * Actualizar colores de métricas según valores
 */
function updateMetricColors(metricas) {
    const porcentaje = parseFloat(metricas.porcentaje_asistencia) || 0;
    
    // Actualizar clase del elemento de porcentaje de presentes
    const presentesElement = document.getElementById('porcentajePresentes');
    if (presentesElement) {
        presentesElement.className = 'metric-percentage';
        if (porcentaje >= 90) {
            presentesElement.classList.add('positive');
        } else if (porcentaje >= 80) {
            presentesElement.classList.add('neutral');
        } else {
            presentesElement.classList.add('negative');
        }
    }
}

/**
 * Actualizar alertas importantes
 */
function updateAlertas(alertas) {
    if (!alertas) return;
    
    console.log('🔔 Actualizando alertas:', alertas);
    
    // Alumnos con problemas
    updateElement('alertaAlumnos', 
        `${alertas.alumnos_problemas || 0} alumnos con más de 5 faltas esta semana`);
    
    // Maestros sin registro
    updateElement('alertaMaestros', 
        `${alertas.maestros_sin_registro || 0} maestros sin registrar asistencia hoy`);
    
    // Grupos perfectos
    updateElement('alertaGrupos', 
        `${alertas.grupos_perfectos || 0} grupos con 100% de asistencia`);
}

/**
 * Actualizar rankings de grupos
 */
function updateRankings(ranking) {
    if (!ranking) return;
    
    console.log('🏆 Actualizando rankings:', ranking);
    
    // Mejores grupos
    updateRankingList('mejoresGrupos', ranking.mejores, 'success');
    
    // Peores grupos
    updateRankingList('peoresGrupos', ranking.peores, 'danger');
}

/**
 * Actualizar estadísticas adicionales de grupos
 */
function updateEstadisticasGrupos(estadisticas) {
    if (!estadisticas) return;
    
    console.log('📊 Actualizando estadísticas de grupos:', estadisticas);
    
    // Promedio semanal
    updateElement('promedioSemanal', `${estadisticas.promedio_semanal || 0}%`);
    
    // Grupos excelentes (>= 90%)
    updateElement('gruposExcelentes', estadisticas.grupos_excelentes || 0);
    
    // Grupos críticos (< 70%)
    updateElement('gruposCriticos', estadisticas.grupos_criticos || 0);
}

/**
 * Actualizar lista de ranking
 */
function updateRankingList(containerId, grupos, type) {
    const container = document.getElementById(containerId);
    if (!container || !grupos) return;
    
    container.innerHTML = '';
    
    grupos.forEach((grupo, index) => {
        const item = document.createElement('div');
        item.className = 'ranking-item';
        
        const porcentaje = parseFloat(grupo.porcentaje_asistencia) || 0;
        const statusClass = porcentaje >= 90 ? 'excellent' : 
                           porcentaje >= 80 ? 'good' : 
                           porcentaje >= 70 ? 'warning' : 'critical';
        
        item.innerHTML = `
            <div class="ranking-position">${index + 1}</div>
            <div class="ranking-info">
                <div class="ranking-name">${grupo.grupo_completo || 'Grupo'}</div>
            </div>
            <div class="ranking-percentage ${type === 'success' ? 'text-success' : 'text-danger'}">
                ${porcentaje}%
                <span class="status-badge ${statusClass}">
                    ${porcentaje >= 85 ? '✅' : porcentaje >= 70 ? '🟡' : '🔴'}
                </span>
            </div>
        `;
        
        container.appendChild(item);
    });
    
    // Si no hay datos
    if (grupos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-text">No hay datos disponibles</div>
            </div>
        `;
    }
}

/**
 * Actualizar gráfica de tendencia
 */
function updateTendenciaChart(tendencia) {
    if (!tendencia || tendencia.length === 0) {
        console.log('⚠️ No hay datos de tendencia');
        return;
    }
    
    console.log('📈 Actualizando gráfica de tendencia:', tendencia);
    
    const ctx = document.getElementById('tendenciaChart');
    if (!ctx) {
        console.error('❌ Canvas de tendencia no encontrado');
        return;
    }
    
    // Destruir gráfica anterior si existe
    if (tendenciaChart) {
        tendenciaChart.destroy();
    }
    
    // Preparar datos
    const labels = tendencia.map(item => {
        const fecha = new Date(item.fecha);
        return fecha.toLocaleDateString('es-ES', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    }).reverse();
    
    const porcentajes = tendencia.map(item => 
        parseFloat(item.porcentaje) || 0
    ).reverse();
    
    // Crear nueva gráfica
    tendenciaChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Porcentaje de Asistencia',
                data: porcentajes,
                borderColor: CONFIG.CHART_COLORS.primary,
                backgroundColor: CONFIG.CHART_COLORS.primary + '20',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: CONFIG.CHART_COLORS.primary,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: CONFIG.CHART_COLORS.primary,
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `Asistencia: ${context.raw}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

/**
 * Actualizar período de tendencia
 */
async function updateTendencia() {
    try {
        const periodo = document.getElementById('tendenciaPeriodo').value;
        console.log(`📈 Actualizando tendencia para ${periodo} días`);
        
        const response = await authenticatedFetch(`/api/prefectos/tendencia?dias=${periodo}`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const tendencia = await response.json();
        updateTendenciaChart(tendencia);
        
    } catch (error) {
        console.error('❌ Error actualizando tendencia:', error);
        showError('Error al actualizar la tendencia');
    }
}

/**
 * Refresh manual del dashboard
 */
async function refreshDashboard() {
    console.log('🔄 Refresh manual del dashboard');
    
    // Animación del botón
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        const icon = refreshBtn.querySelector('i');
        if (icon) {
            icon.style.animation = 'spin 1s linear infinite';
            setTimeout(() => {
                icon.style.animation = '';
            }, 1000);
        }
    }
    
    await loadDashboardData();
}

/**
 * Iniciar actualización automática
 */
function startAutoRefresh() {
    console.log(`🔄 Iniciando auto-refresh cada ${CONFIG.REFRESH_INTERVAL/1000} segundos`);
    
    refreshInterval = setInterval(() => {
        console.log('🔄 Auto-refresh del dashboard');
        loadDashboardData();
    }, CONFIG.REFRESH_INTERVAL);
}

/**
 * Detener actualización automática
 */
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        console.log('⏸️ Auto-refresh detenido');
    }
}

/**
 * Enviar recordatorios a maestros
 */
function enviarRecordatorios() {
    console.log('🔔 Enviando recordatorios a maestros sin registro...');
    
    if (!dashboardData?.alertas?.maestros_sin_registro) {
        showError('No hay maestros sin registro');
        return;
    }
    
    const cantidad = dashboardData.alertas.maestros_sin_registro;
    const confirmacion = confirm(`¿Enviar recordatorio a ${cantidad} maestros sin registro?`);
    
    if (confirmacion) {
        showLoading(true);
        authenticatedFetch('/api/prefectos/enviar-recordatorios-maestros', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            showSuccess(`Recordatorios enviados a ${cantidad} maestros`);
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Error al enviar los recordatorios');
        })
        .finally(() => {
            showLoading(false);
        });
    }
}

/**
 * Exportar reporte
 */
function exportarReporte() {
    console.log('📄 Exportando reporte...');
    
    if (!dashboardData) {
        showError('No hay datos para exportar');
        return;
    }
    
    // Crear datos para exportar
    const reportData = {
        fecha: obtenerFechaLocal(),
        metricas: dashboardData.metricas,
        alertas: dashboardData.alertas,
        ranking: dashboardData.ranking
    };
    
    // Convertir a JSON y descargar
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `reporte-asistencia-${obtenerFechaLocal()}.json`;
    link.click();
    
    console.log('✅ Reporte exportado');
}

/**
 * Ver análisis completo
 */
function verAnalisisCompleto() {
    console.log('📊 Redirigiendo a análisis completo...');
    window.location.href = '/prefecto/analisis-completo';
}

/**
 * Ver grupos excelentes
 */
async function verGruposExcelentes() {
    console.log('🌟 Mostrando grupos excelentes...');
    
    try {
        showLoading(true);
        
        const response = await authenticatedFetch('/api/prefectos/grupos-excelentes');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const grupos = await response.json();
        mostrarModalGrupos(grupos, 'excelentes');
        
    } catch (error) {
        console.error('❌ Error cargando grupos excelentes:', error);
        showError('Error al cargar los grupos excelentes');
    } finally {
        showLoading(false);
    }
}

/**
 * Ver grupos críticos
 */
async function verGruposCriticos() {
    console.log('⚠️ Mostrando grupos críticos...');
    
    try {
        showLoading(true);
        
        const response = await authenticatedFetch('/api/prefectos/grupos-criticos');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const grupos = await response.json();
        mostrarModalGrupos(grupos, 'criticos');
        
    } catch (error) {
        console.error('❌ Error cargando grupos críticos:', error);
        showError('Error al cargar los grupos críticos');
    } finally {
        showLoading(false);
    }
}

/**
 * Mostrar modal con lista de grupos
 */
function mostrarModalGrupos(grupos, tipo) {
    const modal = document.getElementById('modalGrupos');
    const titulo = document.getElementById('modalGruposTitulo');
    const contenido = document.getElementById('modalGruposContenido');
    
    // Configurar título según tipo
    if (tipo === 'excelentes') {
        titulo.innerHTML = '<i class="fas fa-star"></i> Grupos Excelentes (≥90% Asistencia)';
    } else {
        titulo.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Grupos Críticos (<70% Asistencia)';
    }
    
    // Limpiar contenido
    contenido.innerHTML = '';
    
    if (grupos.length === 0) {
        contenido.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${tipo === 'excelentes' ? '🎉' : '✅'}</div>
                <div class="empty-state-text">
                    ${tipo === 'excelentes' ? 'No hay grupos excelentes en este momento' : 'No hay grupos críticos en este momento'}
                </div>
            </div>
        `;
    } else {
        // Crear lista de grupos
        const lista = document.createElement('div');
        lista.className = 'grupos-list';
        
        grupos.forEach((grupo, index) => {
            const porcentaje = parseFloat(grupo.porcentaje_asistencia) || 0;
            const itemClass = tipo === 'excelentes' ? 'excellent' : 'critical';
            const porcentajeClass = tipo === 'excelentes' ? 'excellent' : 'critical';
            
            const item = document.createElement('div');
            item.className = `grupo-item ${itemClass}`;
            item.innerHTML = `
                <div class="grupo-info">
                    <div class="grupo-nombre">
                        ${index + 1}. ${grupo.grupo_completo || grupo.nombre_grupo}
                    </div>
                    <div class="grupo-detalles">
                        ${grupo.total_alumnos || 0} alumnos • 
                        ${grupo.presentes || 0} presentes • 
                        ${grupo.faltas || 0} faltas
                    </div>
                </div>
                <div class="grupo-porcentaje ${porcentajeClass}">
                    ${porcentaje}%
                    ${tipo === 'excelentes' ? '✅' : '⚠️'}
                </div>
            `;
            
            lista.appendChild(item);
        });
        
        contenido.appendChild(lista);
    }
    
    // Mostrar modal
    modal.classList.remove('hidden');
}

/**
 * Cerrar modal de grupos
 */
function cerrarModalGrupos() {
    const modal = document.getElementById('modalGrupos');
    modal.classList.add('hidden');
}

/**
 * Cleanup al salir de la página
 */
window.addEventListener('beforeunload', function() {
    console.log('🔄 Limpiando recursos...');
    
    stopAutoRefresh();
    
    if (tendenciaChart) {
        tendenciaChart.destroy();
    }
});

// Manejar errores globales
window.addEventListener('error', function(event) {
    console.error('❌ Error global:', event.error);
});

// Manejar errores de promesas no capturadas
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Promesa rechazada no manejada:', event.reason);
    event.preventDefault();
});

// Event listener para cerrar modal con Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModalGrupos();
    }
});

// Exportar funciones para uso global
window.refreshDashboard = refreshDashboard;
window.updateTendencia = updateTendencia;
window.exportarReporte = exportarReporte;
window.verAnalisisCompleto = verAnalisisCompleto;
window.enviarRecordatorios = enviarRecordatorios;
window.verGruposExcelentes = verGruposExcelentes;
window.verGruposCriticos = verGruposCriticos;
window.cerrarModalGrupos = cerrarModalGrupos;
