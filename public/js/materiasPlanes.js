// ===== GESTIÓN UNIFICADA DE MATERIAS Y PLAN DE ESTUDIOS =====

// Cargar carreras en los selectores
async function cargarCarreras() {
    try {
        const response = await fetch('/api/carreras');
        const carreras = await response.json();
        
        // Selector del formulario
        const selectCarrera = document.getElementById('selectCarrera');
        selectCarrera.innerHTML = '<option value="">Seleccionar carrera...</option>';
        
        // Selector del filtro
        const filtroCarrera = document.getElementById('filtroCarrera');
        filtroCarrera.innerHTML = '<option value="">Todas las carreras</option>';
        
        carreras.forEach(carrera => {
            selectCarrera.innerHTML += `<option value="${carrera.id_carrera}">${carrera.nombre_carrera}</option>`;
            filtroCarrera.innerHTML += `<option value="${carrera.id_carrera}">${carrera.nombre_carrera}</option>`;
        });
    } catch (error) {
        console.error('Error al cargar carreras:', error);
        showAlert('Error al cargar carreras', 'error');
    }
}

// Cargar semestres para el filtro cuando se selecciona una carrera
async function cargarSemestresFiltro() {
    const idCarrera = document.getElementById('filtroCarrera').value;
    const filtroSemestre = document.getElementById('filtroSemestre');
    
    // Resetear el filtro de semestre
    filtroSemestre.innerHTML = '<option value="">Todos los semestres</option>';
    
    if (!idCarrera) {
        filtroSemestre.disabled = true;
        cargarPlanEstudios();
        return;
    }
    
    try {
        const response = await fetch(`/api/semestres/carrera/${idCarrera}`);
        const data = await response.json();
        
        if (!response.ok || data.error) {
            filtroSemestre.disabled = true;
            cargarPlanEstudios();
            return;
        }
        
        const semestres = Array.isArray(data) ? data : [];
        
        if (semestres.length > 0) {
            filtroSemestre.disabled = false;
            semestres.forEach(semestre => {
                filtroSemestre.innerHTML += `<option value="${semestre.id_semestre}">${semestre.nombre_semestre}</option>`;
            });
        } else {
            filtroSemestre.disabled = true;
        }
        
        cargarPlanEstudios();
    } catch (error) {
        console.error('Error al cargar semestres del filtro:', error);
        filtroSemestre.disabled = true;
        cargarPlanEstudios();
    }
}

// Cargar semestres según la carrera seleccionada
async function cargarSemestres(idCarrera) {
    const selectSemestre = document.getElementById('selectSemestre');
    
    if (!idCarrera) {
        selectSemestre.disabled = true;
        selectSemestre.innerHTML = '<option value="">Primero seleccione una carrera...</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/semestres/carrera/${idCarrera}`);
        const data = await response.json();
        
        // Verificar si hay error
        if (!response.ok || data.error) {
            console.error('Error del servidor:', data.error || 'Error desconocido');
            selectSemestre.innerHTML = '<option value="">Error al cargar semestres</option>';
            selectSemestre.disabled = true;
            showAlert(data.error || 'Error al cargar semestres', 'error');
            return;
        }
        
        const semestres = Array.isArray(data) ? data : [];
        
        selectSemestre.disabled = false;
        selectSemestre.innerHTML = '<option value="">Seleccionar semestre...</option>';
        
        if (semestres.length === 0) {
            selectSemestre.innerHTML = '<option value="">No hay semestres para esta carrera</option>';
            selectSemestre.disabled = true;
        } else {
            semestres.forEach(semestre => {
                selectSemestre.innerHTML += `<option value="${semestre.id_semestre}">${semestre.nombre_semestre}</option>`;
            });
        }
    } catch (error) {
        console.error('Error al cargar semestres:', error);
        selectSemestre.innerHTML = '<option value="">Error de conexión</option>';
        selectSemestre.disabled = true;
        showAlert('Error al cargar semestres', 'error');
    }
}

// Cargar plan de estudios completo
async function cargarPlanEstudios() {
    try {
        const filtroCarrera = document.getElementById('filtroCarrera').value;
        const filtroSemestre = document.getElementById('filtroSemestre').value;
        const container = document.getElementById('planEstudiosContainer');
        
        let url = '/api/plan-estudios';
        if (filtroCarrera) {
            url = `/api/plan-estudios/carrera/${filtroCarrera}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        // Verificar si hay error
        if (!response.ok || data.error) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${data.error || 'Error al cargar el plan de estudios'}</p>
                </div>
            `;
            return;
        }
        
        let datos = Array.isArray(data) ? data : [];
        
        // Filtrar por semestre si está seleccionado
        if (filtroSemestre) {
            datos = datos.filter(item => item.id_semestre == filtroSemestre);
        }
        
        if (!datos || datos.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-book-open"></i>
                    <p>No hay materias registradas en el plan de estudios con los filtros seleccionados</p>
                </div>
            `;
            return;
        }
        
        // Organizar datos por carrera y semestre
        const organizados = organizarPorCarreraYSemestre(datos);
        
        // Renderizar
        container.innerHTML = '';
        Object.keys(organizados).forEach(nombreCarrera => {
            const carreraData = organizados[nombreCarrera];
            container.innerHTML += renderizarCarrera(nombreCarrera, carreraData);
        });
        
    } catch (error) {
        console.error('Error al cargar plan de estudios:', error);
        showAlert('Error al cargar plan de estudios', 'error');
    }
}

// Organizar datos por carrera y semestre
function organizarPorCarreraYSemestre(datos) {
    const resultado = {};
    
    datos.forEach(item => {
        const carrera = item.nombre_carrera;
        const semestre = {
            numero: item.numero_semestre,
            nombre: item.nombre_semestre,
            id: item.id_semestre
        };
        
        if (!resultado[carrera]) {
            resultado[carrera] = {
                id_carrera: item.id_carrera,
                semestres: {}
            };
        }
        
        if (!resultado[carrera].semestres[semestre.numero]) {
            resultado[carrera].semestres[semestre.numero] = {
                info: semestre,
                materias: []
            };
        }
        
        resultado[carrera].semestres[semestre.numero].materias.push({
            id_materia: item.id_materia,
            id_plan: item.id_plan,
            nombre_materia: item.nombre_materia,
            codigo_materia: item.codigo_materia
        });
    });
    
    return resultado;
}

// Renderizar una carrera con sus semestres y materias
function renderizarCarrera(nombreCarrera, data) {
    const semestresOrdenados = Object.keys(data.semestres).sort((a, b) => a - b);
    
    let html = `
        <div class="carrera-card">
            <div class="carrera-header">
                <h3>${nombreCarrera}</h3>
            </div>
            <div class="semestres-list">
    `;
    
    semestresOrdenados.forEach(numeroSemestre => {
        const semestreData = data.semestres[numeroSemestre];
        html += `
            <div class="semestre-section">
                <div class="semestre-header">
                    <h4>${semestreData.info.nombre}</h4>
                    <span class="semestre-badge">${semestreData.materias.length} materias</span>
                </div>
                <div class="materias-list">
        `;
        
        if (semestreData.materias.length === 0) {
            html += '<div class="no-materias">No hay materias en este semestre</div>';
        } else {
            semestreData.materias.forEach(materia => {
                const materiaData = {
                    id_materia: materia.id_materia,
                    nombre_materia: materia.nombre_materia,
                    codigo_materia: materia.codigo_materia,
                    id_carrera: data.id_carrera,
                    id_semestre: semestreData.info.id
                };
                html += `
                    <div class="materia-item">
                        <div class="materia-info">
                            <strong>${materia.nombre_materia}</strong>
                            <span class="materia-codigo">${materia.codigo_materia}</span>
                        </div>
                        <div class="materia-actions">
                            <button class="btn-editar-mini" 
                                    onclick='editarMateria(${JSON.stringify(materiaData)})' 
                                    title="Editar materia">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-eliminar-mini" 
                                    onclick='eliminarMateria(${materia.id_materia}, ${JSON.stringify(materia.nombre_materia)})' 
                                    title="Eliminar materia">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

// Función para editar materia
async function editarMateria(materia) {
    mostrarModal('Editar Materia');
    
    const camposEdicion = document.getElementById('camposEdicion');
    camposEdicion.innerHTML = `
        <div class="form-group">
            <label>Carrera:</label>
            <select name="id_carrera" id="editCarreraMateria" required></select>
        </div>
        <div class="form-group">
            <label>Semestre:</label>
            <select name="id_semestre" id="editSemestreMateria" required>
                <option value="">Primero selecciona una carrera</option>
            </select>
        </div>
        <div class="form-group">
            <label>Nombre de la Materia:</label>
            <input type="text" name="nombre_materia" value="${materia.nombre_materia}" required placeholder="Ej: Cálculo Diferencial">
        </div>
        <div class="form-group">
            <label>Código de Materia:</label>
            <input type="text" name="codigo_materia" value="${materia.codigo_materia}" required placeholder="Ej: PW-301">
        </div>
    `;
    
    document.getElementById('editId').value = materia.id_materia;
    
    // Cargar carreras
    const responseCarreras = await fetch('/api/carreras');
    const carreras = await responseCarreras.json();
    const selectCarrera = document.getElementById('editCarreraMateria');
    selectCarrera.innerHTML = '<option value="">Seleccionar carrera...</option>';
    carreras.forEach(carrera => {
        const option = document.createElement('option');
        option.value = carrera.id_carrera;
        option.textContent = carrera.nombre_carrera;
        if (carrera.id_carrera == materia.id_carrera) option.selected = true;
        selectCarrera.appendChild(option);
    });
    
    // Cargar semestres de esa carrera
    await cargarSemestresEdicion(materia.id_carrera, materia.id_semestre);
    
    // Event listener para cambio de carrera
    document.getElementById('editCarreraMateria').addEventListener('change', async function() {
        const carreraId = this.value;
        await cargarSemestresEdicion(carreraId, null);
    });
    
    // Manejador del submit para edición
    document.getElementById('formEdicion').onsubmit = async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const idMateria = formData.get('id');
        
        const materiaData = {
            id_carrera: parseInt(formData.get('id_carrera')),
            id_semestre: parseInt(formData.get('id_semestre')),
            nombre_materia: formData.get('nombre_materia'),
            codigo_materia: formData.get('codigo_materia')
        };
        
        try {
            const response = await fetch(`/api/materias/${idMateria}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(materiaData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert(data.message || 'Materia actualizada correctamente', 'success');
                cerrarModal();
                cargarPlanEstudios();
            } else {
                showAlert(data.error || 'Error al actualizar materia', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error en el servidor', 'error');
        }
    };
}

// Función auxiliar para cargar semestres en el modal de edición
async function cargarSemestresEdicion(idCarrera, idSemestreSeleccionado) {
    const select = document.getElementById('editSemestreMateria');
    
    if (!idCarrera) {
        select.innerHTML = '<option value="">Primero selecciona una carrera</option>';
        select.disabled = true;
        return;
    }
    
    try {
        const response = await fetch(`/api/semestres/carrera/${idCarrera}`);
        const data = await response.json();
        
        if (!response.ok || data.error) {
            select.innerHTML = '<option value="">Error al cargar semestres</option>';
            select.disabled = true;
            return;
        }
        
        const semestres = Array.isArray(data) ? data : [];
        
        select.disabled = false;
        select.innerHTML = '<option value="">Seleccionar semestre...</option>';
        
        if (semestres.length === 0) {
            select.innerHTML = '<option value="">No hay semestres para esta carrera</option>';
            select.disabled = true;
        } else {
            semestres.forEach(semestre => {
                const option = document.createElement('option');
                option.value = semestre.id_semestre;
                option.textContent = semestre.nombre_semestre;
                if (semestre.id_semestre == idSemestreSeleccionado) option.selected = true;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar semestres:', error);
        select.innerHTML = '<option value="">Error de conexión</option>';
        select.disabled = true;
    }
}

// Eliminar materia
async function eliminarMateria(idMateria, nombreMateria) {
    if (!confirm(`¿Está seguro que desea eliminar la materia "${nombreMateria}"?\n\nEsta acción eliminará la materia del plan de estudios.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/materias/${idMateria}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Materia eliminada correctamente', 'success');
            cargarPlanEstudios();
        } else {
            showAlert(data.error || 'Error al eliminar materia', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar materia:', error);
        showAlert('Error al eliminar materia', 'error');
    }
}


// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos iniciales
    cargarCarreras();
    cargarPlanEstudios();
    
    // Cambio de carrera en el formulario
    document.getElementById('selectCarrera').addEventListener('change', function(e) {
        cargarSemestres(e.target.value);
    });
    
    // Submit del formulario
    document.getElementById('formMateria').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const datos = {
            id_carrera: parseInt(formData.get('idCarrera')),
            id_semestre: parseInt(formData.get('idSemestre')),
            nombre_materia: formData.get('nombreMateria'),
            codigo_materia: formData.get('codigoMateria')
        };
        
        try {
            // Crear nueva materia (automáticamente crea en PlanEstudios)
            const response = await fetch('/api/materias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert(data.message || 'Materia registrada correctamente', 'success');
                this.reset();
                document.getElementById('selectSemestre').disabled = true;
                document.getElementById('selectSemestre').innerHTML = '<option value="">Primero seleccione una carrera...</option>';
                cargarPlanEstudios();
            } else {
                showAlert(data.error || 'Error al registrar materia', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error de conexión con el servidor', 'error');
        }
    });
});
