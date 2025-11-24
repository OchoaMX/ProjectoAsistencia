/**
 * Portal de Prefectos - Detalle de Maestro
 * JavaScript para vista detallada del perfil de maestro
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
let maestroData = null;
let cumplimientoChart = null;
let currentPeriodo = 30;

// Configuración
const CONFIG = {
    CHART_COLORS: {
        primary: '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#06b6d4'
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log(`👨‍🏫 Iniciando detalle de maestro ID: ${window.maestroId}`);
    
    if (!window.maestroId) {
        showError('ID de maestro no válido');
        return;
    }
    
    loadMaestroData();
    
    console.log('✅ Módulo de detalle de maestro inicializado');
});

/**
 * Cargar datos completos del maestro
 */
async function loadMaestroData() {
    try {
        showLoading(true);
        console.log(`📊 Cargando datos del maestro ${window.maestroId}...`);
        
        const response = await fetch(`/api/prefectos/maestro/${window.maestroId}?periodo=${currentPeriodo}`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        maestroData = await response.json();
        console.log('📈 Datos del maestro recibidos:', maestroData);
        
        // Actualizar todas las secciones
        updateMaestroBasico(maestroData.maestro);
        updateEstadisticas(maestroData.estadisticas);
        updateMateriasTable(maestroData.materias);
        updateHistorialFaltantes(maestroData.historial_faltantes);
        createCumplimientoChart();
        
        console.log('✅ Vista de maestro actualizada correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando datos del maestro:', error);
        showError('Error al cargar los datos del maestro');
    } finally {
        showLoading(false);
    }
}

/**
 * Actualizar información básica del maestro
 */
function updateMaestroBasico(maestro) {
    if (!maestro) return;
    
    console.log('👤 Actualizando información básica:', maestro);
    
    updateElement('maestroNombre', maestro.nombre_completo);
    updateElement('maestroUsuario', maestro.nombre_usuario);
    updateElement('maestroEstado', maestro.activo ? 'Activo' : 'Inactivo');
}

/**
 * Actualizar estadísticas de registro
 */
function updateEstadisticas(estadisticas) {
    if (!estadisticas) return;
    
    console.log('📊 Actualizando estadísticas:', estadisticas);
    
    updateElement('clasesProgramadas', estadisticas.clases_programadas || 0);
    updateElement('clasesRegistradas', estadisticas.clases_registradas || 0);
    updateElement('clasesSinRegistro', estadisticas.clases_sin_registro || 0);
    
    const porcentaje = parseFloat(estadisticas.porcentaje_cumplimiento) || 0;
    updateElement('porcentajeCumplimiento', `${porcentaje}%`);
    
    // Actualizar estado visual
    const estadoElement = document.getElementById('estadoCumplimiento');
    if (estadoElement) {
        let estado, icon;
        
        if (porcentaje >= 90) {
            estado = 'positive';
            icon = '🟢 Excelente';
        } else if (porcentaje >= 80) {
            estado = 'neutral';
            icon = '🟡 Bueno';
        } else if (porcentaje >= 70) {
            estado = 'neutral';
            icon = '🟡 Regular';
        } else {
            estado = 'negative';
            icon = '🔴 Necesita Mejora';
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
                <td colspan="7" class="text-center py-4">
                    <div class="empty-state">
                        <div class="empty-state-icon">📚</div>
                        <div class="empty-state-text">No hay materias asignadas para este período</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    materias.forEach(materia => {
        const porcentaje = parseFloat(materia.porcentaje_registro) || 0;
        const statusClass = porcentaje < 70 ? 'critical' : porcentaje < 85 ? 'warning' : 'excellent';
        const statusIcon = porcentaje < 70 ? '🔴' : porcentaje < 85 ? '🟡' : '🟢';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-semibold">${materia.nombre_materia}</td>
            <td class="text-sm">${materia.grupo_completo}</td>
            <td class="text-sm">
                <div>${materia.dia_semana}</div>
                <div class="text-gray-500">${materia.hora_inicio}</div>
            </td>
            <td class="text-center">${materia.clases_programadas || 0}</td>
            <td class="text-center font-semibold text-success">${materia.registros || 0}</td>
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
        const aPercent = parseFloat(a.cells[5].textContent) || 0;
        const bPercent = parseFloat(b.cells[5].textContent) || 0;
        return aPercent - bPercent;
    });
    
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

/**
 * Actualizar historial de registros faltantes
 */
function updateHistorialFaltantes(historial) {
    if (!historial) return;
    
    console.log('📅 Actualizando historial de faltantes:', historial);
    
    const container = document.getElementById('historialFaltantes');
    container.innerHTML = '';
    
    if (historial.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎉</div>
                <div class="empty-state-text">¡Excelente! No hay registros faltantes recientes</div>
            </div>
        `;
        return;
    }
    
    // Mostrar solo los últimos 15 registros faltantes
    const recientes = historial.slice(0, 15);
    
    recientes.forEach(faltante => {
        const fecha = new Date(faltante.fecha);
        const fechaStr = fecha.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: 'short'
        });
        
        const item = document.createElement('div');
        item.className = 'missing-item';
        item.innerHTML = `
            <div class="missing-date">${fechaStr}</div>
            <div class="missing-details">
                <div class="missing-subject">${faltante.nombre_materia}</div>
                <div class="missing-group">${faltante.grupo_completo}</div>
                <div class="missing-time">${faltante.dia_semana} ${faltante.hora_inicio}</div>
            </div>
            <div>
                <span class="status-badge critical">
                    ❌ No registrado
                </span>
            </div>
        `;
        container.appendChild(item);
    });
}

/**
 * Crear gráfica de cumplimiento
 */
function createCumplimientoChart() {
    const ctx = document.getElementById('cumplimientoChart');
    if (!ctx || !maestroData?.estadisticas) {
        console.log('⚠️ No hay datos para la gráfica de cumplimiento');
        return;
    }
    
    console.log('📈 Creando gráfica de cumplimiento');
    
    // Destruir gráfica anterior si existe
    if (cumplimientoChart) {
        cumplimientoChart.destroy();
    }
    
    // Simular datos semanales (en un caso real, vendrían del servidor)
    const weeklyData = generateWeeklyCumplimiento();
    
    if (weeklyData.length === 0) {
        console.log('⚠️ No hay datos semanales para graficar');
        return;
    }
    
    // Preparar datos para la gráfica
    const labels = weeklyData.map(item => item.semana);
    const porcentajes = weeklyData.map(item => item.porcentaje);
    
    // Crear nueva gráfica
    cumplimientoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Porcentaje de Cumplimiento',
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
                            return `Cumplimiento: ${context.raw}%`;
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
 * Generar datos semanales de cumplimiento (simulado)
 */
function generateWeeklyCumplimiento() {
    if (!maestroData?.estadisticas) return [];
    
    const porcentajeActual = parseFloat(maestroData.estadisticas.porcentaje_cumplimiento) || 0;
    const semanas = [];
    
    // Generar 8 semanas de datos simulados alrededor del porcentaje actual
    for (let i = 7; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - (i * 7));
        
        // Simular variación de ±10% alrededor del porcentaje actual
        const variacion = (Math.random() - 0.5) * 20;
        let porcentaje = porcentajeActual + variacion;
        porcentaje = Math.max(0, Math.min(100, porcentaje));
        
        semanas.push({
            semana: fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            porcentaje: Math.round(porcentaje)
        });
    }
    
    return semanas;
}

/**
 * Actualizar período
 */
async function updatePeriodo() {
    const nuevoPeriodo = document.getElementById('periodoAnalisis').value;
    if (nuevoPeriodo !== currentPeriodo) {
        currentPeriodo = nuevoPeriodo;
        console.log(`🔄 Actualizando período a ${currentPeriodo} días`);
        await loadMaestroData();
    }
}

/**
 * Ver historial completo
 */
function verHistorialCompleto() {
    console.log('📅 Ver historial completo de registros faltantes');
    
    if (!maestroData?.historial_faltantes) {
        showError('No hay datos de historial disponibles');
        return;
    }
    
    // En una implementación real, abriría un modal o nueva página
    // Por ahora mostramos todos los registros en la misma vista
    const container = document.getElementById('historialFaltantes');
    container.innerHTML = '';
    
    maestroData.historial_faltantes.forEach(faltante => {
        const fecha = new Date(faltante.fecha);
        const fechaStr = fecha.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: 'short',
            year: 'numeric'
        });
        
        const item = document.createElement('div');
        item.className = 'missing-item';
        item.innerHTML = `
            <div class="missing-date">${fechaStr}</div>
            <div class="missing-details">
                <div class="missing-subject">${faltante.nombre_materia}</div>
                <div class="missing-group">${faltante.grupo_completo}</div>
                <div class="missing-time">${faltante.dia_semana} ${faltante.hora_inicio}</div>
            </div>
            <div>
                <span class="status-badge critical">
                    ❌ No registrado
                </span>
            </div>
        `;
        container.appendChild(item);
    });
    
    showSuccess('Mostrando historial completo de registros faltantes');
}

/**
 * Generar reporte PDF profesional
 */
async function generarReporte() {
    console.log('📄 Generando reporte PDF del maestro');
    
    if (!maestroData?.maestro) {
        showError('No se puede generar el reporte');
        return;
    }
    
    try {
        showLoading(true);
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const maestro = maestroData.maestro;
        const stats = maestroData.estadisticas;
        const materias = maestroData.materias || [];
        
        // Colores
        const colorPrimary = [37, 99, 235];
        const colorSuccess = [16, 185, 129];
        const colorWarning = [245, 158, 11];
        const colorDanger = [239, 68, 68];
        const colorGray = [107, 114, 128];
        
        // Configuración de página
        let yPos = 20;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        
        // ============= ENCABEZADO =============
        doc.setFillColor(...colorPrimary);
        doc.rect(0, 0, pageWidth, 45, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE DESEMPEÑO', pageWidth / 2, 18, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text('Sistema de Asistencia Escolar', pageWidth / 2, 28, { align: 'center' });
        
        doc.setFontSize(10);
        const fechaHoy = new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        doc.text(`Generado: ${fechaHoy}`, pageWidth / 2, 37, { align: 'center' });
        
        yPos = 55;
        
        // ============= INFORMACIÓN DEL MAESTRO =============
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMACION DEL MAESTRO', margin, yPos);
        yPos += 10;
        
        // Cuadro de información
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorGray);
        yPos += 10;
        doc.text('Nombre:', margin + 5, yPos);
        doc.text('Usuario:', margin + 5, yPos + 8);
        doc.text('Estado:', margin + 5, yPos + 16);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(maestro.nombre_completo || 'N/A', margin + 30, yPos);
        doc.text(maestro.nombre_usuario || 'N/A', margin + 30, yPos + 8);
        doc.text(maestro.activo ? 'Activo' : 'Inactivo', margin + 30, yPos + 16);
        
        yPos += 30;
        
        // ============= ESTADÍSTICAS DE CUMPLIMIENTO =============
        yPos += 5;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`ESTADISTICAS DE CUMPLIMIENTO (${currentPeriodo} dias)`, margin, yPos);
        yPos += 10;
        
        const clasesProgramadas = stats.clases_programadas || 0;
        const clasesRegistradas = stats.clases_registradas || 0;
        const clasesSinRegistro = stats.clases_sin_registro || 0;
        const porcentaje = parseFloat(stats.porcentaje_cumplimiento) || 0;
        
        // Tarjetas de métricas
        const cardWidth = (contentWidth - 15) / 4;
        const cardHeight = 30;
        
        // Clases Programadas
        doc.setFillColor(37, 99, 235, 0.1 * 255);
        doc.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, 'F');
        doc.setFillColor(...colorPrimary);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(String(clasesProgramadas), margin + cardWidth / 2, yPos + 14, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Clases Programadas', margin + cardWidth / 2, yPos + 23, { align: 'center' });
        
        // Clases Registradas
        const xPos2 = margin + cardWidth + 5;
        doc.setFillColor(16, 185, 129, 0.1 * 255);
        doc.roundedRect(xPos2, yPos, cardWidth, cardHeight, 3, 3, 'F');
        doc.setFillColor(...colorSuccess);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(String(clasesRegistradas), xPos2 + cardWidth / 2, yPos + 14, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Registradas', xPos2 + cardWidth / 2, yPos + 23, { align: 'center' });
        
        // Clases Sin Registro
        const xPos3 = xPos2 + cardWidth + 5;
        doc.setFillColor(239, 68, 68, 0.1 * 255);
        doc.roundedRect(xPos3, yPos, cardWidth, cardHeight, 3, 3, 'F');
        doc.setFillColor(...colorDanger);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(String(clasesSinRegistro), xPos3 + cardWidth / 2, yPos + 14, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Sin Registro', xPos3 + cardWidth / 2, yPos + 23, { align: 'center' });
        
        // % Cumplimiento
        const xPos4 = xPos3 + cardWidth + 5;
        doc.setFillColor(245, 158, 11, 0.1 * 255);
        doc.roundedRect(xPos4, yPos, cardWidth, cardHeight, 3, 3, 'F');
        doc.setFillColor(...colorWarning);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`${porcentaje}%`, xPos4 + cardWidth / 2, yPos + 14, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('% Cumplimiento', xPos4 + cardWidth / 2, yPos + 23, { align: 'center' });
        
        yPos += cardHeight + 15;
        
        // ============= TABLA DE MATERIAS =============
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('MATERIAS Y GRUPOS ASIGNADOS', margin, yPos);
        yPos += 8;
        
        if (materias.length > 0) {
            // Encabezados de tabla
            doc.setFillColor(37, 99, 235);
            doc.rect(margin, yPos, contentWidth, 8, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Materia', margin + 2, yPos + 6);
            doc.text('Grupo', margin + 60, yPos + 6);
            doc.text('Horario', margin + 90, yPos + 6);
            doc.text('Prog.', margin + 125, yPos + 6);
            doc.text('Reg.', margin + 142, yPos + 6);
            doc.text('%', margin + 157, yPos + 6);
            
            yPos += 8;
            
            // Filas de la tabla
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            
            const maxMateriasPerPage = 8;
            const materiasLimitadas = materias.slice(0, maxMateriasPerPage);
            
            materiasLimitadas.forEach((materia, index) => {
                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }
                
                // Alternar color de fondo
                if (index % 2 === 0) {
                    doc.setFillColor(249, 250, 251);
                    doc.rect(margin, yPos, contentWidth, 7, 'F');
                }
                
                const porcentajeMateria = parseFloat(materia.porcentaje_registro) || 0;
                const estado = porcentajeMateria >= 85 ? '[OK]' : porcentajeMateria >= 70 ? '[R]' : '[X]';
                
                doc.setFontSize(8);
                doc.text(truncateText(materia.nombre_materia, 35), margin + 2, yPos + 5);
                doc.text(truncateText(materia.grupo_completo, 15), margin + 60, yPos + 5);
                doc.text(`${materia.dia_semana.substring(0, 3)} ${materia.hora_inicio}`, margin + 90, yPos + 5);
                doc.text(String(materia.clases_programadas || 0), margin + 127, yPos + 5);
                doc.text(String(materia.registros || 0), margin + 144, yPos + 5);
                doc.text(`${porcentajeMateria}% ${estado}`, margin + 157, yPos + 5);
                
                yPos += 7;
            });
            
            if (materias.length > maxMateriasPerPage) {
                doc.setFontSize(8);
                doc.setTextColor(...colorGray);
                doc.text(`... y ${materias.length - maxMateriasPerPage} materias mas`, margin + 2, yPos + 5);
                yPos += 7;
            }
            
            // Leyenda de indicadores
            yPos += 5;
            doc.setFontSize(7);
            doc.setTextColor(...colorGray);
            doc.text('Leyenda: [OK] = Excelente (>=85%)  |  [R] = Regular (70-84%)  |  [X] = Necesita Mejorar (<70%)', margin + 2, yPos);
            yPos += 5;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(...colorGray);
            doc.text('No hay materias asignadas en este periodo', margin + 2, yPos + 8);
            yPos += 15;
        }
        
        yPos += 10;
        
        // ============= EVALUACIÓN DEL CUMPLIMIENTO =============
        if (yPos > 230) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('EVALUACION DE CUMPLIMIENTO', margin, yPos);
        yPos += 10;
        
        let evaluacionTexto, evaluacionColor;
        if (porcentaje >= 90) {
            evaluacionTexto = 'EXCELENTE - El maestro mantiene un cumplimiento sobresaliente en el registro de asistencias.';
            evaluacionColor = colorSuccess;
        } else if (porcentaje >= 80) {
            evaluacionTexto = 'BUENO - El maestro mantiene un buen nivel de cumplimiento, con área de oportunidad menor.';
            evaluacionColor = [16, 185, 129];
        } else if (porcentaje >= 70) {
            evaluacionTexto = 'REGULAR - El maestro necesita mejorar su puntualidad en el registro de asistencias.';
            evaluacionColor = colorWarning;
        } else {
            evaluacionTexto = 'NECESITA MEJORAR - Se recomienda seguimiento cercano y apoyo para mejorar el cumplimiento.';
            evaluacionColor = colorDanger;
        }
        
        doc.setFillColor(...evaluacionColor, 0.1 * 255);
        doc.roundedRect(margin, yPos, contentWidth, 20, 3, 3, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const splitText = doc.splitTextToSize(evaluacionTexto, contentWidth - 10);
        doc.text(splitText, margin + 5, yPos + 8);
        
        yPos += 30;
        
        // ============= PIE DE PÁGINA =============
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            doc.setFillColor(37, 99, 235);
            doc.rect(0, doc.internal.pageSize.height - 15, pageWidth, 15, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `Reporte generado el ${new Date().toLocaleString('es-ES')}`,
                margin,
                doc.internal.pageSize.height - 7
            );
            doc.text(
                `Página ${i} de ${pageCount}`,
                pageWidth - margin,
                doc.internal.pageSize.height - 7,
                { align: 'right' }
            );
        }
        
        // Guardar PDF
        const filename = `Reporte_${maestro.nombre_usuario}_${obtenerFechaLocal()}.pdf`;
        doc.save(filename);
        
        showSuccess('✅ Reporte PDF generado correctamente');
        console.log('✅ PDF generado:', filename);
        
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        showError('Error al generar el reporte PDF');
    } finally {
        showLoading(false);
    }
}

/**
 * Truncar texto si es muy largo
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
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

// Las funciones showLoading, showSuccess, showError están disponibles en auth-utils.js

// Cleanup al salir
window.addEventListener('beforeunload', function() {
    if (cumplimientoChart) {
        cumplimientoChart.destroy();
    }
});

// Exportar funciones globales
window.updatePeriodo = updatePeriodo;
window.verHistorialCompleto = verHistorialCompleto;
window.generarReporte = generarReporte;
