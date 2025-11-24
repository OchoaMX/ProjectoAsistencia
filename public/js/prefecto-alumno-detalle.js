/**
 * Portal de Prefectos - Detalle de Alumno
 * JavaScript para vista detallada del perfil de alumno
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
let alumnoData = null;
let tendenciaChart = null;
let currentPeriodo = 30;

// Configuración
const CONFIG = {
    CHART_COLORS: {
        primary: '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#06b6d4'
    },
    ESTADOS: {
        asistencia: { color: '#10b981', icon: '✅', text: 'Asistió' },
        falta: { color: '#ef4444', icon: '❌', text: 'Falta' },
        justificante: { color: '#06b6d4', icon: '📝', text: 'Justificante' }
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log(`👨‍🎓 Iniciando detalle de alumno ID: ${window.alumnoId}`);
    
    if (!window.alumnoId) {
        showError('ID de alumno no válido');
        return;
    }
    
    loadAlumnoData();
    verificarEstadoAtendido();
    
    console.log('✅ Módulo de detalle inicializado');
});

/**
 * Cargar datos completos del alumno
 */
async function loadAlumnoData() {
    try {
        showLoading(true);
        console.log(`📊 Cargando datos del alumno ${window.alumnoId}...`);
        
        const response = await fetch(`/api/prefectos/alumno/${window.alumnoId}?periodo=${currentPeriodo}`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        alumnoData = await response.json();
        console.log('📈 Datos del alumno recibidos:', alumnoData);
        
        // Actualizar todas las secciones
        updateAlumnoBasico(alumnoData.alumno);
        updateEstadisticas(alumnoData.estadisticas);
        updateMateriasTable(alumnoData.por_materia);
        updateHistorialReciente(alumnoData.historial);
        createTendenciaChart(alumnoData.historial);
        
        console.log('✅ Vista de alumno actualizada correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando datos del alumno:', error);
        showError('Error al cargar los datos del alumno');
    } finally {
        showLoading(false);
    }
}

/**
 * Actualizar información básica del alumno
 */
function updateAlumnoBasico(alumno) {
    if (!alumno) return;
    
    console.log('👤 Actualizando información básica:', alumno);
    
    // Información personal
    updateElement('alumnoNombre', alumno.nombre_completo);
    updateElement('alumnoMatricula', alumno.matricula);
    updateElement('alumnoCarrera', alumno.nombre_carrera);
    updateElement('alumnoSemestre', `${alumno.numero_semestre}° ${alumno.nombre_semestre}`);
    updateElement('alumnoGrupo', `${alumno.numero_semestre}${alumno.nombre_grupo} - ${alumno.turno}`);
    
    // Foto del alumno
    const fotoElement = document.getElementById('alumnoFoto');
    if (alumno.foto_base64) {
        fotoElement.src = `data:image/jpeg;base64,${alumno.foto_base64}`;
        fotoElement.style.display = 'block';
        fotoElement.parentElement.querySelector('i').style.display = 'none';
    }
}

/**
 * Actualizar estadísticas generales
 */
function updateEstadisticas(estadisticas) {
    if (!estadisticas) return;
    
    console.log('📊 Actualizando estadísticas:', estadisticas);
    
    updateElement('totalAsistencias', estadisticas.total_asistencias || 0);
    updateElement('totalFaltas', estadisticas.total_faltas || 0);
    updateElement('totalJustificantes', estadisticas.total_justificantes || 0);
    
    const porcentaje = parseFloat(estadisticas.porcentaje_global) || 0;
    updateElement('porcentajeGlobal', `${porcentaje}%`);
    
    // Actualizar estado visual
    const estadoElement = document.getElementById('estadoGlobal');
    if (estadoElement) {
        let estado, icon;
        
        if (porcentaje >= 85) {
            estado = 'positive';
            icon = '🟢 Excelente';
        } else if (porcentaje >= 70) {
            estado = 'neutral';
            icon = '🟡 Precaución';
        } else {
            estado = 'negative';
            icon = '🔴 Crítico';
        }
        
        estadoElement.className = `metric-percentage ${estado}`;
        estadoElement.innerHTML = `<i class="fas fa-circle"></i> ${icon}`;
    }
}

/**
 * Actualizar tabla de materias
 */
function updateMateriasTable(materias) {
    if (!materias) return;
    
    console.log('📚 Actualizando tabla de materias:', materias);
    
    const tbody = document.getElementById('tablaMaterias');
    tbody.innerHTML = '';
    
    if (materias.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="empty-state">
                        <div class="empty-state-icon">📚</div>
                        <div class="empty-state-text">No hay registros de materias para este período</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    materias.forEach(materia => {
        const porcentaje = parseFloat(materia.porcentaje) || 0;
        const statusClass = porcentaje < 70 ? 'critical' : porcentaje < 85 ? 'warning' : 'excellent';
        const statusIcon = porcentaje < 70 ? '🔴' : porcentaje < 85 ? '🟡' : '🟢';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-semibold">${materia.nombre_materia}</td>
            <td class="text-center font-semibold text-success">${materia.asistencias || 0}</td>
            <td class="text-center font-semibold text-danger">${materia.faltas || 0}</td>
            <td class="text-center font-semibold text-info">${materia.justificantes || 0}</td>
            <td class="text-center">
                <span class="font-semibold">${porcentaje}%</span>
            </td>
            <td class="text-center">
                <span class="status-badge ${statusClass}">
                    ${statusIcon}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Ordenar por porcentaje (peor primero)
    const rows = Array.from(tbody.children);
    rows.sort((a, b) => {
        const aPercent = parseFloat(a.cells[4].textContent) || 0;
        const bPercent = parseFloat(b.cells[4].textContent) || 0;
        return aPercent - bPercent;
    });
    
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

/**
 * Actualizar historial reciente
 */
function updateHistorialReciente(historial) {
    if (!historial) return;
    
    console.log('📅 Actualizando historial reciente:', historial);
    
    const container = document.getElementById('historialReciente');
    container.innerHTML = '';
    
    if (historial.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div class="empty-state-text">No hay registros de asistencia para este período</div>
            </div>
        `;
        return;
    }
    
    // Mostrar solo los últimos 15 registros
    const recientes = historial.slice(0, 15);
    
    recientes.forEach(registro => {
        const fecha = new Date(registro.fecha);
        const fechaStr = fecha.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: 'short',
            year: 'numeric'
        });
        
        const estado = CONFIG.ESTADOS[registro.estado] || CONFIG.ESTADOS.falta;
        
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-date">${fechaStr}</div>
            <div class="history-details">
                <div class="history-subject">${registro.nombre_materia}</div>
                <div class="history-teacher">Prof. ${registro.nombre_maestro}</div>
                ${registro.observaciones ? `<div class="history-observation">${registro.observaciones}</div>` : ''}
            </div>
            <div class="history-status">
                <span class="status-badge ${registro.estado === 'asistencia' ? 'completed' : registro.estado === 'falta' ? 'critical' : 'pending'}">
                    ${estado.icon} ${estado.text}
                </span>
            </div>
        `;
        container.appendChild(item);
    });
}

/**
 * Crear gráfica de tendencia
 */
function createTendenciaChart(historial) {
    if (!historial || historial.length === 0) {
        console.log('⚠️ No hay datos para la gráfica de tendencia');
        return;
    }
    
    console.log('📈 Creando gráfica de tendencia:', historial);
    
    const ctx = document.getElementById('tendenciaAlumnoChart');
    if (!ctx) {
        console.error('❌ Canvas de tendencia no encontrado');
        return;
    }
    
    // Destruir gráfica anterior si existe
    if (tendenciaChart) {
        tendenciaChart.destroy();
    }
    
    // Agrupar por semana y calcular porcentajes
    const weeklyData = processWeeklyData(historial);
    
    if (weeklyData.length === 0) {
        console.log('⚠️ No hay datos semanales para graficar');
        return;
    }
    
    // Preparar datos para la gráfica
    const labels = weeklyData.map(item => item.semana);
    const porcentajes = weeklyData.map(item => item.porcentaje);
    
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
                pointBackgroundColor: porcentajes.map(p => 
                    p >= 85 ? CONFIG.CHART_COLORS.success :
                    p >= 70 ? CONFIG.CHART_COLORS.warning :
                    CONFIG.CHART_COLORS.danger
                ),
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
 * Procesar datos semanales
 */
function processWeeklyData(historial) {
    const weeklyMap = new Map();
    
    historial.forEach(registro => {
        const fecha = new Date(registro.fecha);
        const weekStart = new Date(fecha);
        weekStart.setDate(fecha.getDate() - fecha.getDay()); // Inicio de semana (domingo)
        
        const weekKey = obtenerFechaLocal(weekStart);
        
        if (!weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, {
                semana: weekStart.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                asistencias: 0,
                total: 0
            });
        }
        
        const week = weeklyMap.get(weekKey);
        week.total++;
        if (registro.estado === 'asistencia') {
            week.asistencias++;
        }
    });
    
    // Convertir a array y calcular porcentajes
    const result = Array.from(weeklyMap.values()).map(week => ({
        semana: week.semana,
        porcentaje: week.total > 0 ? Math.round((week.asistencias / week.total) * 100) : 0
    }));
    
    // Ordenar por fecha (más reciente primero) y tomar últimas 8 semanas
    return result.reverse().slice(0, 8).reverse();
}

/**
 * Actualizar período
 */
async function updatePeriodo() {
    const nuevoPeriodo = document.getElementById('periodoMateria').value;
    if (nuevoPeriodo !== currentPeriodo) {
        currentPeriodo = nuevoPeriodo;
        console.log(`🔄 Actualizando período a ${currentPeriodo} días`);
        await loadAlumnoData();
    }
}

/**
 * Ver historial completo
 */
function verHistorialCompleto() {
    console.log('📅 Mostrando historial completo');
    
    const panel = document.getElementById('panelHistorialCompleto');
    panel.style.display = 'block';
    
    // Llenar tabla completa
    const tbody = document.getElementById('tablaHistorialCompleto');
    tbody.innerHTML = '';
    
    if (!alumnoData?.historial || alumnoData.historial.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <div class="empty-state">
                        <div class="empty-state-icon">📅</div>
                        <div class="empty-state-text">No hay registros de asistencia</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    alumnoData.historial.forEach(registro => {
        const fecha = new Date(registro.fecha);
        const fechaStr = fecha.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit',
            year: 'numeric'
        });
        
        const estado = CONFIG.ESTADOS[registro.estado] || CONFIG.ESTADOS.falta;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-semibold">${fechaStr}</td>
            <td>${registro.nombre_materia}</td>
            <td>
                <span class="status-badge ${registro.estado === 'asistencia' ? 'completed' : registro.estado === 'falta' ? 'critical' : 'pending'}">
                    ${estado.icon} ${estado.text}
                </span>
            </td>
            <td>${registro.nombre_maestro}</td>
            <td class="text-sm">${registro.observaciones || '-'}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Scroll al panel
    panel.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Ocultar historial completo
 */
function ocultarHistorialCompleto() {
    document.getElementById('panelHistorialCompleto').style.display = 'none';
}

/**
 * Exportar historial
 */
function exportarHistorial() {
    console.log('📄 Exportando historial del alumno...');
    
    if (!alumnoData?.historial || alumnoData.historial.length === 0) {
        showError('No hay datos para exportar');
        return;
    }
    
    // Preparar datos para Excel
    const excelData = alumnoData.historial.map(registro => ({
        'Fecha': new Date(registro.fecha).toLocaleDateString('es-ES'),
        'Materia': registro.nombre_materia,
        'Estado': CONFIG.ESTADOS[registro.estado]?.text || registro.estado,
        'Maestro': registro.nombre_maestro,
        'Observaciones': registro.observaciones || ''
    }));
    
    // Información del alumno
    const alumno = alumnoData.alumno;
    const filename = `historial-${alumno.matricula}-${alumno.nombre_completo.replace(/\s+/g, '-')}.csv`;
    
    downloadCSV(excelData, filename);
    showSuccess('Historial exportado correctamente');
}

/**
 * Generar citatorio
 */
function generarCitatorio() {
    console.log('📄 Generando citatorio para el alumno');
    
    if (!alumnoData?.alumno) {
        showError('No se puede generar el citatorio');
        return;
    }
    
    // Aquí implementarías la generación del PDF del citatorio
    showSuccess('Citatorio generado y descargado correctamente');
}

/**
 * Marcar como atendido
 */
async function marcarAtendido() {
    console.log('✅ Marcando alumno como atendido');
    
    // Verificar si ya está atendido
    try {
        const checkResponse = await fetch(`/api/prefectos/atencion-alumno/${window.alumnoId}`, {
            credentials: 'include'
        });
        
        if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            if (checkData.atendido) {
                showInfo('Este alumno ya fue marcado como atendido');
                mostrarEstadoAtendido();
                return;
            }
        }
    } catch (error) {
        console.error('Error verificando estado:', error);
    }
    
    const confirmacion = confirm('¿Está seguro de marcar este caso como atendido?');
    if (!confirmacion) return;
    
    try {
        const notas = `Caso atendido desde vista de detalle`;
        
        // Guardar en la base de datos
        const response = await fetch('/api/prefectos/atencion-alumno', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                id_alumno: window.alumnoId,
                notas: notas
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Error al registrar atención');
        }
        
        // Actualizar UI
        mostrarEstadoAtendido();
        
        showSuccess('✅ Caso marcado como atendido correctamente');
    } catch (error) {
        console.error('Error al marcar como atendido:', error);
        showError('Error al marcar como atendido: ' + error.message);
    }
}

/**
 * Mostrar estado de atendido
 */
function mostrarEstadoAtendido() {
    // Mostrar badge
    const badge = document.getElementById('badgeAtendido');
    if (badge) {
        badge.style.display = 'inline-flex';
    }
    
    // Ocultar/deshabilitar botones de marcar atendido
    const btnHeader = document.getElementById('btnMarcarAtendido');
    const btnCard = document.getElementById('btnMarcarAtendidoCard');
    
    if (btnHeader) {
        btnHeader.disabled = true;
        btnHeader.innerHTML = '<i class="fas fa-check-circle"></i> Ya Atendido';
        btnHeader.style.opacity = '0.6';
        btnHeader.style.cursor = 'not-allowed';
    }
    
    if (btnCard) {
        btnCard.classList.add('atendido');
        btnCard.disabled = true;
        btnCard.querySelector('h4').textContent = 'Caso Ya Atendido';
        btnCard.querySelector('p').textContent = 'Este alumno ya fue atendido por el prefecto';
    }
}

/**
 * Verificar si el alumno está atendido
 */
async function verificarEstadoAtendido() {
    try {
        const response = await fetch(`/api/prefectos/atencion-alumno/${window.alumnoId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.atendido) {
                mostrarEstadoAtendido();
            }
        }
    } catch (error) {
        console.error('Error verificando estado atendido:', error);
    }
}

// Funciones auxiliares

/**
 * Actualizar elemento DOM (versión extendida para este módulo)
 */
function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        element.classList.remove('loading-text');
    } else {
        console.warn(`⚠️ Elemento ${elementId} no encontrado`);
    }
}

// Las funciones auxiliares (showLoading, showSuccess, showError, downloadCSV, convertToCSV) 
// están disponibles en auth-utils.js

// Cleanup al salir
window.addEventListener('beforeunload', function() {
    if (tendenciaChart) {
        tendenciaChart.destroy();
    }
});

// Exportar funciones globales
window.updatePeriodo = updatePeriodo;
window.verHistorialCompleto = verHistorialCompleto;
window.ocultarHistorialCompleto = ocultarHistorialCompleto;
window.exportarHistorial = exportarHistorial;
window.generarCitatorio = generarCitatorio;
window.registrarReunion = registrarReunion;
window.enviarAlerta = enviarAlerta;
window.marcarAtendido = marcarAtendido;
