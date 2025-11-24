// ===== FUNCIONES ESPECÍFICAS PARA GRUPOS =====

// Función para cargar grupos con filtros opcionales
async function cargarGrupos(idCarrera = '', idSemestre = '') {
    try {
        let url = '/api/grupos';
        const params = [];
        
        if (idCarrera) params.push(`id_carrera=${idCarrera}`);
        if (idSemestre) params.push(`id_semestre=${idSemestre}`);
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        const response = await fetch(url);
        const grupos = await response.json();
        
        const gruposTable = document.getElementById('gruposTable');
        
        if (grupos.length === 0) {
            gruposTable.innerHTML = '<p>No hay grupos registrados</p>';
            return;
        }
        
        let html = '<table class="data-table">';
        html += '<tr><th>Nombre</th><th>Carrera</th><th>Semestre</th><th>Turno</th><th>Periodo</th><th>Año</th><th>Acciones</th></tr>';
        
        grupos.forEach(grupo => {
            html += `<tr>
                <td>${grupo.nombre_grupo}</td>
                <td>${grupo.nombre_carrera} (${grupo.codigo_carrera})</td>
                <td>${grupo.numero_semestre}° - ${grupo.nombre_semestre}</td>
                <td>${grupo.turno}</td>
                <td>${grupo.periodo}</td>
                <td>${grupo.anio}</td>
                <td>
                    <button class="btn-editar" onclick='editarGrupo(${JSON.stringify(grupo).replace(/'/g, "&apos;")})'>
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-eliminar" onclick="eliminarGrupo(${grupo.id_grupo}, '${grupo.nombre_grupo}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>`;
        });
        
        html += '</table>';
        gruposTable.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        showAlert('Error al cargar grupos', 'error');
    }
}

// Función para cargar carreras en los selectores
async function cargarCarreras() {
    try {
        const response = await fetch('/api/carreras');
        const carreras = await response.json();
        
        // Cargar en el select del formulario
        const select = document.getElementById('idCarrera');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar carrera...</option>';
            carreras.forEach(carrera => {
                select.innerHTML += `<option value="${carrera.id_carrera}">${carrera.nombre_carrera}</option>`;
            });
        }
        
        // Cargar en el select del filtro
        const selectFiltro = document.getElementById('filterCarreraGrupo');
        if (selectFiltro) {
            selectFiltro.innerHTML = '<option value="">Todas las carreras</option>';
            carreras.forEach(carrera => {
                selectFiltro.innerHTML += `<option value="${carrera.id_carrera}">${carrera.nombre_carrera}</option>`;
            });
        }
    } catch (error) {
        console.error('Error al cargar carreras:', error);
        showAlert('Error al cargar carreras', 'error');
    }
}

// Función para cargar semestres en el filtro
async function cargarSemestresParaFiltro(idCarrera) {
    const select = document.getElementById('filterSemestreGrupo');
    
    if (!idCarrera) {
        select.innerHTML = '<option value="">Todos los semestres</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/semestres?id_carrera=${idCarrera}`);
        const semestres = await response.json();
        
        select.innerHTML = '<option value="">Todos los semestres</option>';
        semestres.forEach(semestre => {
            select.innerHTML += `<option value="${semestre.id_semestre}">${semestre.numero_semestre}° - ${semestre.nombre_semestre}</option>`;
        });
        
        if (semestres.length === 0) {
            select.innerHTML = '<option value="">No hay semestres</option>';
        }
    } catch (error) {
        console.error('Error al cargar semestres:', error);
        showAlert('Error al cargar semestres', 'error');
    }
}

// Función para cargar semestres según la carrera seleccionada
async function cargarSemestres(idCarrera, selectId) {
    const select = document.getElementById(selectId);
    
    if (!idCarrera) {
        select.innerHTML = '<option value="">Primero selecciona una carrera</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/semestres?id_carrera=${idCarrera}`);
        const semestres = await response.json();
        
        select.innerHTML = '<option value="">Seleccionar semestre...</option>';
        semestres.forEach(semestre => {
            select.innerHTML += `<option value="${semestre.id_semestre}">${semestre.numero_semestre}° - ${semestre.nombre_semestre}</option>`;
        });
        
        if (semestres.length === 0) {
            select.innerHTML = '<option value="">No hay semestres registrados para esta carrera</option>';
            showAlert('Esta carrera no tiene semestres registrados. Por favor, registra semestres primero.', 'warning');
        }
    } catch (error) {
        console.error('Error al cargar semestres:', error);
        showAlert('Error al cargar semestres', 'error');
    }
}

// Función para editar grupo
function editarGrupo(grupo) {
    mostrarModal('Editar Grupo');
    
    const camposEdicion = document.getElementById('camposEdicion');
    camposEdicion.innerHTML = `
        <div class="form-group">
            <label>Nombre del Grupo:</label>
            <input type="text" name="nombre_grupo" value="${grupo.nombre_grupo}" required>
        </div>
        <div class="form-group">
            <label>Carrera:</label>
            <select name="id_carrera" id="editCarreraSelect" required></select>
        </div>
        <div class="form-group">
            <label>Semestre:</label>
            <select name="id_semestre" id="editSemestreSelect" required></select>
        </div>
        <div class="form-group">
            <label>Turno:</label>
            <select name="turno" required>
                <option value="Matutino" ${grupo.turno === 'Matutino' ? 'selected' : ''}>Matutino</option>
            </select>
        </div>
        <div class="form-group">
            <label>Periodo:</label>
            <select name="periodo" required>
                <option value="Enero-Junio" ${grupo.periodo === 'Enero-Junio' ? 'selected' : ''}>Enero-Junio</option>
                <option value="Agosto-Enero" ${grupo.periodo === 'Agosto-Enero' ? 'selected' : ''}>Agosto-Enero</option>
            </select>
        </div>
        <div class="form-group">
            <label>Año:</label>
            <input type="number" name="anio" value="${grupo.anio}" min="2020" max="2030" required>
        </div>
    `;
    
    document.getElementById('editId').value = grupo.id_grupo;
    
    // Cargar carreras
    fetch('/api/carreras')
        .then(response => response.json())
        .then(carreras => {
            const carreraSelect = document.getElementById('editCarreraSelect');
            carreraSelect.innerHTML = '<option value="">Seleccionar carrera...</option>';
            
            carreras.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera.id_carrera;
                option.textContent = carrera.nombre_carrera;
                if (carrera.id_carrera == grupo.id_carrera) option.selected = true;
                carreraSelect.appendChild(option);
            });
            
            // Cargar semestres de la carrera actual
            if (grupo.id_carrera) {
                cargarSemestresEdicion(grupo.id_carrera, grupo.id_semestre);
            }
        });
    
    // Listener para cambio de carrera en edición
    document.getElementById('editCarreraSelect').addEventListener('change', function() {
        cargarSemestresEdicion(this.value, null);
    });
    
    document.getElementById('formEdicion').onsubmit = async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const grupoData = {
            nombre_grupo: formData.get('nombre_grupo'),
            id_carrera: parseInt(formData.get('id_carrera')),
            id_semestre: parseInt(formData.get('id_semestre')),
            turno: formData.get('turno'),
            periodo: formData.get('periodo'),
            anio: parseInt(formData.get('anio')),
            activo: true
        };
        
        if (!grupoData.nombre_grupo || !grupoData.id_carrera || !grupoData.id_semestre) {
            showAlert('Todos los campos son requeridos', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/grupos/${grupo.id_grupo}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(grupoData),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert(data.message || 'Grupo actualizado correctamente', 'success');
                cerrarModal();
                cargarGrupos();
            } else {
                showAlert(data.error || 'Error al actualizar grupo', 'error');
            }
        } catch (error) {
            console.error('Error al actualizar grupo:', error);
            showAlert('Error en el servidor', 'error');
        }
    };
}

// Función auxiliar para cargar semestres en edición
async function cargarSemestresEdicion(idCarrera, semestreSeleccionado) {
    const select = document.getElementById('editSemestreSelect');
    
    if (!idCarrera) {
        select.innerHTML = '<option value="">Primero selecciona una carrera</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/semestres?id_carrera=${idCarrera}`);
        const semestres = await response.json();
        
        select.innerHTML = '<option value="">Seleccionar semestre...</option>';
        semestres.forEach(semestre => {
            const option = document.createElement('option');
            option.value = semestre.id_semestre;
            option.textContent = `${semestre.numero_semestre}° - ${semestre.nombre_semestre}`;
            if (semestre.id_semestre == semestreSeleccionado) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        if (semestres.length === 0) {
            select.innerHTML = '<option value="">No hay semestres para esta carrera</option>';
        }
    } catch (error) {
        console.error('Error al cargar semestres:', error);
        showAlert('Error al cargar semestres', 'error');
    }
}

// Función para eliminar grupo
function eliminarGrupo(id, nombre) {
    if (confirm(`¿Eliminar el grupo "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
        fetch(`/api/grupos/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                showAlert('Grupo eliminado correctamente', 'success');
                cargarGrupos();
            } else {
                showAlert(data.error || 'Error al eliminar grupo', 'error');
            }
        })
        .catch(error => {
            console.error('Error al eliminar grupo:', error);
            showAlert('Error en el servidor', 'error');
        });
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Listener para cambiar semestres cuando cambia la carrera en el formulario principal
    const idCarrera = document.getElementById('idCarrera');
    if (idCarrera) {
        idCarrera.addEventListener('change', function() {
            cargarSemestres(this.value, 'semestreActual');
        });
    }
    
    // Listener para filtro por carrera (automático, sin botón)
    const filterCarrera = document.getElementById('filterCarreraGrupo');
    if (filterCarrera) {
        filterCarrera.addEventListener('change', function() {
            const idCarrera = this.value;
            
            // Resetear el filtro de semestre al cambiar de carrera
            document.getElementById('filterSemestreGrupo').value = '';
            
            // Cargar semestres de la carrera seleccionada
            if (idCarrera) {
                cargarSemestresParaFiltro(idCarrera);
            } else {
                document.getElementById('filterSemestreGrupo').innerHTML = '<option value="">Todos los semestres</option>';
            }
            
            // Actualizar la tabla de grupos automáticamente (sin filtro de semestre)
            cargarGrupos(idCarrera, '');
        });
    }
    
    // Listener para filtro por semestre (automático, sin botón)
    const filterSemestre = document.getElementById('filterSemestreGrupo');
    if (filterSemestre) {
        filterSemestre.addEventListener('change', function() {
            const idCarrera = document.getElementById('filterCarreraGrupo').value;
            const idSemestre = this.value;
            
            // Actualizar la tabla de grupos automáticamente
            cargarGrupos(idCarrera, idSemestre);
        });
    }
    
    // Manejador del formulario de grupo
    const formGrupo = document.getElementById('formGrupo');
    if (formGrupo) {
        formGrupo.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const grupoData = {
                nombre_grupo: formData.get('nombreGrupo'),
                id_carrera: parseInt(formData.get('idCarrera')),
                id_semestre: parseInt(formData.get('semestreActual')),
                turno: formData.get('turno'),
                periodo: formData.get('periodo'),
                anio: parseInt(formData.get('anio')),
                activo: true
            };
            
            if (!grupoData.nombre_grupo || !grupoData.id_carrera || !grupoData.id_semestre) {
                showAlert('Todos los campos son requeridos', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/grupos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(grupoData),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert(data.message, 'success');
                    this.reset();
                    // Limpiar el select de semestre
                    document.getElementById('semestreActual').innerHTML = '<option value="">Primero selecciona una carrera</option>';
                    cargarGrupos();
                } else {
                    showAlert(data.error || 'Error al registrar grupo', 'error');
                }
            } catch (error) {
                console.error('Error al registrar grupo:', error);
                showAlert('Error en el servidor', 'error');
            }
        });
    }
});

// Cargar datos iniciales
function cargarDatosIniciales() {
    cargarCarreras();
    cargarGrupos();
}