// ===== FUNCIONES ESPECÍFICAS PARA ASIGNACIONES =====

// Función para cargar asignaciones agrupadas por grupo
async function cargarAsignaciones() {
    try {
        const response = await fetch('/api/asignaciones');
        const asignaciones = await response.json();
        
        const asignacionesTable = document.getElementById('asignacionesTable');
        
        if (asignaciones.length === 0) {
            asignacionesTable.innerHTML = '<p>No hay asignaciones registradas</p>';
            return;
        }
        
        // Agrupar asignaciones por grupo
        const porGrupo = {};
        asignaciones.forEach(asig => {
            const keyGrupo = `${asig.id_grupo}-${asig.nombre_grupo}-${asig.nombre_carrera}-${asig.numero_semestre}`;
            if (!porGrupo[keyGrupo]) {
                porGrupo[keyGrupo] = {
                    nombre_grupo: asig.nombre_grupo,
                    nombre_carrera: asig.nombre_carrera,
                    numero_semestre: asig.numero_semestre,
                    asignaciones: []
                };
            }
            porGrupo[keyGrupo].asignaciones.push(asig);
        });
        
        // Renderizar por grupos
        let html = '';
        
        Object.keys(porGrupo).sort().forEach(keyGrupo => {
            const grupo = porGrupo[keyGrupo];
            
            html += `
                <div class="grupo-section">
                    <h4 class="grupo-header">
                        <i class="fas fa-users"></i> 
                        ${grupo.nombre_carrera} - Grupo ${grupo.nombre_grupo} (${grupo.numero_semestre}° Semestre)
                        <span class="badge">${grupo.asignaciones.length} materia(s)</span>
                    </h4>
                    <table class="data-table">
                        <tr><th>Materia</th><th>Maestro</th><th>Día</th><th>Horario</th><th>Acciones</th></tr>
            `;
            
            grupo.asignaciones.forEach(asig => {
            html += `<tr>
                    <td><strong>${asig.nombre_materia}</strong><br><small>(${asig.codigo_materia})</small></td>
                    <td>${asig.nombre_maestro}</td>
                    <td>${asig.dia_semana}</td>
                    <td>${formatearHora(asig.hora_inicio)} - ${formatearHora(asig.hora_fin)}</td>
                    <td>
                        <button class="btn-editar" onclick='editarAsignacion(${JSON.stringify(asig)})' title="Editar asignación">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-eliminar" onclick="eliminarAsignacion(${asig.id_asignacion}, '${asig.nombre_materia}', '${grupo.nombre_grupo}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                </td>
            </tr>`;
        });
        
            html += `
                    </table>
                </div>
            `;
        });
        
        asignacionesTable.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar asignaciones:', error);
        showAlert('Error al cargar asignaciones', 'error');
    }
}

// Función para formatear hora (de 07:00:00 a 07:00)
function formatearHora(hora) {
    if (!hora) return '';
    return hora.substring(0, 5);
}

// Función para cargar carreras
async function cargarCarreras() {
    try {
        const response = await fetch('/api/carreras');
        const carreras = await response.json();
        
        // Llenar select del formulario
        const select = document.getElementById('idCarreraAsig');
        select.innerHTML = '<option value="">Seleccionar carrera...</option>';
        carreras.forEach(carrera => {
            select.innerHTML += `<option value="${carrera.id_carrera}">${carrera.nombre_carrera}</option>`;
        });
        
        // Llenar select del filtro
        const selectFiltro = document.getElementById('filterCarreraAsig');
        selectFiltro.innerHTML = '<option value="">Todas las carreras</option>';
        carreras.forEach(carrera => {
            selectFiltro.innerHTML += `<option value="${carrera.id_carrera}">${carrera.nombre_carrera}</option>`;
        });
        
    } catch (error) {
        console.error('Error al cargar carreras:', error);
        showAlert('Error al cargar carreras', 'error');
    }
}

// Función para cargar grupos según carrera
async function cargarGrupos(idCarrera, selectId) {
    const select = document.getElementById(selectId);
    
    if (!idCarrera) {
        select.innerHTML = '<option value="">Primero selecciona una carrera</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/grupos?id_carrera=${idCarrera}`);
        const grupos = await response.json();
        
        select.innerHTML = '<option value="">Seleccionar grupo...</option>';
        grupos.forEach(grupo => {
            // Guardar datos del grupo en data attributes para usarlos después
            select.innerHTML += `<option value="${grupo.id_grupo}" 
                data-id-semestre="${grupo.id_semestre}" 
                data-id-carrera="${grupo.id_carrera}">
                ${grupo.nombre_grupo} - ${grupo.numero_semestre}° Sem - ${grupo.turno}
            </option>`;
        });
        
        if (grupos.length === 0) {
            select.innerHTML = '<option value="">No hay grupos disponibles</option>';
        }
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        showAlert('Error al cargar grupos', 'error');
    }
}

// Función para cargar materias según carrera y semestre (del plan de estudios)
async function cargarMateriasPorSemestre(idCarrera, idSemestre) {
    const select = document.getElementById('idMateriaAsig');
    
    if (!idCarrera || !idSemestre) {
        select.innerHTML = '<option value="">Primero selecciona un grupo</option>';
        return;
    }
    
    // Mostrar loading
    select.innerHTML = '<option value="">Cargando materias...</option>';
    
    try {
        const response = await fetch(`/api/plan-estudios/materias/${idCarrera}/${idSemestre}`);
        const materias = await response.json();
        
        select.innerHTML = '<option value="">Seleccionar materia...</option>';
        materias.forEach(materia => {
            select.innerHTML += `<option value="${materia.id_materia}">${materia.nombre_materia} (${materia.codigo_materia})</option>`;
        });
        
        if (materias.length === 0) {
            select.innerHTML = '<option value="">No hay materias para este semestre</option>';
            showAlert('No hay materias asignadas a este semestre en el plan de estudios', 'warning');
        }
    } catch (error) {
        console.error('Error al cargar materias:', error);
        select.innerHTML = '<option value="">Error al cargar materias</option>';
        showAlert('Error al cargar materias del semestre', 'error');
    }
}

// Función para cargar maestros
async function cargarMaestros() {
    try {
        const response = await fetch('/api/maestros');
        const maestros = await response.json();
        
        const select = document.getElementById('idMaestroAsig');
        select.innerHTML = '<option value="">Seleccionar maestro...</option>';
        
        maestros.forEach(maestro => {
            const nombreCompleto = `${maestro.nombre_completo} ${maestro.apellido_paterno || ''} ${maestro.apellido_materno || ''}`.trim();
            select.innerHTML += `<option value="${maestro.id_maestro}">${nombreCompleto}</option>`;
        });
        
    } catch (error) {
        console.error('Error al cargar maestros:', error);
        showAlert('Error al cargar maestros', 'error');
    }
}

// Función para cargar horarios disponibles
async function cargarHorariosDisponibles() {
    const idGrupo = document.getElementById('idGrupoAsig').value;
    const idMaestro = document.getElementById('idMaestroAsig').value;
    const selectHorario = document.getElementById('idHorarioAsig');
    
    if (!idGrupo || !idMaestro) {
        selectHorario.innerHTML = '<option value="">Primero selecciona grupo y maestro</option>';
        return;
    }
    
    // Mostrar loading
    selectHorario.innerHTML = '<option value="">Cargando...</option>';
    
    try {
        const response = await fetch(`/api/horarios/disponibles?id_grupo=${idGrupo}&id_maestro=${idMaestro}`);
        const horarios = await response.json();
        
        selectHorario.innerHTML = '<option value="">Seleccionar horario...</option>';
        
        if (!horarios || horarios.length === 0) {
            selectHorario.innerHTML = '<option value="">No hay horarios disponibles</option>';
            showAlert('No hay horarios disponibles para este grupo y maestro', 'warning');
            return;
        }
        
        // Agrupar por día de la semana
        const diasOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const horariosPorDia = {};
        
        horarios.forEach(horario => {
            if (!horariosPorDia[horario.dia_semana]) {
                horariosPorDia[horario.dia_semana] = [];
            }
            horariosPorDia[horario.dia_semana].push(horario);
        });
        
        // Crear opciones agrupadas por día
        diasOrden.forEach(dia => {
            if (horariosPorDia[dia] && horariosPorDia[dia].length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = dia;
                
                horariosPorDia[dia].forEach(horario => {
                    const option = document.createElement('option');
                    option.value = horario.id_horario;
                    option.textContent = `${formatearHora(horario.hora_inicio)} - ${formatearHora(horario.hora_fin)}`;
                    optgroup.appendChild(option);
                });
                
                selectHorario.appendChild(optgroup);
            }
        });
        
    } catch (error) {
        console.error('Error al cargar horarios:', error);
        showAlert('Error al cargar horarios disponibles', 'error');
    }
}

// Función para filtrar asignaciones (usa la misma lógica de agrupación)
async function filtrarAsignaciones() {
    const idCarrera = document.getElementById('filterCarreraAsig').value;
    const idGrupo = document.getElementById('filterGrupoAsig').value;
    const diaSemana = document.getElementById('filterDiaAsig').value;
    
    try {
        let url = '/api/asignaciones';
        const params = [];
        
        if (idCarrera) params.push(`id_carrera=${idCarrera}`);
        if (idGrupo) params.push(`id_grupo=${idGrupo}`);
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        const response = await fetch(url);
        let asignaciones = await response.json();
        
        // Filtrar por día de la semana si está seleccionado
        if (diaSemana) {
            asignaciones = asignaciones.filter(asig => asig.dia_semana === diaSemana);
        }
        
        const asignacionesTable = document.getElementById('asignacionesTable');
        
        if (asignaciones.length === 0) {
            asignacionesTable.innerHTML = '<p>No hay asignaciones que coincidan con los filtros</p>';
            return;
        }
        
        // Agrupar asignaciones por grupo (misma lógica que cargarAsignaciones)
        const porGrupo = {};
        asignaciones.forEach(asig => {
            const keyGrupo = `${asig.id_grupo}-${asig.nombre_grupo}-${asig.nombre_carrera}-${asig.numero_semestre}`;
            if (!porGrupo[keyGrupo]) {
                porGrupo[keyGrupo] = {
                    nombre_grupo: asig.nombre_grupo,
                    nombre_carrera: asig.nombre_carrera,
                    numero_semestre: asig.numero_semestre,
                    asignaciones: []
                };
            }
            porGrupo[keyGrupo].asignaciones.push(asig);
        });
        
        // Renderizar por grupos
        let html = '';
        
        Object.keys(porGrupo).sort().forEach(keyGrupo => {
            const grupo = porGrupo[keyGrupo];
            
            html += `
                <div class="grupo-section">
                    <h4 class="grupo-header">
                        <i class="fas fa-users"></i> 
                        ${grupo.nombre_carrera} - Grupo ${grupo.nombre_grupo} (${grupo.numero_semestre}° Semestre)
                        <span class="badge">${grupo.asignaciones.length} materia(s)</span>
                    </h4>
                    <table class="data-table">
                        <tr><th>Materia</th><th>Maestro</th><th>Día</th><th>Horario</th><th>Acciones</th></tr>
            `;
            
            grupo.asignaciones.forEach(asig => {
                html += `<tr>
                    <td><strong>${asig.nombre_materia}</strong><br><small>(${asig.codigo_materia})</small></td>
                    <td>${asig.nombre_maestro}</td>
                    <td>${asig.dia_semana}</td>
                    <td>${formatearHora(asig.hora_inicio)} - ${formatearHora(asig.hora_fin)}</td>
                    <td>
                        <button class="btn-editar" onclick='editarAsignacion(${JSON.stringify(asig)})' title="Editar asignación">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-eliminar" onclick="eliminarAsignacion(${asig.id_asignacion}, '${asig.nombre_materia}', '${grupo.nombre_grupo}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                </tr>`;
            });
            
            html += `
                    </table>
                </div>
            `;
        });
        
        asignacionesTable.innerHTML = html;
        
        } catch (error) {
        console.error('Error al filtrar asignaciones:', error);
        showAlert('Error al filtrar asignaciones', 'error');
        }
}

// Función para editar asignación
async function editarAsignacion(asignacion) {
    mostrarModal('Editar Asignación');
    
    const camposEdicion = document.getElementById('camposEdicion');
    camposEdicion.innerHTML = `
        <div class="form-group">
            <label>Carrera:</label>
            <select name="id_carrera" id="editCarreraAsig" required></select>
        </div>
        <div class="form-group">
            <label>Grupo:</label>
            <select name="id_grupo" id="editGrupoAsig" required>
                <option value="">Primero selecciona una carrera</option>
            </select>
        </div>
        <div class="form-group">
            <label>Materia:</label>
            <select name="id_materia" id="editMateriaAsig" required>
                <option value="">Primero selecciona un grupo</option>
            </select>
        </div>
        <div class="form-group">
            <label>Maestro:</label>
            <select name="id_maestro" id="editMaestroAsig" required></select>
        </div>
        <div class="form-group">
            <label>Horario:</label>
            <select name="id_horario" id="editHorarioAsig" required>
                <option value="">Primero selecciona grupo y maestro</option>
            </select>
        </div>
    `;
    
    document.getElementById('editId').value = asignacion.id_asignacion;
    
    // Cargar carreras
    const responseCarreras = await fetch('/api/carreras');
    const carreras = await responseCarreras.json();
    const selectCarrera = document.getElementById('editCarreraAsig');
    selectCarrera.innerHTML = '<option value="">Seleccionar carrera...</option>';
    carreras.forEach(carrera => {
        const option = document.createElement('option');
        option.value = carrera.id_carrera;
        option.textContent = carrera.nombre_carrera;
        if (carrera.id_carrera == asignacion.id_carrera) option.selected = true;
        selectCarrera.appendChild(option);
    });
    
    // Cargar grupos de esa carrera
    await cargarGruposEdicion(asignacion.id_carrera, asignacion.id_grupo);
    
    // Cargar materias del semestre
    const selectedOption = document.getElementById('editGrupoAsig').options[document.getElementById('editGrupoAsig').selectedIndex];
    const idSemestre = selectedOption ? selectedOption.getAttribute('data-id-semestre') : null;
    await cargarMateriasEdicion(asignacion.id_carrera, idSemestre, asignacion.id_materia);
    
    // Cargar maestros
    const responseMaestros = await fetch('/api/maestros');
    const maestros = await responseMaestros.json();
    const selectMaestro = document.getElementById('editMaestroAsig');
    selectMaestro.innerHTML = '<option value="">Seleccionar maestro...</option>';
    maestros.forEach(maestro => {
        const nombreCompleto = `${maestro.nombre_completo} ${maestro.apellido_paterno || ''} ${maestro.apellido_materno || ''}`.trim();
        const option = document.createElement('option');
        option.value = maestro.id_maestro;
        option.textContent = nombreCompleto;
        if (maestro.id_maestro == asignacion.id_maestro) option.selected = true;
        selectMaestro.appendChild(option);
    });
    
    // Cargar horarios disponibles
    await cargarHorariosEdicion(asignacion.id_grupo, asignacion.id_maestro, asignacion.id_horario);
    
    // Event listeners para el modal de edición
    document.getElementById('editCarreraAsig').addEventListener('change', async function() {
        const carreraId = this.value;
        await cargarGruposEdicion(carreraId, null);
        document.getElementById('editMateriaAsig').innerHTML = '<option value="">Primero selecciona un grupo</option>';
        document.getElementById('editHorarioAsig').innerHTML = '<option value="">Primero selecciona grupo y maestro</option>';
    });
    
    document.getElementById('editGrupoAsig').addEventListener('change', async function() {
        const selectedOption = this.options[this.selectedIndex];
        const idSemestre = selectedOption ? selectedOption.getAttribute('data-id-semestre') : null;
        const idCarrera = selectedOption ? selectedOption.getAttribute('data-id-carrera') : null;
        
        if (idCarrera && idSemestre) {
            await cargarMateriasEdicion(idCarrera, idSemestre, null);
        }
        await cargarHorariosEdicion(this.value, document.getElementById('editMaestroAsig').value, null);
    });
    
    document.getElementById('editMaestroAsig').addEventListener('change', async function() {
        await cargarHorariosEdicion(document.getElementById('editGrupoAsig').value, this.value, null);
    });
    
    // Manejador del submit para edición
    document.getElementById('formEdicion').onsubmit = async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const idAsignacion = formData.get('id');
        
        const asignacionData = {
            id_grupo: parseInt(formData.get('id_grupo')),
            id_materia: parseInt(formData.get('id_materia')),
            id_maestro: parseInt(formData.get('id_maestro')),
            id_horario: parseInt(formData.get('id_horario'))
        };
        
        try {
            const response = await fetch(`/api/asignaciones/${idAsignacion}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(asignacionData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert(data.message || 'Asignación actualizada correctamente', 'success');
                cerrarModal();
                cargarAsignaciones();
            } else {
                showAlert(data.error || 'Error al actualizar asignación', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error en el servidor', 'error');
        }
    };
}

// Funciones auxiliares para el modal de edición
async function cargarGruposEdicion(idCarrera, idGrupoSeleccionado) {
    const select = document.getElementById('editGrupoAsig');
    
    if (!idCarrera) {
        select.innerHTML = '<option value="">Primero selecciona una carrera</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/grupos?id_carrera=${idCarrera}`);
        const grupos = await response.json();
        
        select.innerHTML = '<option value="">Seleccionar grupo...</option>';
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo.id_grupo;
            option.setAttribute('data-id-semestre', grupo.id_semestre);
            option.setAttribute('data-id-carrera', grupo.id_carrera);
            option.textContent = `${grupo.nombre_grupo} - ${grupo.numero_semestre}° Sem - ${grupo.turno}`;
            if (grupo.id_grupo == idGrupoSeleccionado) option.selected = true;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar grupos:', error);
    }
}

async function cargarMateriasEdicion(idCarrera, idSemestre, idMateriaSeleccionada) {
    const select = document.getElementById('editMateriaAsig');
    
    if (!idCarrera || !idSemestre) {
        select.innerHTML = '<option value="">Primero selecciona un grupo</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/plan-estudios/materias/${idCarrera}/${idSemestre}`);
        const materias = await response.json();
        
        select.innerHTML = '<option value="">Seleccionar materia...</option>';
        materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia.id_materia;
            option.textContent = `${materia.nombre_materia} (${materia.codigo_materia})`;
            if (materia.id_materia == idMateriaSeleccionada) option.selected = true;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar materias:', error);
    }
}

async function cargarHorariosEdicion(idGrupo, idMaestro, idHorarioSeleccionado) {
    const selectHorario = document.getElementById('editHorarioAsig');
    
    if (!idGrupo || !idMaestro) {
        selectHorario.innerHTML = '<option value="">Primero selecciona grupo y maestro</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/horarios/disponibles?id_grupo=${idGrupo}&id_maestro=${idMaestro}`);
        const horarios = await response.json();
        
        selectHorario.innerHTML = '<option value="">Seleccionar horario...</option>';
        
        if (!horarios || horarios.length === 0) {
            selectHorario.innerHTML = '<option value="">No hay horarios disponibles</option>';
            return;
        }
        
        // Agrupar por día de la semana
        const diasOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const horariosPorDia = {};
        
        horarios.forEach(horario => {
            if (!horariosPorDia[horario.dia_semana]) {
                horariosPorDia[horario.dia_semana] = [];
            }
            horariosPorDia[horario.dia_semana].push(horario);
        });
        
        // Crear opciones agrupadas por día
        diasOrden.forEach(dia => {
            if (horariosPorDia[dia] && horariosPorDia[dia].length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = dia;
                
                horariosPorDia[dia].forEach(horario => {
                    const option = document.createElement('option');
                    option.value = horario.id_horario;
                    option.textContent = `${formatearHora(horario.hora_inicio)} - ${formatearHora(horario.hora_fin)}`;
                    if (horario.id_horario == idHorarioSeleccionado) option.selected = true;
                    optgroup.appendChild(option);
                });
                
                selectHorario.appendChild(optgroup);
            }
        });
    } catch (error) {
        console.error('Error al cargar horarios:', error);
    }
}

// Función para eliminar asignación
function eliminarAsignacion(id, materia, grupo) {
    if (confirm(`¿Eliminar la asignación de "${materia}" para el grupo "${grupo}"?`)) {
        fetch(`/api/asignaciones/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                showAlert('Asignación eliminada correctamente', 'success');
                cargarAsignaciones();
            } else {
                showAlert(data.error || 'Error al eliminar asignación', 'error');
            }
        })
        .catch(error => {
            console.error('Error al eliminar asignación:', error);
            showAlert('Error en el servidor', 'error');
        });
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Listener para cambio de carrera en formulario
    const idCarrera = document.getElementById('idCarreraAsig');
    if (idCarrera) {
        idCarrera.addEventListener('change', function() {
            const carreraId = this.value;
            cargarGrupos(carreraId, 'idGrupoAsig');
            // Limpiar materias y horarios
            document.getElementById('idMateriaAsig').innerHTML = '<option value="">Primero selecciona un grupo</option>';
            document.getElementById('idHorarioAsig').innerHTML = '<option value="">Primero selecciona grupo y maestro</option>';
        });
    }
    
    // Listener para cambio de grupo - CARGAR materias del semestre del grupo Y horarios
    const idGrupo = document.getElementById('idGrupoAsig');
    if (idGrupo) {
        idGrupo.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const idSemestre = selectedOption.getAttribute('data-id-semestre');
            const idCarrera = selectedOption.getAttribute('data-id-carrera');
            
            if (idCarrera && idSemestre) {
                // Cargar materias del semestre del grupo
                cargarMateriasPorSemestre(idCarrera, idSemestre);
            } else {
                document.getElementById('idMateriaAsig').innerHTML = '<option value="">Primero selecciona un grupo</option>';
            }
            
            // Cargar horarios disponibles si ya hay maestro seleccionado
            cargarHorariosDisponibles();
        });
    }
    
    // Listener para cambio de maestro - RECARGAR horarios
    const idMaestro = document.getElementById('idMaestroAsig');
    if (idMaestro) {
        idMaestro.addEventListener('change', function() {
            cargarHorariosDisponibles();
        });
    }
    
    // Listener para filtro de carrera
    const filterCarrera = document.getElementById('filterCarreraAsig');
    if (filterCarrera) {
        filterCarrera.addEventListener('change', function() {
            const carreraId = this.value;
            cargarGrupos(carreraId, 'filterGrupoAsig');
        });
    }

// Manejador del formulario de asignación (CREAR)
    const formAsignacion = document.getElementById('formAsignacion');
    if (formAsignacion) {
        formAsignacion.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const asignacionData = {
                id_grupo: parseInt(formData.get('id_grupo')),
                id_materia: parseInt(formData.get('id_materia')),
                id_maestro: parseInt(formData.get('id_maestro')),
                id_horario: parseInt(formData.get('id_horario'))
            };
            
            // Validar que todos los campos estén llenos
            if (!asignacionData.id_grupo || !asignacionData.id_materia || 
                !asignacionData.id_maestro || !asignacionData.id_horario) {
                showAlert('Por favor completa todos los campos', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/asignaciones', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(asignacionData),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert(data.message || 'Asignación creada correctamente', 'success');
                    this.reset();
                    // Resetear selects dependientes
                    document.getElementById('idGrupoAsig').innerHTML = '<option value="">Primero selecciona una carrera</option>';
                    document.getElementById('idMateriaAsig').innerHTML = '<option value="">Primero selecciona una carrera</option>';
                    document.getElementById('idHorarioAsig').innerHTML = '<option value="">Primero selecciona grupo y maestro</option>';
                    cargarAsignaciones();
                } else {
                    showAlert(data.error || 'Error al crear asignación', 'error');
                }
            } catch (error) {
                console.error('Error al crear asignación:', error);
                showAlert('Error en el servidor', 'error');
            }
        });
    }
    
});

// Cargar datos iniciales
function cargarDatosIniciales() {
    cargarCarreras();
    cargarMaestros();
    cargarAsignaciones();
}