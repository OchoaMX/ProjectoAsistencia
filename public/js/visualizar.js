// ===== FUNCIONES ESPECÍFICAS PARA VISUALIZAR =====

// Función para cargar carreras en el select de visualización
async function cargarCarrerasVisualizacion() {
    try {
        const response = await fetch('/api/carreras');
        const carreras = await response.json();
        
        const select = document.getElementById('viewCarrera');
        select.innerHTML = '<option value="">Todas las carreras</option>';
        
        carreras.forEach(carrera => {
            select.innerHTML += `<option value="${carrera.id_carrera}">${carrera.nombre_carrera}</option>`;
        });
        
    } catch (error) {
        console.error('Error al cargar carreras:', error);
        showAlert('Error al cargar carreras', 'error');
    }
}

// Función para cargar semestres según la carrera seleccionada
async function cargarSemestresVisualizacion(idCarrera) {
    const select = document.getElementById('viewSemestre');
    
    if (!idCarrera) {
        select.innerHTML = '<option value="">Todos los semestres</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/semestres?id_carrera=${idCarrera}`);
        const semestres = await response.json();
        
        select.innerHTML = '<option value="">Todos los semestres</option>';
        semestres.forEach(semestre => {
            select.innerHTML += `<option value="${semestre.numero_semestre}">${semestre.numero_semestre}° - ${semestre.nombre_semestre}</option>`;
        });
        
        if (semestres.length === 0) {
            select.innerHTML = '<option value="">No hay semestres</option>';
        }
    } catch (error) {
        console.error('Error al cargar semestres:', error);
        showAlert('Error al cargar semestres', 'error');
    }
}

// Función para cargar grupos según filtros
async function cargarGruposVisualizacion(idCarrera, idSemestre) {
    const select = document.getElementById('viewGrupo');
    
    let url = '/api/grupos';
    const params = [];
    
    if (idCarrera) params.push(`id_carrera=${idCarrera}`);
    if (idSemestre) params.push(`id_semestre=${idSemestre}`);
    
    if (params.length > 0) {
        url += '?' + params.join('&');
    }
    
    try {
        const response = await fetch(url);
        const grupos = await response.json();
        
        select.innerHTML = '<option value="">Todos los grupos</option>';
        grupos.forEach(grupo => {
            select.innerHTML += `<option value="${grupo.id_grupo}">${grupo.nombre_grupo} - ${grupo.nombre_carrera} (${grupo.numero_semestre}° Sem)</option>`;
        });
        
        if (grupos.length === 0) {
            select.innerHTML = '<option value="">No hay grupos</option>';
        }
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        showAlert('Error al cargar grupos', 'error');
    }
}

// Event listener para cambiar semestres y grupos cuando cambia la carrera
document.addEventListener('DOMContentLoaded', function() {
    const viewCarrera = document.getElementById('viewCarrera');
    if (viewCarrera) {
        viewCarrera.addEventListener('change', function() {
            const carreraId = this.value;
            const semestreSelect = document.getElementById('viewSemestre');
            const grupoSelect = document.getElementById('viewGrupo');
            
            if (!carreraId) {
                semestreSelect.innerHTML = '<option value="">Todos los semestres</option>';
                grupoSelect.innerHTML = '<option value="">Todos los grupos</option>';
                return;
            }
            
            // Cargar semestres de la carrera
            cargarSemestresVisualizacion(carreraId);
            
            // Cargar grupos de la carrera
            cargarGruposVisualizacion(carreraId, null);
        });
    }
});

// Event listener para cambiar grupos cuando cambia el semestre
document.addEventListener('DOMContentLoaded', function() {
    const viewSemestre = document.getElementById('viewSemestre');
    if (viewSemestre) {
        viewSemestre.addEventListener('change', function() {
            const carreraId = document.getElementById('viewCarrera').value;
            const idSemestre = this.value;
            
            if (!carreraId) {
                return;
            }
            
            // Cargar grupos filtrados por carrera y semestre
            cargarGruposVisualizacion(carreraId, idSemestre);
        });
    }
});

// Función para consultar estructura del sistema
async function consultarEstructura() {
    const carreraId = document.getElementById('viewCarrera').value;
    const idSemestre = document.getElementById('viewSemestre').value;
    const grupoId = document.getElementById('viewGrupo').value;
    
    // Mostrar indicador de carga
    const estructuraTable = document.getElementById('estructuraTable');
    estructuraTable.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Cargando datos...</div>';
    
    let url = '/api/estructura?';
    
    if (carreraId) url += `idCarrera=${carreraId}&`;
    if (idSemestre) url += `idSemestre=${idSemestre}&`;
    if (grupoId) url += `idGrupo=${grupoId}&`;
    
    try {
        const response = await fetch(url);
        const estructura = await response.json();
        
        const estructuraTable = document.getElementById('estructuraTable');
        
        if (estructura.length === 0) {
            estructuraTable.innerHTML = '<p>No hay datos que coincidan con los filtros seleccionados</p>';
            return;
        }
        
        let html = '<h3>Estructura del Sistema:</h3>';
        html += '<table class="data-table">';
        html += '<tr><th>Carrera</th><th>Grupo</th><th>Semestre</th><th>Total Alumnos</th></tr>';
        
        // Aseguramos que estructura sea un array antes de usar forEach
        if (!Array.isArray(estructura)) {
            console.log('La estructura no es un array:', estructura);
            estructura = [];
        }
        
        // Guardar IDs de grupos para obtener alumnos
        const gruposConAlumnos = [];
        
        estructura.forEach(item => {
            // Verificar que el item existe y tiene las propiedades necesarias
            if (!item) return;
            
            // Si es un resumen (total) mostrar con estilo diferente
            if (!item.nombre_grupo && item.id_carrera) {
                html += `<tr style="font-weight: bold; background: #f0f0f0;">
                    <td>${item.nombre_carrera || 'N/A'} (${item.codigo_carrera || 'N/A'})</td>
                    <td colspan="2">TODOS LOS GRUPOS</td>
                    <td>${item.total_alumnos || 0}</td>
                </tr>`;
            } else if (item.id_grupo) {
                html += `<tr>
                    <td>${item.nombre_carrera || 'N/A'} (${item.codigo_carrera || 'N/A'})</td>
                    <td>${item.nombre_grupo || 'N/A'}</td>
                    <td>${item.numero_semestre || 'N/A'}° Semestre</td>
                    <td>${item.total_alumnos || 0}</td>
                </tr>`;
                
                // Guardar grupo para mostrar alumnos
                if (item.total_alumnos > 0) {
                    gruposConAlumnos.push({
                        id_grupo: item.id_grupo,
                        nombre_grupo: item.nombre_grupo,
                        nombre_carrera: item.nombre_carrera,
                        numero_semestre: item.numero_semestre
                    });
                }
            }
        });
        
        html += '</table>';
        
        // Obtener y mostrar alumnos por grupo
        if (gruposConAlumnos.length > 0) {
            html += '<div style="margin-top: 30px;">';
            html += '<h3>Alumnos por Grupo:</h3>';
            
            for (const grupo of gruposConAlumnos) {
                try {
                    const responseAlumnos = await fetch(`/api/alumnos/grupo/${grupo.id_grupo}`);
                    const alumnos = await responseAlumnos.json();
                    
                    if (alumnos.length > 0) {
                        html += `<div style="margin-bottom: 25px; border: 1px solid #ddd; border-radius: 8px; padding: 15px;">`;
                        html += `<h4 style="color: #667eea; margin-bottom: 10px;">
                            📚 ${grupo.nombre_grupo} - ${grupo.nombre_carrera} (${grupo.numero_semestre}° Semestre)
                        </h4>`;
                        html += '<table class="data-table" style="margin-top: 10px;">';
                        html += '<tr><th>Foto</th><th>Matrícula</th><th>Nombre Completo</th></tr>';
                        
                        alumnos.forEach(alumno => {
                            const fotoHTML = alumno.foto_base64 
                                ? `<img src="${alumno.foto_base64}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` 
                                : '<i class="fas fa-user-circle" style="font-size: 40px; color: #ccc;"></i>';
                            
                            html += `<tr>
                                <td style="text-align: center;">${fotoHTML}</td>
                                <td>${alumno.matricula}</td>
                                <td>${alumno.nombre_completo}</td>
                            </tr>`;
                        });
                        
                        html += '</table>';
                        html += `<p style="margin-top: 10px; color: #666; font-size: 0.9em;">
                            <strong>Total: ${alumnos.length} alumno(s)</strong>
                        </p>`;
                        html += '</div>';
                    }
                } catch (error) {
                    console.error(`Error al obtener alumnos del grupo ${grupo.id_grupo}:`, error);
                }
            }
            html += '</div>';
        }
        
        estructuraTable.innerHTML = html;
        
    } catch (error) {
        console.error('Error al consultar estructura:', error);
        showAlert('Error al obtener estructura del sistema', 'error');
    }
}

// Cargar datos iniciales
function cargarDatosIniciales() {
    cargarCarrerasVisualizacion();
    cargarGruposVisualizacion(null, null);
}