/**
 * Portal de Prefectos - Control de Maestros
 * JavaScript para monitoreo de registros de asistencia por maestros
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
let controlData = null;
let maestrosProblematicos = [];
let fechaSeleccionada = obtenerFechaLocal();

// Configuración
const CONFIG = {
    ESTADOS_HORARIO: {
        'Pasada': { color: '#ef4444', icon: '🔴', class: 'critical' },
        'En curso': { color: '#f59e0b', icon: '🟡', class: 'warning' },
        'Futura': { color: '#06b6d4', icon: '⏳', class: 'pending' }
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('👨‍🏫 Iniciando Control de Maestros');
    
    // Configurar fecha actual
    document.getElementById('fechaControl').value = fechaSeleccionada;
    
    // Cargar datos iniciales
    loadControlData();
    loadMaestrosProblematicos();
    
    // Configurar actualización automática cada 5 minutos
    setInterval(loadControlData, 300000);
    
    console.log('✅ Control de maestros inicializado');
});

/**
 * Cargar datos de control del día
 */
async function loadControlData() {
    try {
        showLoading(true);
        console.log(`📊 Cargando control para fecha: ${fechaSeleccionada}`);
        
        const response = await fetch(`/api/prefectos/maestros-control?fecha=${fechaSeleccionada}`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        controlData = await response.json();
        console.log('📈 Datos de control recibidos:', controlData);
        
        updateResumen(controlData.resumen);
        updateTablaSinRegistro(controlData.sin_registro);
        updateTablaConRegistro(controlData.con_registro);
        
        console.log('✅ Vista de control actualizada');
        
    } catch (error) {
        console.error('❌ Error cargando control:', error);
        showError('Error al cargar los datos de control');
    } finally {
        showLoading(false);
    }
}

/**
 * Cargar maestros problemáticos
 */
async function loadMaestrosProblematicos() {
    try {
        const periodo = document.getElementById('periodoProblemas').value;
        const umbral = document.getElementById('umbralCumplimiento').value;
        
        console.log(`👥 Cargando maestros problemáticos (período: ${periodo}, umbral: ${umbral}%)`);
        
        const response = await fetch(`/api/prefectos/maestros-problematicos?periodo=${periodo}&umbral=${umbral}`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        maestrosProblematicos = await response.json();
        console.log('📊 Maestros problemáticos:', maestrosProblematicos);
        
        updateTablaProblematicos(maestrosProblematicos);
        
    } catch (error) {
        console.error('❌ Error cargando maestros problemáticos:', error);
        showError('Error al cargar los maestros problemáticos');
    }
}

/**
 * Actualizar resumen del día
 */
function updateResumen(resumen) {
    if (!resumen) return;
    
    console.log('📊 Actualizando resumen:', resumen);
    
    updateElement('totalProgramadas', resumen.total_programadas || 0);
    updateElement('totalRegistradas', resumen.registradas || 0);
    updateElement('totalSinRegistrar', resumen.sin_registrar || 0);
    
    const porcentaje = parseFloat(resumen.porcentaje_cumplimiento) || 0;
    updateElement('porcentajeCumplimiento', `${porcentaje}%`);
    
    // Actualizar porcentajes con colores
    const porcentajeReg = resumen.total_programadas > 0 ? 
        ((resumen.registradas / resumen.total_programadas) * 100).toFixed(1) : 0;
    const porcentajeSin = resumen.total_programadas > 0 ? 
        ((resumen.sin_registrar / resumen.total_programadas) * 100).toFixed(1) : 0;
    
    updateElement('porcentajeRegistradas', `${porcentajeReg}% ✅`);
    updateElement('porcentajeSinRegistrar', `${porcentajeSin}% ⚠️`);
}

/**
 * Actualizar tabla de clases sin registro
 */
function updateTablaSinRegistro(sinRegistro) {
    if (!sinRegistro) return;
    
    console.log('⚠️ Actualizando tabla sin registro:', sinRegistro);
    
    const tbody = document.getElementById('tablaSinRegistro');
    tbody.innerHTML = '';
    
    if (sinRegistro.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="empty-state">
                        <div class="empty-state-icon">✅</div>
                        <div class="empty-state-text">¡Excelente! Todos los maestros han registrado asistencia</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    sinRegistro.forEach(clase => {
        const estado = CONFIG.ESTADOS_HORARIO[clase.estado_horario] || CONFIG.ESTADOS_HORARIO['Futura'];
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-semibold">
                <a href="/prefecto/maestro/${clase.id_maestro}" class="text-primary hover:underline">
                    ${clase.nombre_maestro}
                </a>
            </td>
            <td>${clase.nombre_materia}</td>
            <td class="text-sm">${clase.grupo_completo}</td>
            <td class="text-sm">
                <div>${clase.dia_semana}</div>
                <div class="text-gray-500">${clase.hora_inicio} - ${clase.hora_fin}</div>
            </td>
            <td>
                <span class="status-badge ${estado.class}">
                    ${estado.icon} ${clase.estado_horario}
                </span>
            </td>
            <td>
                <div class="flex gap-1">
                    <button class="action-btn warning" onclick="enviarRecordatorio(${clase.id_maestro}, '${clase.nombre_maestro}')" title="Recordatorio">
                        <i class="fas fa-bell"></i>
                    </button>
                    <button class="action-btn primary" onclick="contactarMaestro(${clase.id_maestro}, '${clase.nombre_maestro}')" title="Contactar">
                        <i class="fas fa-phone"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Actualizar tabla de clases con registro
 */
function updateTablaConRegistro(conRegistro) {
    if (!conRegistro) return;
    
    console.log('✅ Actualizando tabla con registro:', conRegistro);
    
    const tbody = document.getElementById('tablaConRegistro');
    tbody.innerHTML = '';
    
    if (conRegistro.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4">
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <div class="empty-state-text">No hay registros completados aún</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Mostrar solo los primeros 10
    const registrosLimitados = conRegistro.slice(0, 10);
    
    registrosLimitados.forEach(registro => {
        const horaRegistro = new Date(`2000-01-01 ${registro.hora_registro}`).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const horaInicio = new Date(`2000-01-01 ${registro.hora_inicio}`).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Determinar clase CSS según el estado
        const estadoClass = registro.estado_registro === 'A tiempo' ? 'completed' : 
                           registro.estado_registro === 'Tarde' ? 'warning' : 'critical';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-semibold">${registro.nombre_maestro}</td>
            <td>${registro.nombre_materia}</td>
            <td class="text-sm">${registro.grupo_completo}</td>
            <td>
                <span class="status-badge ${estadoClass}" title="Hora programada: ${horaInicio}">
                    ${registro.icono_estado || '✅'} ${horaRegistro}
                    <br><small style="font-size: 10px;">${registro.estado_registro || 'Registrado'}</small>
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Actualizar botón de "ver todos"
    const btnVerTodos = document.getElementById('btnVerTodos');
    if (conRegistro.length > 10) {
        btnVerTodos.textContent = `Ver todos... (${conRegistro.length - 10} más)`;
    } else {
        btnVerTodos.textContent = `Ver todos (${conRegistro.length})`;
    }
}

/**
 * Actualizar tabla de maestros problemáticos
 */
function updateTablaProblematicos(problematicos) {
    console.log('❌ Actualizando maestros problemáticos:', problematicos);
    
    const tbody = document.getElementById('tablaProblematicos');
    tbody.innerHTML = '';
    
    if (problematicos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="empty-state">
                        <div class="empty-state-icon">🎉</div>
                        <div class="empty-state-text">No hay maestros con problemas de cumplimiento</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    problematicos.forEach(maestro => {
        const porcentaje = parseFloat(maestro.porcentaje_cumplimiento) || 0;
        const statusClass = porcentaje < 70 ? 'critical' : porcentaje < 80 ? 'warning' : 'good';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-semibold">
                <a href="/prefecto/maestro/${maestro.id_maestro}" class="text-primary hover:underline">
                    ${maestro.nombre_maestro}
                </a>
            </td>
            <td class="text-sm font-mono">${maestro.nombre_usuario}</td>
            <td class="text-center">${maestro.clases_programadas || 0}</td>
            <td class="text-center font-semibold text-danger">${maestro.clases_sin_registro || 0}</td>
            <td class="text-center">
                <span class="status-badge ${statusClass}">
                    ${porcentaje}%
                </span>
            </td>
            <td>
                <div class="flex gap-1">
                    <button class="action-btn primary" onclick="verDetalleMaestro(${maestro.id_maestro})" title="Ver Detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn warning" onclick="generarReporte(${maestro.id_maestro}, '${maestro.nombre_maestro}')" title="Generar Reporte">
                        <i class="fas fa-file-text"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Cambiar fecha
 */
function cambiarFecha() {
    const nuevaFecha = document.getElementById('fechaControl').value;
    if (nuevaFecha !== fechaSeleccionada) {
        fechaSeleccionada = nuevaFecha;
        console.log(`📅 Cambiando fecha a: ${fechaSeleccionada}`);
        loadControlData();
    }
}

/**
 * Actualizar datos
 */
function actualizarDatos() {
    console.log('🔄 Actualizando datos manualmente');
    loadControlData();
}

/**
 * Actualizar problemáticos
 */
function actualizarProblematicos() {
    console.log('🔄 Actualizando maestros problemáticos');
    loadMaestrosProblematicos();
}

/**
 * Ver histórico
 */
function verHistorico() {
    console.log('📊 Abriendo modal de histórico');
    
    // Configurar fechas por defecto
    const hoy = new Date();
    const hace30Dias = new Date(hoy);
    hace30Dias.setDate(hoy.getDate() - 30);
    
    document.getElementById('fechaDesde').value = obtenerFechaLocal(hace30Dias);
    document.getElementById('fechaHasta').value = obtenerFechaLocal(hoy);
    
    // Cargar maestros para el filtro
    cargarMaestrosFiltro();
    
    document.getElementById('modalHistorico').classList.remove('hidden');
}

/**
 * Cargar maestros para filtro
 */
async function cargarMaestrosFiltro() {
    try {
        const response = await fetch('/api/maestros');
        const maestros = await response.json();
        
        const select = document.getElementById('filtroMaestro');
        select.innerHTML = '<option value="">Todos los maestros</option>';
        
        maestros.forEach(maestro => {
            const option = document.createElement('option');
            option.value = maestro.id_maestro;
            option.textContent = maestro.nombre_completo;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('❌ Error cargando maestros:', error);
    }
}

/**
 * Buscar histórico
 */
async function buscarHistorico() {
    try {
        const fechaDesde = document.getElementById('fechaDesde').value;
        const fechaHasta = document.getElementById('fechaHasta').value;
        const idMaestro = document.getElementById('filtroMaestro').value;
        
        if (!fechaDesde || !fechaHasta) {
            showError('Por favor seleccione las fechas de inicio y fin');
            return;
        }
        
        console.log(`🔍 Buscando histórico: ${fechaDesde} - ${fechaHasta}, maestro: ${idMaestro}`);
        
        showLoading(true);
        
        // Construir URL con parámetros
        let url = `/api/prefectos/maestros-historico?fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`;
        if (idMaestro) url += `&idMaestro=${idMaestro}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Histórico recibido:', data);
        
        updateResultadosHistorico(data);
        
    } catch (error) {
        console.error('❌ Error en búsqueda histórica:', error);
        showError('Error al buscar el histórico');
    } finally {
        showLoading(false);
    }
}

/**
 * Actualizar resultados del histórico
 */
function updateResultadosHistorico(data) {
    const container = document.getElementById('resultadosHistorico');
    
    if (!data.registros || data.registros.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-info-circle"></i>
                <p>No se encontraron registros en el período seleccionado</p>
            </div>
        `;
        return;
    }
    
    // Mostrar resumen
    const resumenHtml = `
        <div class="resumen-historico">
            <div class="resumen-item">
                <span class="label">Total de clases:</span>
                <span class="value">${data.resumen.total_registros}</span>
            </div>
            <div class="resumen-item">
                <span class="label">Registradas:</span>
                <span class="value success">${data.resumen.registros_completos}</span>
            </div>
            <div class="resumen-item">
                <span class="label">Sin registrar:</span>
                <span class="value danger">${data.resumen.registros_faltantes}</span>
            </div>
            <div class="resumen-item">
                <span class="label">Cumplimiento:</span>
                <span class="value ${data.resumen.porcentaje_cumplimiento >= 80 ? 'success' : 'danger'}">
                    ${data.resumen.porcentaje_cumplimiento}%
                </span>
            </div>
        </div>
    `;
    
    // Agrupar registros por fecha
    const registrosPorFecha = {};
    data.registros.forEach(registro => {
        const fecha = new Date(registro.fecha).toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!registrosPorFecha[fecha]) {
            registrosPorFecha[fecha] = [];
        }
        registrosPorFecha[fecha].push(registro);
    });
    
    // Crear tabla de registros
    let tablaHtml = '<div class="historico-container">';
    
    Object.entries(registrosPorFecha).forEach(([fecha, registros]) => {
        tablaHtml += `
            <div class="fecha-group">
                <h4 class="fecha-header">
                    <i class="fas fa-calendar"></i> ${fecha}
                </h4>
                <table class="historico-table">
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Maestro</th>
                            <th>Materia</th>
                            <th>Grupo</th>
                            <th>Registro</th>
                            <th>Estado</th>
                            <th>Asistencia</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        registros.forEach(registro => {
            const estadoClass = registro.estado_registro === 'Sin registro' ? 'danger' : 
                                registro.estado_registro === 'A tiempo' ? 'success' : 'warning';
            
            tablaHtml += `
                <tr>
                    <td>${registro.hora_inicio} - ${registro.hora_fin}</td>
                    <td>${registro.nombre_maestro}</td>
                    <td>${registro.nombre_materia}</td>
                    <td>${registro.grupo_completo}</td>
                    <td>${registro.hora_registro || 'N/A'}</td>
                    <td><span class="badge ${estadoClass}">${registro.estado_registro}</span></td>
                    <td>
                        <span class="asistencia-info">
                            <i class="fas fa-user-check success"></i> ${registro.alumnos_presentes}
                            <i class="fas fa-user-times danger"></i> ${registro.alumnos_faltantes}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        tablaHtml += `
                    </tbody>
                </table>
            </div>
        `;
    });
    
    tablaHtml += '</div>';
    
    container.innerHTML = resumenHtml + tablaHtml;
}

/**
 * Cerrar modal
 */
function cerrarModal() {
    document.getElementById('modalHistorico').classList.add('hidden');
}

/**
 * Ver todos los registros
 */
function verTodosRegistros() {
    if (!controlData?.con_registro) return;
    
    console.log('📋 Mostrando todos los registros');
    
    const tbody = document.getElementById('tablaConRegistro');
    tbody.innerHTML = '';
    
    controlData.con_registro.forEach(registro => {
        const horaRegistro = new Date(`2000-01-01 ${registro.hora_registro}`).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-semibold">${registro.nombre_maestro}</td>
            <td>${registro.nombre_materia}</td>
            <td class="text-sm">${registro.grupo_completo}</td>
            <td>
                <span class="status-badge completed">
                    ✅ ${horaRegistro}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Cambiar botón
    const btnVerTodos = document.getElementById('btnVerTodos');
    btnVerTodos.textContent = 'Ver menos...';
    btnVerTodos.onclick = () => updateTablaConRegistro(controlData.con_registro);
}

/**
 * Ver detalle de maestro
 */
function verDetalleMaestro(idMaestro) {
    console.log(`👀 Ver detalle del maestro ${idMaestro}`);
    window.location.href = `/prefecto/maestro/${idMaestro}`;
}

/**
 * Enviar recordatorio individual
 */
function enviarRecordatorio(idMaestro, nombreMaestro) {
    console.log(`🔔 Enviando recordatorio a ${nombreMaestro} (ID: ${idMaestro})`);
    
    // Aquí implementarías el envío del recordatorio
    showSuccess(`Recordatorio enviado a ${nombreMaestro}`);
}

/**
 * Contactar maestro
 */
function contactarMaestro(idMaestro, nombreMaestro) {
    console.log(`📞 Contactando a ${nombreMaestro} (ID: ${idMaestro})`);
    
    const telefono = prompt(`¿Cuál es el teléfono del maestro ${nombreMaestro}?`);
    if (telefono) {
        window.open(`tel:${telefono}`);
    }
}

/**
 * Generar reporte de maestro
 */
function generarReporte(idMaestro, nombreMaestro) {
    console.log(`📄 Generando reporte para ${nombreMaestro} (ID: ${idMaestro})`);
    
    // Aquí implementarías la generación del reporte
    showSuccess(`Reporte generado para ${nombreMaestro}`);
}

/**
 * Enviar recordatorios (desde el botón del header)
 */
function enviarRecordatorios() {
    enviarRecordatoriosMasivos();
}

/**
 * Enviar recordatorios masivos
 */
async function enviarRecordatoriosMasivos() {
    console.log('📢 Enviando recordatorios masivos');
    
    if (!controlData?.sin_registro || controlData.sin_registro.length === 0) {
        showError('No hay maestros sin registro para enviar recordatorios');
        return;
    }
    
    const confirmacion = confirm(`¿Enviar recordatorio a ${controlData.sin_registro.length} maestros?`);
    if (confirmacion) {
        try {
            showLoading(true);
            const response = await fetch('/api/prefectos/enviar-recordatorios-masivos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fecha: fechaSeleccionada })
            });
            
            if (!response.ok) {
                throw new Error('Error al enviar recordatorios');
            }
            
            const result = await response.json();
            showSuccess(`Recordatorios enviados a ${controlData.sin_registro.length} maestros`);
        } catch (error) {
            console.error('Error:', error);
            showError('Error al enviar los recordatorios');
        } finally {
            showLoading(false);
        }
    }
}

/**
 * Exportar reporte PDF
 */
async function exportarReportePDF() {
    console.log('📄 Exportando reporte PDF');
    
    if (!controlData) {
        showError('No hay datos para exportar');
        return;
    }
    
    try {
        showLoading(true);
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const resumen = controlData.resumen;
        const sinRegistro = controlData.sin_registro || [];
        const conRegistro = controlData.con_registro || [];
        
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
        doc.text('CONTROL DE REGISTROS DE ASISTENCIA', pageWidth / 2, 18, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text('Portal de Prefectos - Sistema de Asistencia Escolar', pageWidth / 2, 28, { align: 'center' });
        
        doc.setFontSize(10);
        const fechaFormato = new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        doc.text(`Fecha: ${fechaFormato}`, pageWidth / 2, 37, { align: 'center' });
        
        yPos = 55;
        
        // ============= RESUMEN DEL DIA =============
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN DEL DIA', margin, yPos);
        yPos += 10;
        
        const totalProgramadas = resumen.total_programadas || 0;
        const totalRegistradas = resumen.total_registradas || 0;
        const totalSinRegistrar = resumen.total_sin_registrar || 0;
        const porcentajeCumplimiento = resumen.porcentaje_cumplimiento || 0;
        
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
        doc.text(String(totalProgramadas), margin + cardWidth / 2, yPos + 14, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Programadas', margin + cardWidth / 2, yPos + 23, { align: 'center' });
        
        // Clases Registradas
        const xPos2 = margin + cardWidth + 5;
        doc.setFillColor(16, 185, 129, 0.1 * 255);
        doc.roundedRect(xPos2, yPos, cardWidth, cardHeight, 3, 3, 'F');
        doc.setFillColor(...colorSuccess);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(String(totalRegistradas), xPos2 + cardWidth / 2, yPos + 14, { align: 'center' });
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
        doc.text(String(totalSinRegistrar), xPos3 + cardWidth / 2, yPos + 14, { align: 'center' });
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
        doc.text(`${porcentajeCumplimiento}%`, xPos4 + cardWidth / 2, yPos + 14, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Cumplimiento', xPos4 + cardWidth / 2, yPos + 23, { align: 'center' });
        
        yPos += cardHeight + 15;
        
        // ============= CLASES SIN REGISTRO =============
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('CLASES SIN REGISTRO DE ASISTENCIA', margin, yPos);
        yPos += 8;
        
        if (sinRegistro.length > 0) {
            // Encabezados de tabla
            doc.setFillColor(239, 68, 68);
            doc.rect(margin, yPos, contentWidth, 8, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Maestro', margin + 2, yPos + 6);
            doc.text('Materia', margin + 50, yPos + 6);
            doc.text('Grupo', margin + 100, yPos + 6);
            doc.text('Horario', margin + 130, yPos + 6);
            doc.text('Estado', margin + 160, yPos + 6);
            
            yPos += 8;
            
            // Filas de la tabla
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            
            const maxRegistrosPerPage = 10;
            const registrosLimitados = sinRegistro.slice(0, maxRegistrosPerPage);
            
            registrosLimitados.forEach((clase, index) => {
                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }
                
                // Alternar color de fondo
                if (index % 2 === 0) {
                    doc.setFillColor(254, 242, 242);
                    doc.rect(margin, yPos, contentWidth, 7, 'F');
                }
                
                const estadoTexto = clase.estado_horario === 'Pasada' ? '[X]' : 
                                   clase.estado_horario === 'En curso' ? '[!]' : '[P]';
                
                doc.setFontSize(8);
                doc.text(truncateText(clase.nombre_maestro, 25), margin + 2, yPos + 5);
                doc.text(truncateText(clase.nombre_materia, 25), margin + 50, yPos + 5);
                doc.text(truncateText(clase.grupo_completo, 15), margin + 100, yPos + 5);
                doc.text(`${clase.hora_inicio}-${clase.hora_fin}`, margin + 130, yPos + 5);
                doc.text(estadoTexto, margin + 162, yPos + 5);
                
                yPos += 7;
            });
            
            if (sinRegistro.length > maxRegistrosPerPage) {
                doc.setFontSize(8);
                doc.setTextColor(...colorGray);
                doc.text(`... y ${sinRegistro.length - maxRegistrosPerPage} clases mas sin registro`, margin + 2, yPos + 5);
                yPos += 7;
            }
            
            // Leyenda
            yPos += 3;
            doc.setFontSize(7);
            doc.setTextColor(...colorGray);
            doc.text('Leyenda: [X] = Clase Pasada  |  [!] = En Curso  |  [P] = Pendiente', margin + 2, yPos);
            yPos += 5;
        } else {
            doc.setFillColor(16, 185, 129, 0.1 * 255);
            doc.roundedRect(margin, yPos, contentWidth, 15, 3, 3, 'F');
            doc.setFontSize(10);
            doc.setTextColor(...colorSuccess);
            doc.setFont('helvetica', 'bold');
            doc.text('EXCELENTE! Todas las clases tienen registro', margin + contentWidth / 2, yPos + 10, { align: 'center' });
            yPos += 20;
        }
        
        yPos += 10;
        
        // ============= CLASES CON REGISTRO =============
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('CLASES CON REGISTRO COMPLETO', margin, yPos);
        yPos += 8;
        
        if (conRegistro.length > 0) {
            // Encabezados de tabla
            doc.setFillColor(16, 185, 129);
            doc.rect(margin, yPos, contentWidth, 8, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Maestro', margin + 2, yPos + 6);
            doc.text('Materia', margin + 50, yPos + 6);
            doc.text('Grupo', margin + 100, yPos + 6);
            doc.text('Hora Registro', margin + 140, yPos + 6);
            
            yPos += 8;
            
            // Filas de la tabla
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            
            const maxRegistrosConRegistro = 15;
            const registrosConRegistroLimitados = conRegistro.slice(0, maxRegistrosConRegistro);
            
            registrosConRegistroLimitados.forEach((registro, index) => {
                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }
                
                // Alternar color de fondo
                if (index % 2 === 0) {
                    doc.setFillColor(240, 253, 244);
                    doc.rect(margin, yPos, contentWidth, 7, 'F');
                }
                
                doc.setFontSize(8);
                doc.text(truncateText(registro.nombre_maestro, 25), margin + 2, yPos + 5);
                doc.text(truncateText(registro.nombre_materia, 25), margin + 50, yPos + 5);
                doc.text(truncateText(registro.grupo_completo, 20), margin + 100, yPos + 5);
                
                if (registro.hora_registro) {
                    const horaRegistro = new Date(`2000-01-01 ${registro.hora_registro}`).toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                    doc.text(horaRegistro, margin + 142, yPos + 5);
                }
                
                yPos += 7;
            });
            
            if (conRegistro.length > maxRegistrosConRegistro) {
                doc.setFontSize(8);
                doc.setTextColor(...colorGray);
                doc.text(`... y ${conRegistro.length - maxRegistrosConRegistro} clases mas registradas`, margin + 2, yPos + 5);
                yPos += 7;
            }
        }
        
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
                `Pagina ${i} de ${pageCount}`,
                pageWidth - margin,
                doc.internal.pageSize.height - 7,
                { align: 'right' }
            );
        }
        
        // Guardar PDF
        const filename = `Control_Maestros_${fechaSeleccionada}.pdf`;
        doc.save(filename);
        
        showSuccess('Reporte PDF generado correctamente');
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

/**
 * Exportar Excel
 */
function exportarExcel() {
    console.log('📊 Exportando a Excel');
    
    if (!controlData) {
        showError('No hay datos para exportar');
        return;
    }
    
    try {
        showLoading(true);
        
        // Crear un nuevo libro de trabajo
        const wb = XLSX.utils.book_new();
        
        // ============= HOJA 1: RESUMEN =============
        const resumen = controlData.resumen;
        const resumenData = [
            ['CONTROL DE REGISTROS DE ASISTENCIA'],
            ['Portal de Prefectos - Sistema de Asistencia Escolar'],
            [`Fecha: ${new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-ES')}`],
            [],
            ['RESUMEN DEL DIA'],
            ['Concepto', 'Cantidad'],
            ['Clases Programadas', resumen.total_programadas || 0],
            ['Clases Registradas', resumen.total_registradas || 0],
            ['Clases Sin Registrar', resumen.total_sin_registrar || 0],
            ['% Cumplimiento', `${resumen.porcentaje_cumplimiento || 0}%`]
        ];
        
        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
        
        // Aplicar estilos básicos al resumen (ancho de columnas)
        wsResumen['!cols'] = [
            { wch: 30 },
            { wch: 15 }
        ];
        
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
        
        // ============= HOJA 2: CLASES SIN REGISTRO =============
        const sinRegistroData = [
            ['CLASES SIN REGISTRO DE ASISTENCIA'],
            [],
            ['Maestro', 'Materia', 'Grupo', 'Dia Semana', 'Hora Inicio', 'Hora Fin', 'Estado Horario']
        ];
        
        controlData.sin_registro.forEach(clase => {
            sinRegistroData.push([
                clase.nombre_maestro,
                clase.nombre_materia,
                clase.grupo_completo,
                clase.dia_semana,
                clase.hora_inicio,
                clase.hora_fin,
                clase.estado_horario
            ]);
        });
        
        if (controlData.sin_registro.length === 0) {
            sinRegistroData.push(['', 'No hay clases sin registro', '', '', '', '', '']);
        }
        
        const wsSinRegistro = XLSX.utils.aoa_to_sheet(sinRegistroData);
        
        // Aplicar estilos (ancho de columnas)
        wsSinRegistro['!cols'] = [
            { wch: 25 },
            { wch: 30 },
            { wch: 20 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 15 }
        ];
        
        XLSX.utils.book_append_sheet(wb, wsSinRegistro, 'Sin Registro');
        
        // ============= HOJA 3: CLASES CON REGISTRO =============
        const conRegistroData = [
            ['CLASES CON REGISTRO COMPLETO'],
            [],
            ['Maestro', 'Materia', 'Grupo', 'Dia Semana', 'Hora Inicio', 'Hora Fin', 'Hora Registro', 'Estado']
        ];
        
        controlData.con_registro.forEach(registro => {
            const estadoRegistro = registro.estado_registro || 'Registrado';
            conRegistroData.push([
                registro.nombre_maestro,
                registro.nombre_materia,
                registro.grupo_completo,
                registro.dia_semana,
                registro.hora_inicio,
                registro.hora_fin,
                registro.hora_registro || 'N/A',
                estadoRegistro
            ]);
        });
        
        if (controlData.con_registro.length === 0) {
            conRegistroData.push(['', 'No hay clases registradas', '', '', '', '', '', '']);
        }
        
        const wsConRegistro = XLSX.utils.aoa_to_sheet(conRegistroData);
        
        // Aplicar estilos (ancho de columnas)
        wsConRegistro['!cols'] = [
            { wch: 25 },
            { wch: 30 },
            { wch: 20 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 15 }
        ];
        
        XLSX.utils.book_append_sheet(wb, wsConRegistro, 'Con Registro');
        
        // ============= HOJA 4: MAESTROS PROBLEMATICOS =============
        if (maestrosProblematicos && maestrosProblematicos.length > 0) {
            const periodo = document.getElementById('periodoProblemas').value;
            const problematicosData = [
                [`MAESTROS CON PROBLEMAS RECURRENTES (${periodo} dias)`],
                [],
                ['Maestro', 'Usuario', 'Clases Programadas', 'Clases Registradas', 'Sin Registro', '% Cumplimiento']
            ];
            
            maestrosProblematicos.forEach(maestro => {
                problematicosData.push([
                    maestro.nombre_maestro,
                    maestro.nombre_usuario,
                    maestro.clases_programadas || 0,
                    maestro.clases_registradas || 0,
                    maestro.clases_sin_registro || 0,
                    `${maestro.porcentaje_cumplimiento || 0}%`
                ]);
            });
            
            const wsProblematicos = XLSX.utils.aoa_to_sheet(problematicosData);
            
            // Aplicar estilos (ancho de columnas)
            wsProblematicos['!cols'] = [
                { wch: 25 },
                { wch: 20 },
                { wch: 18 },
                { wch: 18 },
                { wch: 15 },
                { wch: 15 }
            ];
            
            XLSX.utils.book_append_sheet(wb, wsProblematicos, 'Problematicos');
        }
        
        // Generar y descargar el archivo Excel
        const filename = `Control_Maestros_${fechaSeleccionada}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        showSuccess('Archivo Excel generado correctamente');
        console.log('✅ Excel generado:', filename);
        
    } catch (error) {
        console.error('❌ Error generando Excel:', error);
        showError('Error al generar el archivo Excel');
    } finally {
        showLoading(false);
    }
}

// Las funciones auxiliares (updateElement, showLoading, showSuccess, showError, downloadCSV, convertToCSV) 
// están disponibles en auth-utils.js

// Event listeners globales
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModal();
    }
});

// Exportar funciones globales
window.cambiarFecha = cambiarFecha;
window.actualizarDatos = actualizarDatos;
window.actualizarProblematicos = actualizarProblematicos;
window.verHistorico = verHistorico;
window.buscarHistorico = buscarHistorico;
window.cerrarModal = cerrarModal;
window.verTodosRegistros = verTodosRegistros;
window.verDetalleMaestro = verDetalleMaestro;
window.enviarRecordatorio = enviarRecordatorio;
window.enviarRecordatorios = enviarRecordatorios;
window.contactarMaestro = contactarMaestro;
window.generarReporte = generarReporte;
window.enviarRecordatoriosMasivos = enviarRecordatoriosMasivos;
window.exportarReportePDF = exportarReportePDF;
window.exportarExcel = exportarExcel;
