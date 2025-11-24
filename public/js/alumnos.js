// ===== FUNCIONES ESPECÍFICAS PARA ALUMNOS =====

// Variable global para almacenar la foto en Base64
let fotoBase64 = null;

// Función para cargar alumnos con filtros opcionales
async function cargarAlumnos(idCarrera = '', idSemestre = '', idGrupo = '') {
    try {
        let url = '/api/alumnos';
        
        // Si hay un filtro de grupo específico, usar el endpoint de grupo
        if (idGrupo) {
            url = `/api/alumnos/grupo/${idGrupo}`;
        } else {
            // Si no hay filtro de grupo, usamos el endpoint general
            // (El backend no soporta filtro por carrera/semestre sin grupo, 
            // así que filtramos en el frontend)
        }
        
        const response = await fetch(url);
        let alumnos = await response.json();
        
        // Filtrar en frontend si hay carrera o semestre (pero no grupo)
        if (!idGrupo && (idCarrera || idSemestre)) {
            alumnos = alumnos.filter(alumno => {
                if (idCarrera && alumno.id_carrera != idCarrera) return false;
                if (idSemestre && alumno.id_semestre != idSemestre) return false;
                return true;
            });
        }

        const alumnosTable = document.getElementById('alumnosTable');

        if (alumnos.length === 0) {
            alumnosTable.innerHTML = '<p>No hay alumnos registrados</p>';
            return;
        }

        let html = '<table class="data-table">';
        html += '<tr><th>Foto</th><th>Matrícula</th><th>Nombre Completo</th><th>Carrera</th><th>Semestre</th><th>Grupo</th><th>Acciones</th></tr>';

        alumnos.forEach(alumno => {
            const fotoHTML = alumno.foto_base64 
                ? `<img src="${alumno.foto_base64}" alt="Foto" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` 
                : '<i class="fas fa-user-circle" style="font-size: 40px; color: #ccc;"></i>';
            
            html += `<tr>
                <td style="text-align: center;">${fotoHTML}</td>
                <td>${alumno.matricula}</td>
                <td>${alumno.nombre_completo}</td>
                <td>${alumno.nombre_carrera || 'N/A'}</td>
                <td>${alumno.numero_semestre}°</td>
                <td>${alumno.nombre_grupo || 'N/A'}</td>
                <td>
                    <button class="btn-editar" onclick='editarAlumno(${JSON.stringify(alumno).replace(/'/g, "&apos;")})'>
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-eliminar" onclick="eliminarAlumno(${alumno.id_alumno}, '${alumno.nombre_completo}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>`;
        });

        html += '</table>';
        alumnosTable.innerHTML = html;

    } catch (error) {
        console.error('Error al cargar alumnos:', error);
        showAlert('Error al cargar alumnos', 'error');
    }
}

// Función para cargar carreras en los selectores
async function cargarCarreras() {
    try {
        const response = await fetch('/api/carreras');
        const carreras = await response.json();

        // Cargar en el select del formulario
        const select = document.getElementById('idCarreraAlumno');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar carrera...</option>';
            carreras.forEach(carrera => {
                select.innerHTML += `<option value="${carrera.id_carrera}">${carrera.nombre_carrera}</option>`;
            });
        }
        
        // Cargar en el select del filtro
        const selectFiltro = document.getElementById('filterCarreraAlumno');
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
    const select = document.getElementById('filterSemestreAlumno');
    
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

// Función para cargar grupos en el filtro
async function cargarGruposParaFiltro(idCarrera, idSemestre) {
    const select = document.getElementById('filterGrupoAlumno');
    
    if (!idCarrera) {
        select.innerHTML = '<option value="">Todos los grupos</option>';
        return;
    }
    
    try {
        let url = `/api/grupos?id_carrera=${idCarrera}`;
        if (idSemestre) {
            url += `&id_semestre=${idSemestre}`;
        }
        
        const response = await fetch(url);
        const grupos = await response.json();
        
        select.innerHTML = '<option value="">Todos los grupos</option>';
        grupos.forEach(grupo => {
            select.innerHTML += `<option value="${grupo.id_grupo}">${grupo.nombre_grupo} - ${grupo.numero_semestre}° Sem</option>`;
        });
        
        if (grupos.length === 0) {
            select.innerHTML = '<option value="">No hay grupos</option>';
        }
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        showAlert('Error al cargar grupos', 'error');
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
            // Usar id_semestre como value ahora que es foreign key en Grupos
            select.innerHTML += `<option value="${semestre.id_semestre}">${semestre.numero_semestre}° - ${semestre.nombre_semestre}</option>`;
        });
        
        if (semestres.length === 0) {
            select.innerHTML = '<option value="">No hay semestres para esta carrera</option>';
            showAlert('Esta carrera no tiene semestres registrados.', 'warning');
        }
    } catch (error) {
        console.error('Error al cargar semestres:', error);
        showAlert('Error al cargar semestres', 'error');
    }
}

// Función para cargar grupos según carrera y semestre seleccionados
async function cargarGrupos(idCarrera, semestre, selectId) {
    const select = document.getElementById(selectId);
    
    if (!idCarrera || !semestre) {
        select.innerHTML = '<option value="">Primero selecciona carrera y semestre</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/grupos?id_carrera=${idCarrera}&id_semestre=${semestre}`);
        const grupos = await response.json();
        
        select.innerHTML = '<option value="">Seleccionar grupo...</option>';
        grupos.forEach(grupo => {
            select.innerHTML += `<option value="${grupo.id_grupo}">${grupo.nombre_grupo} - ${grupo.turno} (${grupo.periodo} ${grupo.anio})</option>`;
        });
        
        if (grupos.length === 0) {
            select.innerHTML = '<option value="">No hay grupos disponibles</option>';
            showAlert('No hay grupos para esta carrera y semestre.', 'warning');
        }
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        showAlert('Error al cargar grupos', 'error');
    }
}

// Función para manejar la carga de foto
function handleFotoChange(input, previewId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    
    if (file) {
        // Validar tipo de archivo
        if (!file.type.match('image.*')) {
            showAlert('Por favor selecciona una imagen válida', 'error');
            input.value = '';
            return;
        }
        
        // Validar tamaño (máximo 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showAlert('La imagen no debe superar 2MB', 'error');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            fotoBase64 = e.target.result;
            preview.src = fotoBase64;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        fotoBase64 = null;
        preview.style.display = 'none';
    }
}

// Función para editar alumno
function editarAlumno(alumno) {
    mostrarModal('Editar Alumno');
    
    const fotoPreview = alumno.foto_base64 
        ? `<img src="${alumno.foto_base64}" id="editFotoPreview" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; display: block; margin: 10px auto;">` 
        : '<img id="editFotoPreview" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; display: none; margin: 10px auto;">';
    
    const camposEdicion = document.getElementById('camposEdicion');
    camposEdicion.innerHTML = `
        <div class="form-group">
            <label>Matrícula:</label>
            <input type="text" name="matricula" value="${alumno.matricula}" required>
        </div>
        <div class="form-group">
            <label>Nombre(s):</label>
            <input type="text" name="nombre_alumno" value="${alumno.nombre_alumno}" required>
        </div>
        <div class="form-group">
            <label>Apellido Paterno:</label>
            <input type="text" name="apellido_paterno" value="${alumno.apellido_paterno}" required>
        </div>
        <div class="form-group">
            <label>Apellido Materno:</label>
            <input type="text" name="apellido_materno" value="${alumno.apellido_materno || ''}">
        </div>
        <div class="form-group">
            <label>Carrera:</label>
            <select name="id_carrera" id="editCarreraAlumno" required></select>
        </div>
        <div class="form-group">
            <label>Semestre:</label>
            <select name="id_semestre" id="editSemestreAlumno" required></select>
        </div>
        <div class="form-group">
            <label>Grupo:</label>
            <select name="id_grupo" id="editGrupoAlumno" required></select>
        </div>
        <div class="form-group">
            <label>Foto del Alumno (opcional):</label>
            ${fotoPreview}
            <input type="file" id="editFotoAlumno" accept="image/*" onchange="handleFotoChange(this, 'editFotoPreview')">
            <small style="color: #666;">Formatos: JPG, PNG. Máximo 2MB</small>
        </div>
    `;

    document.getElementById('editId').value = alumno.id_alumno;
    
    // Guardar foto actual
    fotoBase64 = alumno.foto_base64 || null;
    
    // Cargar carreras
    fetch('/api/carreras')
        .then(response => response.json())
        .then(carreras => {
            const select = document.getElementById('editCarreraAlumno');
            select.innerHTML = '<option value="">Seleccionar carrera...</option>';
            carreras.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera.id_carrera;
                option.textContent = carrera.nombre_carrera;
                if (carrera.id_carrera == alumno.id_carrera) option.selected = true;
                select.appendChild(option);
            });
            
            // Cargar semestres de la carrera actual
            if (alumno.id_carrera) {
                cargarSemestresEdicion(alumno.id_carrera, alumno.id_semestre, null);
            }
        });
    
    // Listener para cambio de carrera
    document.getElementById('editCarreraAlumno').addEventListener('change', function() {
        cargarSemestresEdicion(this.value, null, null);
        document.getElementById('editGrupoAlumno').innerHTML = '<option value="">Primero selecciona carrera y semestre</option>';
    });
    
    // Listener para cambio de semestre
    document.getElementById('editSemestreAlumno').addEventListener('change', function() {
        const idCarrera = document.getElementById('editCarreraAlumno').value;
        const semestreSelect = document.getElementById('editSemestreAlumno');
        const idSemestre = semestreSelect.value;
        
        if (idCarrera && idSemestre) {
            cargarGruposEdicion(idCarrera, idSemestre, alumno.id_grupo);
        }
    });

    document.getElementById('formEdicion').onsubmit = async function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        const alumnoData = {
            matricula: formData.get('matricula'),
            nombre_alumno: formData.get('nombre_alumno'),
            apellido_paterno: formData.get('apellido_paterno'),
            apellido_materno: formData.get('apellido_materno') || '',
            id_carrera: parseInt(formData.get('id_carrera')),
            id_semestre: parseInt(formData.get('id_semestre')),
            id_grupo: parseInt(formData.get('id_grupo')),
            foto_base64: fotoBase64,
            activo: true
        };

        if (!alumnoData.id_grupo) {
            showAlert('Por favor seleccione un grupo válido', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/alumnos/${alumno.id_alumno}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(alumnoData),
            });

            const data = await response.json();

            if (response.ok) {
                showAlert(data.message || 'Alumno actualizado correctamente', 'success');
                cerrarModal();
                fotoBase64 = null;
                cargarAlumnos();
            } else {
                showAlert(data.error || 'Error al actualizar alumno', 'error');
            }
        } catch (error) {
            console.error('Error al actualizar alumno:', error);
            showAlert('Error en el servidor', 'error');
        }
    };
}

// Función auxiliar para cargar semestres en edición
async function cargarSemestresEdicion(idCarrera, idSemestreSeleccionado, numeroSemestre) {
    const select = document.getElementById('editSemestreAlumno');
    
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
            if (semestre.id_semestre == idSemestreSeleccionado) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // Si hay un semestre seleccionado, cargar los grupos
        if (idSemestreSeleccionado && idCarrera) {
            // Simular cambio para cargar grupos
            const event = new Event('change');
            select.dispatchEvent(event);
        }
    } catch (error) {
        console.error('Error al cargar semestres:', error);
        showAlert('Error al cargar semestres', 'error');
    }
}

// Función auxiliar para cargar grupos en edición
async function cargarGruposEdicion(idCarrera, idSemestre, idGrupoSeleccionado) {
    const select = document.getElementById('editGrupoAlumno');
    
    if (!idCarrera || !idSemestre) {
        select.innerHTML = '<option value="">Primero selecciona carrera y semestre</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/grupos?id_carrera=${idCarrera}&id_semestre=${idSemestre}`);
        const grupos = await response.json();
        
        select.innerHTML = '<option value="">Seleccionar grupo...</option>';
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo.id_grupo;
            option.textContent = `${grupo.nombre_grupo} - ${grupo.turno} (${grupo.periodo} ${grupo.anio})`;
            if (grupo.id_grupo == idGrupoSeleccionado) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        if (grupos.length === 0) {
            select.innerHTML = '<option value="">No hay grupos disponibles</option>';
        }
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        showAlert('Error al cargar grupos', 'error');
    }
}

// Función para eliminar alumno
function eliminarAlumno(id, nombre, forzar = false) {
    if (confirm(`¿Eliminar al alumno "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
        const url = forzar ? `/api/alumnos/${id}?forzar=true` : `/api/alumnos/${id}`;
        
        fetch(url, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                showAlert('Alumno eliminado correctamente', 'success');
                cargarAlumnos();
            } else if (data.tieneAsistencias && !forzar) {
                // El alumno tiene asistencias, preguntar si desea eliminarlas también
                const mensaje = `El alumno "${nombre}" tiene ${data.totalAsistencias} registro(s) de asistencia.\n\n` +
                               `¿Deseas eliminar el alumno y todos sus registros de asistencia?\n\n` +
                               `ADVERTENCIA: Esta acción no se puede deshacer.`;
                
                if (confirm(mensaje)) {
                    // Llamar recursivamente con forzar=true
                    eliminarAlumno(id, nombre, true);
                }
            } else {
                showAlert(data.error || 'Error al eliminar alumno', 'error');
            }
        })
        .catch(error => {
            console.error('Error al eliminar alumno:', error);
            showAlert('Error en el servidor', 'error');
        });
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Listener para cambio de carrera en formulario principal
    const idCarrera = document.getElementById('idCarreraAlumno');
    if (idCarrera) {
        idCarrera.addEventListener('change', function() {
            const carreraId = this.value;
            cargarSemestres(carreraId, 'idSemestreAlumno');
            document.getElementById('idGrupoAlumno').innerHTML = '<option value="">Primero selecciona carrera y semestre</option>';
        });
    }
    
    // Listener para cambio de semestre en formulario principal
    const idSemestre = document.getElementById('idSemestreAlumno');
    if (idSemestre) {
        idSemestre.addEventListener('change', function() {
            const carreraId = document.getElementById('idCarreraAlumno').value;
            const numeroSemestre = this.value; // El value ahora es el numero_semestre
            
            if (carreraId && numeroSemestre) {
                cargarGrupos(carreraId, numeroSemestre, 'idGrupoAlumno');
            }
        });
    }
    
    // ===== LISTENERS PARA FILTROS (sin botón, automáticos) =====
    
    // Listener para filtro por carrera
    const filterCarrera = document.getElementById('filterCarreraAlumno');
    if (filterCarrera) {
        filterCarrera.addEventListener('change', function() {
            const idCarrera = this.value;
            
            // Resetear filtros de semestre y grupo
            document.getElementById('filterSemestreAlumno').value = '';
            document.getElementById('filterGrupoAlumno').value = '';
            
            // Cargar semestres de la carrera seleccionada
            if (idCarrera) {
                cargarSemestresParaFiltro(idCarrera);
                cargarGruposParaFiltro(idCarrera, '');
            } else {
                document.getElementById('filterSemestreAlumno').innerHTML = '<option value="">Todos los semestres</option>';
                document.getElementById('filterGrupoAlumno').innerHTML = '<option value="">Todos los grupos</option>';
            }
            
            // Actualizar tabla automáticamente
            cargarAlumnos(idCarrera, '', '');
        });
    }
    
    // Listener para filtro por semestre
    const filterSemestre = document.getElementById('filterSemestreAlumno');
    if (filterSemestre) {
        filterSemestre.addEventListener('change', function() {
            const idCarrera = document.getElementById('filterCarreraAlumno').value;
            const idSemestre = this.value;
            
            // Resetear filtro de grupo
            document.getElementById('filterGrupoAlumno').value = '';
            
            // Cargar grupos de la carrera y semestre seleccionados
            if (idCarrera) {
                cargarGruposParaFiltro(idCarrera, idSemestre);
            }
            
            // Actualizar tabla automáticamente
            cargarAlumnos(idCarrera, idSemestre, '');
        });
    }
    
    // Listener para filtro por grupo
    const filterGrupo = document.getElementById('filterGrupoAlumno');
    if (filterGrupo) {
        filterGrupo.addEventListener('change', function() {
            const idCarrera = document.getElementById('filterCarreraAlumno').value;
            const idSemestre = document.getElementById('filterSemestreAlumno').value;
            const idGrupo = this.value;
            
            // Actualizar tabla automáticamente
            cargarAlumnos(idCarrera, idSemestre, idGrupo);
        });
    }
    
    // Manejador del formulario de alumno
    const formAlumno = document.getElementById('formAlumno');
    if (formAlumno) {
        formAlumno.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            
            // Obtener el id_semestre directamente del valor de la opción seleccionada
            const semestreSelect = document.getElementById('idSemestreAlumno');
            const idSemestre = semestreSelect.value ? parseInt(semestreSelect.value) : null;
            
            const alumnoData = {
                matricula: formData.get('matricula'),
                nombre_alumno: formData.get('nombreAlumno'),
                apellido_paterno: formData.get('apellidoPaterno'),
                apellido_materno: formData.get('apellidoMaterno') || '',
                id_carrera: parseInt(formData.get('idCarreraAlumno')),
                id_semestre: idSemestre,
                id_grupo: parseInt(formData.get('idGrupoAlumno')),
                foto_base64: fotoBase64,
                activo: true
            };

            if (!alumnoData.id_grupo || isNaN(alumnoData.id_grupo)) {
                showAlert('Por favor seleccione un grupo válido', 'error');
                return;
            }

            try {
                const response = await fetch('/api/alumnos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(alumnoData),
                });

                const data = await response.json();

                if (response.ok) {
                    showAlert(data.message, 'success');
                    this.reset();
                    fotoBase64 = null;
                    document.getElementById('fotoPreview').style.display = 'none';
                    document.getElementById('idSemestreAlumno').innerHTML = '<option value="">Primero selecciona una carrera</option>';
                    document.getElementById('idGrupoAlumno').innerHTML = '<option value="">Primero selecciona carrera y semestre</option>';
                    cargarAlumnos();
                } else {
                    showAlert(data.error || 'Error al registrar alumno', 'error');
                }
            } catch (error) {
                console.error('Error al registrar alumno:', error);
                showAlert('Error en el servidor', 'error');
            }
        });
    }
});

// Cargar datos iniciales
function cargarDatosIniciales() {
    cargarCarreras();
    cargarAlumnos();
}

// ===== FUNCIONES PARA IMPORTACIÓN DE CSV =====

let alumnosCSV = []; // Variable global para almacenar los alumnos del CSV

// Funciones para indicador de carga durante importación
function mostrarIndicadorCarga(totalAlumnos) {
    const overlay = document.getElementById('loadingOverlay');
    const progressText = document.getElementById('loadingProgress');
    
    if (overlay) {
        overlay.style.display = 'flex';
        if (progressText) {
            progressText.textContent = `Procesando ${totalAlumnos} alumnos...`;
        }
    }
}

function ocultarIndicadorCarga() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Función para abrir el modal de importar CSV
function abrirModalImportarCSV() {
    const modal = document.getElementById('modalImportarCSV');
    modal.style.display = 'block';
    
    // Cargar carreras en el modal
    cargarCarrerasCSV();
    
    // Limpiar formulario
    document.getElementById('formImportarCSV').reset();
    document.getElementById('vistaPrevia').style.display = 'none';
    alumnosCSV = [];
}

// Función para cerrar el modal
function cerrarModalImportarCSV() {
    const modal = document.getElementById('modalImportarCSV');
    modal.style.display = 'none';
    alumnosCSV = [];
}

// Función para cargar carreras en el modal CSV
async function cargarCarrerasCSV() {
    try {
        const response = await fetch('/api/carreras');
        const carreras = await response.json();
        
        const select = document.getElementById('csvCarrera');
        select.innerHTML = '<option value="">Seleccionar carrera...</option>';
        carreras.forEach(carrera => {
            select.innerHTML += `<option value="${carrera.id_carrera}">${carrera.nombre_carrera}</option>`;
        });
    } catch (error) {
        console.error('Error al cargar carreras:', error);
        showAlert('Error al cargar carreras', 'error');
    }
}

// Función para cargar semestres en el modal CSV
async function cargarSemestresCSV(idCarrera) {
    const select = document.getElementById('csvSemestre');
    
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
            select.innerHTML = '<option value="">No hay semestres</option>';
        }
    } catch (error) {
        console.error('Error al cargar semestres:', error);
        showAlert('Error al cargar semestres', 'error');
    }
}

// Función para cargar grupos en el modal CSV
async function cargarGruposCSV(idCarrera, idSemestre) {
    const select = document.getElementById('csvGrupo');
    
    if (!idCarrera || !idSemestre) {
        select.innerHTML = '<option value="">Primero selecciona carrera y semestre</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/grupos?id_carrera=${idCarrera}&id_semestre=${idSemestre}`);
        const grupos = await response.json();
        
        select.innerHTML = '<option value="">Seleccionar grupo...</option>';
        grupos.forEach(grupo => {
            select.innerHTML += `<option value="${grupo.id_grupo}">${grupo.nombre_grupo} - ${grupo.turno} (${grupo.periodo} ${grupo.anio})</option>`;
        });
        
        if (grupos.length === 0) {
            select.innerHTML = '<option value="">No hay grupos disponibles</option>';
        }
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        showAlert('Error al cargar grupos', 'error');
    }
}

// Función para procesar el archivo CSV
function procesarArchivoCSV(archivo) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const texto = e.target.result;
        const lineas = texto.split('\n').filter(linea => linea.trim() !== '');
        
        alumnosCSV = [];
        
        // Buscar la línea que contiene "Matricula,Nombre" (el encabezado real)
        let indiceEncabezado = -1;
        for (let i = 0; i < lineas.length; i++) {
            const lineaLower = lineas[i].toLowerCase();
            if (lineaLower.includes('matricula') && lineaLower.includes('nombre')) {
                indiceEncabezado = i;
                break;
            }
        }
        
        // Si no encontramos encabezado, empezar desde la primera línea
        const inicioLineas = indiceEncabezado >= 0 ? indiceEncabezado + 1 : 0;
        
        // Procesar cada línea de datos (después del encabezado)
        for (let i = inicioLineas; i < lineas.length; i++) {
            const linea = lineas[i];
            const partes = linea.split(',').map(p => p.trim());
            
            // Validar que tenga al menos matrícula y nombre
            if (partes.length >= 2 && partes[0] && partes[1]) {
                const matricula = partes[0];
                const nombreCompleto = partes[1];
                
                // Validar que la matrícula tenga formato válido (números y guiones)
                if (!/^[0-9\-]+$/.test(matricula)) {
                    continue; // Saltar líneas que no tienen matrícula válida
                }
                
                // Validar que el nombre no esté vacío y tenga letras
                if (!nombreCompleto || !/[a-zA-Z]/.test(nombreCompleto)) {
                    continue; // Saltar líneas sin nombre válido
                }
                
                // Dividir el nombre completo en partes
                const partesNombre = nombreCompleto.split(' ').filter(p => p.length > 0);
                
                // Asumimos que las primeras 2 palabras son apellidos y el resto es el nombre
                let nombre = '';
                let apellidoPaterno = '';
                let apellidoMaterno = '';
                
                if (partesNombre.length >= 3) {
                    apellidoPaterno = partesNombre[0];
                    apellidoMaterno = partesNombre[1];
                    nombre = partesNombre.slice(2).join(' ');
                } else if (partesNombre.length === 2) {
                    apellidoPaterno = partesNombre[0];
                    nombre = partesNombre[1];
                } else if (partesNombre.length === 1) {
                    nombre = partesNombre[0];
                } else {
                    continue; // Saltar si no hay nombre válido
                }
                
                alumnosCSV.push({
                    matricula: matricula,
                    nombre_alumno: nombre,
                    apellido_paterno: apellidoPaterno,
                    apellido_materno: apellidoMaterno,
                    nombre_completo: nombreCompleto
                });
            }
        }
        
        // Mostrar vista previa
        if (alumnosCSV.length > 0) {
            mostrarVistaPrevia();
        } else {
            showAlert('No se encontraron datos válidos en el archivo CSV. Verifica el formato.', 'error');
        }
    };
    
    reader.readAsText(archivo);
}

// Función para mostrar vista previa de los datos
function mostrarVistaPrevia() {
    const vistaPrevia = document.getElementById('vistaPrevia');
    const contenido = document.getElementById('vistaPreviaContenido');
    const totalRegistros = document.getElementById('totalRegistros');
    
    if (alumnosCSV.length === 0) {
        vistaPrevia.style.display = 'none';
        return;
    }
    
    vistaPrevia.style.display = 'block';
    
    // Mostrar los primeros 5 registros
    let html = '<ul style="list-style: none; padding: 0;">';
    alumnosCSV.slice(0, 5).forEach((alumno, index) => {
        html += `<li style="padding: 5px; border-bottom: 1px solid #eee;">
            ${index + 1}. ${alumno.matricula} - ${alumno.nombre_completo}
        </li>`;
    });
    html += '</ul>';
    
    contenido.innerHTML = html;
    totalRegistros.textContent = `Total de registros a importar: ${alumnosCSV.length}`;
}

// Event listeners para el modal CSV
document.addEventListener('DOMContentLoaded', function() {
    // ... (código existente) ...
    
    // Listener para cambio de carrera en modal CSV
    const csvCarrera = document.getElementById('csvCarrera');
    if (csvCarrera) {
        csvCarrera.addEventListener('change', function() {
            const idCarrera = this.value;
            cargarSemestresCSV(idCarrera);
            document.getElementById('csvGrupo').innerHTML = '<option value="">Primero selecciona carrera y semestre</option>';
        });
    }
    
    // Listener para cambio de semestre en modal CSV
    const csvSemestre = document.getElementById('csvSemestre');
    if (csvSemestre) {
        csvSemestre.addEventListener('change', function() {
            const idCarrera = document.getElementById('csvCarrera').value;
            const idSemestre = this.value;
            
            if (idCarrera && idSemestre) {
                cargarGruposCSV(idCarrera, idSemestre);
            }
        });
    }
    
    // Listener para archivo CSV
    const archivoCSV = document.getElementById('archivoCSV');
    if (archivoCSV) {
        archivoCSV.addEventListener('change', function(e) {
            const archivo = e.target.files[0];
            if (archivo) {
                procesarArchivoCSV(archivo);
            }
        });
    }
    
    // Manejador del formulario de importar CSV
    const formImportarCSV = document.getElementById('formImportarCSV');
    if (formImportarCSV) {
        formImportarCSV.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (alumnosCSV.length === 0) {
                showAlert('No hay alumnos para importar', 'error');
                return;
            }
            
            const idCarrera = parseInt(document.getElementById('csvCarrera').value);
            const idSemestre = parseInt(document.getElementById('csvSemestre').value);
            const idGrupo = parseInt(document.getElementById('csvGrupo').value);
            
            if (!idCarrera || !idSemestre || !idGrupo) {
                showAlert('Por favor selecciona carrera, semestre y grupo', 'error');
                return;
            }
            
            // Agregar los IDs a cada alumno
            const alumnosParaImportar = alumnosCSV.map(alumno => ({
                ...alumno,
                id_carrera: idCarrera,
                id_semestre: idSemestre,
                id_grupo: idGrupo,
                activo: true
            }));
            
            // Mostrar indicador de carga
            mostrarIndicadorCarga(alumnosParaImportar.length);
            
            try {
                const response = await fetch('/api/alumnos/importar-csv', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ alumnos: alumnosParaImportar }),
                });
                
                const data = await response.json();
                
                // Ocultar indicador de carga
                ocultarIndicadorCarga();
                
                if (response.ok) {
                    showAlert(`${data.message}. Importados: ${data.importados}, Omitidos: ${data.omitidos}`, 'success');
                    cerrarModalImportarCSV();
                    cargarAlumnos();
                } else {
                    showAlert(data.error || 'Error al importar alumnos', 'error');
                }
            } catch (error) {
                console.error('Error al importar alumnos:', error);
                ocultarIndicadorCarga();
                showAlert('Error en el servidor', 'error');
            }
        });
    }
});