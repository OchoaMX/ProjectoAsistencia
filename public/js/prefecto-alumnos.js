/**
 * Portal de Prefectos - Alumnos Problemáticos
 * JavaScript para gestión de alumnos con problemas de asistencia
 */

// Variables globales
let alumnosData = [];
let filteredAlumnos = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentVisualization = 'table'; // 'table' o 'cards'
let alumnoSeleccionado = null;
let filtrosData = {
    carreras: [],
    semestres: [],
    grupos: []
};

// Configuración
const CONFIG = {
    ESTADO_COLORES: {
        critico: '#ef4444',
        precaucion: '#f59e0b',
        aceptable: '#10b981'
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('👥 Iniciando módulo de Alumnos Problemáticos');
    
    initializeFilters();
    loadData();
    setupEventListeners();
    
    console.log('✅ Módulo inicializado correctamente');
});

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Filtros
    document.getElementById('filtroCarrera').addEventListener('change', onCarreraChange);
    document.getElementById('filtroSemestre').addEventListener('change', onSemestreChange);
    document.getElementById('filtroNombre').addEventListener('input', debounce(onNombreSearch, 500));
    
    // Enter en búsqueda
    document.getElementById('filtroNombre').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            aplicarFiltros();
        }
    });
    
    // Cerrar modal con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarModal();
        }
    });
}

/**
 * Inicializar filtros
 */
async function initializeFilters() {
    try {
        console.log('🔧 Inicializando filtros...');
        
        // Cargar datos para filtros
        const [carreras, semestres, grupos] = await Promise.all([
            fetch('/api/carreras').then(r => r.json()),
            fetch('/api/semestres').then(r => r.json()),
            fetch('/api/grupos').then(r => r.json())
        ]);
        
        filtrosData = { carreras, semestres, grupos };
        
        // Poblar select de carreras
        const selectCarrera = document.getElementById('filtroCarrera');
        selectCarrera.innerHTML = '<option value="">Todas las carreras</option>';
        carreras.forEach(carrera => {
            const option = document.createElement('option');
            option.value = carrera.id_carrera;
            option.textContent = carrera.nombre_carrera;
            selectCarrera.appendChild(option);
        });
        
        // CORRECCIÓN: Cargar TODOS los grupos al inicio
        const selectGrupo = document.getElementById('filtroGrupo');
        selectGrupo.innerHTML = '<option value="">Todos los grupos</option>';
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo.id_grupo;
            // Mostrar grupo con formato: semestre + nombre + carrera
            option.textContent = `${grupo.numero_semestre || ''}${grupo.nombre_grupo} ${grupo.codigo_carrera || ''}`.trim();
            selectGrupo.appendChild(option);
        });
        
        console.log(`✅ Filtros inicializados - ${grupos.length} grupos cargados`);
        
    } catch (error) {
        console.error('❌ Error inicializando filtros:', error);
        showError('Error al cargar los filtros');
    }
}

/**
 * Cargar datos de alumnos problemáticos
 */
async function loadData() {
    try {
        showLoading(true);
        console.log('📊 Cargando alumnos problemáticos...');
        
        const filtros = getCurrentFilters();
        console.log('🔍 Filtros actuales:', filtros);
        
        const queryString = new URLSearchParams(filtros).toString();
        const url = `/api/prefectos/alumnos-problematicos?${queryString}`;
        console.log('🌐 URL de la API:', url);
        
        const response = await fetch(url);
        console.log('📡 Respuesta HTTP:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        alumnosData = await response.json();
        console.log('📦 Datos recibidos del servidor:', alumnosData);
        console.log('📊 Cantidad de alumnos:', alumnosData.length);
        
        // Verificar que los datos sean un array
        if (!Array.isArray(alumnosData)) {
            console.error('❌ Los datos NO son un array:', typeof alumnosData);
            alumnosData = [];
        }
        
        // Obtener alumnos atendidos desde la base de datos
        try {
            const atendidosResponse = await fetch('/api/prefectos/alumnos-atendidos?dias=90', {
                credentials: 'include'
            });
            if (atendidosResponse.ok) {
                const alumnosAtendidos = await atendidosResponse.json();
                const idsAtendidos = new Set(alumnosAtendidos.map(a => a.id_alumno));
                
                // Marcar alumnos como atendidos
                alumnosData.forEach(alumno => {
                    alumno.atendido = idsAtendidos.has(alumno.id_alumno);
                });
                
                console.log('✅ Alumnos atendidos marcados:', idsAtendidos.size);
            }
        } catch (error) {
            console.error('⚠️ Error al cargar alumnos atendidos:', error);
        }
        
        filteredAlumnos = [...alumnosData];
        console.log('✅ Alumnos filtrados:', filteredAlumnos.length);
        
        console.log(`✅ ${alumnosData.length} alumnos cargados correctamente`);
        
        updateResultsSummary();
        renderAlumnos();
        
    } catch (error) {
        console.error('❌ Error cargando alumnos:', error);
        console.error('❌ Stack trace:', error.stack);
        showError('Error al cargar los datos de alumnos');
        
        // Asegurarnos de que los arrays estén vacíos en caso de error
        alumnosData = [];
        filteredAlumnos = [];
        updateResultsSummary();
        renderAlumnos();
    } finally {
        showLoading(false);
    }
}

/**
 * Obtener filtros actuales
 */
function getCurrentFilters() {
    const filtros = {};
    
    const carrera = document.getElementById('filtroCarrera').value;
    const semestre = document.getElementById('filtroSemestre').value;
    const grupo = document.getElementById('filtroGrupo').value;
    
    // Solo agregar filtros si tienen valor
    if (carrera) filtros.id_carrera = carrera;
    if (semestre) filtros.id_semestre = semestre;
    if (grupo) filtros.id_grupo = grupo;
    
    // Estos siempre se agregan
    filtros.periodo = document.getElementById('filtroPeriodo').value || 7;
    filtros.minimo_faltas = document.getElementById('filtroMinFaltas').value || 1;
    
    return filtros;
}

/**
 * Aplicar filtros
 */
function aplicarFiltros() {
    console.log('🔍 Aplicando filtros...');
    currentPage = 1;
    loadData();
}

/**
 * Limpiar filtros
 */
function limpiarFiltros() {
    console.log('🧹 Limpiando filtros...');
    
    document.getElementById('filtroCarrera').value = '';
    document.getElementById('filtroSemestre').value = '';
    document.getElementById('filtroGrupo').value = '';
    document.getElementById('filtroPeriodo').value = '7'; // Última semana
    document.getElementById('filtroMinFaltas').value = '1'; // 1 falta mínima
    document.getElementById('filtroNombre').value = '';
    
    // Resetear semestres
    document.getElementById('filtroSemestre').innerHTML = '<option value="">Todos los semestres</option>';
    
    // Recargar TODOS los grupos
    const selectGrupo = document.getElementById('filtroGrupo');
    selectGrupo.innerHTML = '<option value="">Todos los grupos</option>';
    filtrosData.grupos.forEach(grupo => {
        const option = document.createElement('option');
        option.value = grupo.id_grupo;
        option.textContent = `${grupo.numero_semestre || ''}${grupo.nombre_grupo} ${grupo.codigo_carrera || ''}`.trim();
        selectGrupo.appendChild(option);
    });
    
    aplicarFiltros();
}

/**
 * Manejar cambio de carrera
 */
function onCarreraChange() {
    const idCarrera = document.getElementById('filtroCarrera').value;
    updateSemestresSelect(idCarrera);
    
    // Filtrar grupos por carrera
    const idSemestre = document.getElementById('filtroSemestre').value;
    updateGruposSelect(idCarrera, idSemestre);
}

/**
 * Manejar cambio de semestre
 */
function onSemestreChange() {
    const idCarrera = document.getElementById('filtroCarrera').value;
    const idSemestre = document.getElementById('filtroSemestre').value;
    updateGruposSelect(idCarrera, idSemestre);
}

/**
 * Actualizar select de semestres
 */
function updateSemestresSelect(idCarrera) {
    const selectSemestre = document.getElementById('filtroSemestre');
    selectSemestre.innerHTML = '<option value="">Todos los semestres</option>';
    
    if (idCarrera) {
        const semestres = filtrosData.semestres.filter(s => s.id_carrera == idCarrera);
        semestres.forEach(semestre => {
            const option = document.createElement('option');
            option.value = semestre.id_semestre;
            option.textContent = semestre.nombre_semestre;
            selectSemestre.appendChild(option);
        });
    }
}

/**
 * Actualizar select de grupos
 */
function updateGruposSelect(idCarrera, idSemestre) {
    const selectGrupo = document.getElementById('filtroGrupo');
    selectGrupo.innerHTML = '<option value="">Todos los grupos</option>';
    
    if (idCarrera) {
        let grupos = filtrosData.grupos.filter(g => g.id_carrera == idCarrera);
        
        if (idSemestre) {
            grupos = grupos.filter(g => g.id_semestre == idSemestre);
        }
        
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo.id_grupo;
            option.textContent = `${grupo.numero_semestre}${grupo.nombre_grupo}`;
            selectGrupo.appendChild(option);
        });
    }
}

/**
 * Búsqueda por nombre
 */
function onNombreSearch() {
    const searchTerm = document.getElementById('filtroNombre').value.toLowerCase();
    
    if (searchTerm.length === 0) {
        filteredAlumnos = [...alumnosData];
    } else {
        filteredAlumnos = alumnosData.filter(alumno => 
            alumno.nombre_completo.toLowerCase().includes(searchTerm) ||
            alumno.matricula.toLowerCase().includes(searchTerm)
        );
    }
    
    currentPage = 1;
    updateResultsSummary();
    renderAlumnos();
}

/**
 * Actualizar resumen de resultados
 */
function updateResultsSummary() {
    const container = document.getElementById('resumenResultados');
    const total = filteredAlumnos.length;
    
    if (total === 0) {
        container.innerHTML = `
            <div class="empty-state-text">
                <i class="fas fa-search"></i>
                No se encontraron alumnos con los criterios especificados
            </div>
        `;
    } else {
        const criticos = filteredAlumnos.filter(a => a.porcentaje_asistencia < 70).length;
        const precaucion = filteredAlumnos.filter(a => a.porcentaje_asistencia >= 70 && a.porcentaje_asistencia < 85).length;
        
        container.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="font-semibold">
                    Se encontraron <span class="text-primary">${total}</span> alumnos con problemas de asistencia
                </div>
                <div class="flex gap-4 text-sm">
                    <span class="status-badge critical">${criticos} críticos</span>
                    <span class="status-badge warning">${precaucion} precaución</span>
                </div>
            </div>
            <div class="text-sm text-gray-600">
                Mostrando resultados de los últimos ${document.getElementById('filtroPeriodo').value} días
            </div>
        `;
    }
}

/**
 * Renderizar alumnos según vista activa
 */
function renderAlumnos() {
    if (currentVisualization === 'table') {
        renderTablaAlumnos();
    } else {
        renderTarjetasAlumnos();
    }
    renderPaginacion();
}

/**
 * Renderizar tabla de alumnos
 */
function renderTablaAlumnos() {
    const tbody = document.getElementById('tablaAlumnos');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const alumnosPage = filteredAlumnos.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    alumnosPage.forEach(alumno => {
        const porcentaje = parseFloat(alumno.porcentaje_asistencia) || 0;
        const statusClass = porcentaje < 70 ? 'critical' : porcentaje < 85 ? 'warning' : 'excellent';
        const statusIcon = porcentaje < 70 ? '🔴' : porcentaje < 85 ? '🟡' : '🟢';
        
        // Verificar si el alumno está atendido
        const estaAtendido = alumno.atendido;
        
        const row = document.createElement('tr');
        // Agregar clase especial si está atendido
        if (estaAtendido) {
            row.classList.add('alumno-atendido');
        }
        
        row.innerHTML = `
            <td class="font-semibold">
                ${estaAtendido ? '<i class="fas fa-check-circle text-success" title="Atendido"></i> ' : ''}
                ${alumno.matricula}
            </td>
            <td>
                <div class="font-semibold">${alumno.nombre_completo}</div>
                ${estaAtendido ? '<small class="text-success"><i class="fas fa-check"></i> Caso atendido</small>' : ''}
            </td>
            <td>${alumno.numero_semestre}${alumno.nombre_grupo} ${alumno.codigo_carrera}</td>
            <td>${alumno.numero_semestre}°</td>
            <td class="text-center font-semibold text-success">${alumno.total_asistencias || 0}</td>
            <td class="text-center font-semibold text-danger">${alumno.total_faltas || 0}</td>
            <td class="text-center font-semibold text-info">${alumno.total_justificantes || 0}</td>
            <td class="text-center">
                <span class="status-badge ${statusClass}">
                    ${porcentaje}% ${statusIcon}
                </span>
            </td>
            <td class="text-center">
                <div class="flex gap-1 justify-center">
                    <button class="action-btn primary" onclick="verDetalleAlumno(${alumno.id_alumno})" title="Ver Detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn warning" onclick="abrirAcciones(${alumno.id_alumno})" title="Acciones">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    if (alumnosPage.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <div class="empty-state-text">No hay alumnos para mostrar</div>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * Renderizar tarjetas de alumnos
 */
function renderTarjetasAlumnos() {
    const container = document.getElementById('tarjetasAlumnos');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const alumnosPage = filteredAlumnos.slice(startIndex, endIndex);
    
    container.innerHTML = '';
    
    alumnosPage.forEach(alumno => {
        const porcentaje = parseFloat(alumno.porcentaje_asistencia) || 0;
        const statusClass = porcentaje < 70 ? 'critical' : 'warning';
        
        // Verificar si el alumno está atendido
        const estaAtendido = alumno.atendido;
        
        const card = document.createElement('div');
        card.className = `student-card ${statusClass}`;
        if (estaAtendido) {
            card.classList.add('card-atendido');
        }
        
        card.innerHTML = `
            ${estaAtendido ? '<div class="badge-atendido"><i class="fas fa-check-circle"></i> Atendido</div>' : ''}
            <div class="student-header">
                <div class="student-info">
                    <h4>${alumno.nombre_completo}</h4>
                    <p><strong>Matrícula:</strong> ${alumno.matricula}</p>
                    <p><strong>Grupo:</strong> ${alumno.numero_semestre}${alumno.nombre_grupo} ${alumno.codigo_carrera}</p>
                </div>
                <div class="status-badge ${statusClass}">
                    ${porcentaje}%
                </div>
            </div>
            
            <div class="student-stats">
                <div class="stat-item">
                    <div class="stat-value text-success">${alumno.total_asistencias || 0}</div>
                    <div class="stat-label">Asistencias</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value text-danger">${alumno.total_faltas || 0}</div>
                    <div class="stat-label">Faltas</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value text-info">${alumno.total_justificantes || 0}</div>
                    <div class="stat-label">Justif.</div>
                </div>
            </div>
            
            <div class="student-actions">
                <button class="action-btn primary" onclick="verDetalleAlumno(${alumno.id_alumno})">
                    <i class="fas fa-eye"></i>
                    Ver Detalle
                </button>
                <button class="action-btn warning" onclick="generarCitatorio(${alumno.id_alumno})">
                    <i class="fas fa-file-text"></i>
                    Citatorio
                </button>
                <button class="action-btn success" onclick="marcarAtendido(${alumno.id_alumno})">
                    <i class="fas fa-check${estaAtendido ? '-circle' : ''}"></i>
                    ${estaAtendido ? 'Ya Atendido' : 'Atendido'}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
    
    if (alumnosPage.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-text">No hay alumnos para mostrar</div>
            </div>
        `;
    }
}

/**
 * Renderizar paginación
 */
function renderPaginacion() {
    const container = document.getElementById('paginacionContainer');
    const totalPages = Math.ceil(filteredAlumnos.length / itemsPerPage);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredAlumnos.length);
    
    container.innerHTML = `
        <div class="pagination-info">
            Mostrando ${startItem}-${endItem} de ${filteredAlumnos.length} resultados
        </div>
        <div class="flex gap-2">
            <button class="pagination-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Anterior
            </button>
            <button class="pagination-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                Siguiente <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

/**
 * Cambiar página
 */
function changePage(newPage) {
    const totalPages = Math.ceil(filteredAlumnos.length / itemsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderAlumnos();
    }
}

/**
 * Toggle visualización
 */
function toggleVisualizacion() {
    currentVisualization = currentVisualization === 'table' ? 'cards' : 'table';
    
    const vistaTabla = document.getElementById('vistaTabla');
    const vistaTarjetas = document.getElementById('vistaTarjetas');
    const btnText = document.getElementById('btnVisualizacion');
    
    if (currentVisualization === 'table') {
        vistaTabla.classList.remove('hidden');
        vistaTarjetas.classList.add('hidden');
        btnText.textContent = 'Vista Tarjetas';
    } else {
        vistaTabla.classList.add('hidden');
        vistaTarjetas.classList.remove('hidden');
        btnText.textContent = 'Vista Tabla';
    }
    
    renderAlumnos();
}

/**
 * Ver detalle de alumno
 */
function verDetalleAlumno(idAlumno) {
    console.log(`👀 Ver detalle del alumno ${idAlumno}`);
    window.location.href = `/prefecto/alumno/${idAlumno}`;
}

/**
 * Abrir modal de acciones
 */
function abrirAcciones(idAlumno) {
    const alumno = alumnosData.find(a => a.id_alumno === idAlumno);
    if (!alumno) return;
    
    alumnoSeleccionado = alumno;
    
    document.getElementById('modalTitulo').textContent = `Acciones para ${alumno.nombre_completo}`;
    document.getElementById('modalDatos').innerHTML = `
        <div class="student-info">
            <h4>${alumno.nombre_completo}</h4>
            <p><strong>Matrícula:</strong> ${alumno.matricula}</p>
            <p><strong>Grupo:</strong> ${alumno.numero_semestre}${alumno.nombre_grupo} ${alumno.codigo_carrera}</p>
            <p><strong>Faltas:</strong> ${alumno.total_faltas} | <strong>Asistencia:</strong> ${alumno.porcentaje_asistencia}%</p>
        </div>
    `;
    
    document.getElementById('modalAcciones').classList.remove('hidden');
}

/**
 * Cerrar modal
 */
function cerrarModal() {
    document.getElementById('modalAcciones').classList.add('hidden');
    alumnoSeleccionado = null;
}

/**
 * Ver detalle desde modal
 */
function verDetalle() {
    if (alumnoSeleccionado) {
        verDetalleAlumno(alumnoSeleccionado.id_alumno);
    }
}

/**
 * Generar citatorio
 */
function generarCitatorio(idAlumno = null) {
    const alumno = idAlumno ? alumnosData.find(a => a.id_alumno === idAlumno) : alumnoSeleccionado;
    if (!alumno) return;
    
    console.log(`📄 Generando citatorio para ${alumno.nombre_completo}`);
    
    // Generar contenido del citatorio
    const fecha = new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const contenido = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2>CITATORIO</h2>
                <p>SISTEMA DE ASISTENCIA ESCOLAR</p>
            </div>
            
            <div style="text-align: right; margin-bottom: 20px;">
                <p>${fecha}</p>
            </div>
            
            <div style="margin-bottom: 30px;">
                <p>Por medio del presente, se le notifica que el alumno(a):</p>
                <h3 style="text-align: center; margin: 20px 0;">${alumno.nombre_completo}</h3>
                <p><strong>Matrícula:</strong> ${alumno.matricula}</p>
                <p><strong>Grupo:</strong> ${alumno.numero_semestre}${alumno.nombre_grupo} ${alumno.codigo_carrera}</p>
            </div>
            
            <div style="margin-bottom: 30px;">
                <p>Ha acumulado un total de <strong>${alumno.total_faltas} faltas</strong> en el período actual, 
                lo que representa un <strong>${alumno.porcentaje_asistencia}%</strong> de asistencia.</p>
                
                <div style="margin: 20px 0; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                    <p><strong>Resumen de asistencias:</strong></p>
                    <ul>
                        <li>Asistencias: ${alumno.total_asistencias || 0}</li>
                        <li>Faltas: ${alumno.total_faltas || 0}</li>
                        <li>Justificantes: ${alumno.total_justificantes || 0}</li>
                        <li>Total de clases: ${alumno.total_clases || 0}</li>
                    </ul>
                </div>
            </div>
            
            <div style="margin-bottom: 30px;">
                <p>Se le cita a presentarse en la oficina de Prefectura para tratar este asunto de vital importancia 
                para el desarrollo académico del estudiante.</p>
            </div>
            
            <div style="margin-top: 50px;">
                <div style="display: flex; justify-content: space-between; margin-top: 80px;">
                    <div style="text-align: center; width: 45%;">
                        <div style="border-top: 1px solid black; margin-top: 50px;"></div>
                        <p>Firma del Padre/Tutor</p>
                    </div>
                    <div style="text-align: center; width: 45%;">
                        <div style="border-top: 1px solid black; margin-top: 50px;"></div>
                        <p>Firma del Prefecto</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Crear ventana de impresión
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');
    ventanaImpresion.document.write(`
        <html>
        <head>
            <title>Citatorio - ${alumno.nombre_completo}</title>
            <style>
                @media print {
                    body { margin: 0; }
                    @page { margin: 2cm; }
                }
            </style>
        </head>
        <body onload="window.print()">
            ${contenido}
        </body>
        </html>
    `);
    ventanaImpresion.document.close();
    
    showSuccess('Citatorio generado correctamente');
    cerrarModal();
}

/**
 * Marcar como atendido
 */
async function marcarAtendido(idAlumno = null) {
    const alumno = idAlumno ? alumnosData.find(a => a.id_alumno === idAlumno) : alumnoSeleccionado;
    if (!alumno) return;
    
    console.log(`✅ Marcando como atendido a ${alumno.nombre_completo}`);
    
    const confirmacion = confirm(`¿Confirma que el caso de ${alumno.nombre_completo} ha sido atendido?`);
    if (!confirmacion) return;
    
    try {
        const notas = `Caso atendido - Faltas: ${alumno.total_faltas}, Asistencia: ${alumno.porcentaje_asistencia}%`;
        
        // Guardar en la base de datos
        const response = await fetch('/api/prefectos/atencion-alumno', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                id_alumno: alumno.id_alumno,
                notas: notas
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Error al registrar atención');
        }
        
        console.log('📝 Atención registrada en base de datos');
        
        // Actualizar en los datos locales
        const index = alumnosData.findIndex(a => a.id_alumno === alumno.id_alumno);
        if (index !== -1) {
            alumnosData[index].atendido = true;
            alumnosData[index].fecha_atencion = new Date().toISOString();
        }
        
        const indexFiltered = filteredAlumnos.findIndex(a => a.id_alumno === alumno.id_alumno);
        if (indexFiltered !== -1) {
            filteredAlumnos[indexFiltered].atendido = true;
            filteredAlumnos[indexFiltered].fecha_atencion = new Date().toISOString();
        }
        
        // Re-renderizar la tabla para mostrar el cambio visual
        renderAlumnos();
        
        showSuccess(`✅ ${alumno.nombre_completo} marcado como atendido`);
    cerrarModal();
        
    } catch (error) {
        console.error('❌ Error al marcar como atendido:', error);
        showError('Error al marcar como atendido: ' + error.message);
    }
}

/**
 * Exportar Excel
 */
function exportarExcel() {
    console.log('📊 Exportando a Excel...');
    
    if (filteredAlumnos.length === 0) {
        showError('No hay datos para exportar');
        return;
    }
    
    // Preparar datos para Excel
    const excelData = filteredAlumnos.map(alumno => ({
        'Matrícula': alumno.matricula,
        'Nombre Completo': alumno.nombre_completo,
        'Grupo': `${alumno.numero_semestre}${alumno.nombre_grupo} ${alumno.codigo_carrera}`,
        'Semestre': `${alumno.numero_semestre}°`,
        'Asistencias': alumno.total_asistencias,
        'Faltas': alumno.total_faltas,
        'Justificantes': alumno.total_justificantes,
        'Porcentaje Asistencia': alumno.porcentaje_asistencia + '%',
        'Estado': alumno.porcentaje_asistencia < 70 ? 'Crítico' : 
                 alumno.porcentaje_asistencia < 85 ? 'Precaución' : 'Aceptable'
    }));
    
    downloadCSV(excelData, 'alumnos-problematicos.csv');
    showSuccess('Archivo Excel exportado correctamente');
}

/**
 * Exportar PDF
 */
function exportarPDF() {
    console.log('📄 Exportando a PDF...');
    
    if (filteredAlumnos.length === 0) {
        showError('No hay datos para exportar');
        return;
    }
    
    const fecha = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    let contenidoHTML = `
        <div style="font-family: Arial, sans-serif;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2>REPORTE DE ALUMNOS PROBLEMÁTICOS</h2>
                <p>Sistema de Asistencia Escolar</p>
                <p>Fecha: ${fecha}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #f0f0f0;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Matrícula</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nombre</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Grupo</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Asistencias</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Faltas</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Justif.</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">% Asistencia</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    filteredAlumnos.forEach(alumno => {
        const porcentaje = parseFloat(alumno.porcentaje_asistencia) || 0;
        const colorPorcentaje = porcentaje < 70 ? 'red' : porcentaje < 85 ? 'orange' : 'green';
        
        contenidoHTML += `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${alumno.matricula}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${alumno.nombre_completo}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${alumno.numero_semestre}${alumno.nombre_grupo} ${alumno.codigo_carrera}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${alumno.total_asistencias || 0}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: red; font-weight: bold;">${alumno.total_faltas || 0}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${alumno.total_justificantes || 0}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: ${colorPorcentaje}; font-weight: bold;">${porcentaje}%</td>
            </tr>
        `;
    });
    
    contenidoHTML += `
                </tbody>
            </table>
            
            <div style="margin-top: 30px;">
                <p><strong>Total de alumnos problemáticos:</strong> ${filteredAlumnos.length}</p>
                <p><strong>Criterio:</strong> Mínimo ${document.getElementById('filtroMinFaltas').value || 5} faltas en los últimos ${document.getElementById('filtroPeriodo').value || 30} días</p>
            </div>
            
            <div style="margin-top: 50px; text-align: center;">
                <div style="display: inline-block; text-align: center; margin-top: 50px;">
                    <div style="border-top: 1px solid black; width: 300px;"></div>
                    <p>Firma del Prefecto</p>
                </div>
            </div>
        </div>
    `;
    
    // Crear ventana de impresión
    const ventanaImpresion = window.open('', '_blank', 'width=1000,height=700');
    ventanaImpresion.document.write(`
        <html>
        <head>
            <title>Reporte de Alumnos Problemáticos</title>
            <style>
                @media print {
                    body { margin: 0; }
                    @page { 
                        size: landscape;
                        margin: 1cm; 
                    }
                }
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }
            </style>
        </head>
        <body onload="window.print()">
            ${contenidoHTML}
        </body>
        </html>
    `);
    ventanaImpresion.document.close();
    
    showSuccess('Archivo PDF exportado correctamente');
}

/**
 * Búsqueda en tiempo real
 */
function buscarEnTiempoReal() {
    const searchTerm = document.getElementById('busquedaRapida').value.toLowerCase().trim();
    document.getElementById('filtroNombre').value = searchTerm;
    
    if (searchTerm.length === 0) {
        filteredAlumnos = [...alumnosData];
    } else {
        filteredAlumnos = alumnosData.filter(alumno =>
            alumno.nombre_completo.toLowerCase().includes(searchTerm) ||
            alumno.matricula.toLowerCase().includes(searchTerm) ||
            `${alumno.numero_semestre}${alumno.nombre_grupo}`.includes(searchTerm) ||
            alumno.codigo_carrera.toLowerCase().includes(searchTerm)
        );
    }
    
    currentPage = 1;
    updateResultsSummary();
    renderAlumnos();
}

/**
 * Cambiar período de manera rápida
 */
function cambiarPeriodoRapido(button, dias) {
    // Actualizar botones activos
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Actualizar campo oculto y aplicar
    document.getElementById('filtroPeriodo').value = dias;
    aplicarFiltros();
}

/**
 * Toggle filtros avanzados
 */
function toggleFiltrosAvanzados() {
    const panel = document.getElementById('filtrosAvanzados');
    const text = document.getElementById('toggleText');
    const icon = document.getElementById('toggleIcon');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        text.textContent = 'Ocultar Filtros Avanzados';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        panel.style.display = 'none';
        text.textContent = 'Mostrar Filtros Avanzados';
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

/**
 * Limpiar filtros avanzados
 */
function limpiarFiltrosAvanzados() {
    document.getElementById('filtroCarrera').value = '';
    document.getElementById('filtroSemestre').value = '';
    document.getElementById('filtroGrupo').value = '';
    document.getElementById('filtroMinFaltas').value = '1';
    
    // Resetear semestres y grupos
    document.getElementById('filtroSemestre').innerHTML = '<option value="">Todos los semestres</option>';
    document.getElementById('filtroGrupo').innerHTML = '<option value="">Todos los grupos</option>';
    
    aplicarFiltros();
}

// Las funciones auxiliares (debounce, showLoading, showSuccess, showError, downloadCSV, convertToCSV) 
// están disponibles en auth-utils.js

// Exportar funciones para uso global
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.toggleVisualizacion = toggleVisualizacion;
window.verDetalleAlumno = verDetalleAlumno;
window.abrirAcciones = abrirAcciones;
window.cerrarModal = cerrarModal;
window.verDetalle = verDetalle;
window.generarCitatorio = generarCitatorio;
window.enviarAlerta = enviarAlerta;
window.marcarAtendido = marcarAtendido;
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;
window.changePage = changePage;
window.buscarEnTiempoReal = buscarEnTiempoReal;
window.cambiarPeriodoRapido = cambiarPeriodoRapido;
window.toggleFiltrosAvanzados = toggleFiltrosAvanzados;
window.limpiarFiltrosAvanzados = limpiarFiltrosAvanzados;
