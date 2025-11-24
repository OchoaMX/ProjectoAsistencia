// ===== FUNCIONES ESPECÍFICAS PARA SEMESTRES =====

// Función para cargar carreras en los selectores
async function cargarCarrerasSelect() {
    try {
        const response = await fetch('/api/carreras');
        const carreras = await response.json();
        
        // Llenar el select del formulario
        const selectCarrera = document.getElementById('carreraSemestre');
        selectCarrera.innerHTML = '<option value="">Seleccionar carrera</option>';
        carreras.forEach(carrera => {
            selectCarrera.innerHTML += `<option value="${carrera.id_carrera}">${carrera.nombre_carrera}</option>`;
        });
        
        // Llenar el select del filtro
        const selectFiltro = document.getElementById('filterCarreraSemestre');
        selectFiltro.innerHTML = '<option value="">Todas las carreras</option>';
        carreras.forEach(carrera => {
            selectFiltro.innerHTML += `<option value="${carrera.id_carrera}">${carrera.nombre_carrera}</option>`;
        });
    } catch (error) {
        console.error('Error al cargar carreras:', error);
        showAlert('Error al cargar carreras', 'error');
    }
}

// Función para mostrar información previa a la generación
function mostrarInfoGeneracion() {
    const carreraSelect = document.getElementById('carreraSemestre');
    const cantidadSelect = document.getElementById('cantidadSemestres');
    const infoMessage = document.getElementById('infoMessage');
    const infoText = document.getElementById('infoText');
    
    cantidadSelect.addEventListener('change', function() {
        const carreraId = carreraSelect.value;
        const cantidad = this.value;
        
        if (carreraId && cantidad) {
            const carreraNombre = carreraSelect.options[carreraSelect.selectedIndex].text;
            infoText.textContent = `Se generarán ${cantidad} semestre(s) para la carrera ${carreraNombre}. Los nombres se asignarán automáticamente (Primer Semestre, Segundo Semestre, etc.).`;
            infoMessage.style.display = 'block';
        } else {
            infoMessage.style.display = 'none';
        }
    });
    
    carreraSelect.addEventListener('change', function() {
        const cantidad = cantidadSelect.value;
        if (this.value && cantidad) {
            const carreraNombre = this.options[this.selectedIndex].text;
            infoText.textContent = `Se generarán ${cantidad} semestre(s) para la carrera ${carreraNombre}. Los nombres se asignarán automáticamente (Primer Semestre, Segundo Semestre, etc.).`;
            infoMessage.style.display = 'block';
        } else {
            infoMessage.style.display = 'none';
        }
    });
}

// Función para cargar semestres
async function cargarSemestres(idCarrera = '') {
    try {
        let url = '/api/semestres';
        if (idCarrera) {
            url += `?id_carrera=${idCarrera}`;
        }
        
        const response = await fetch(url);
        const semestres = await response.json();
        
        const semestresTable = document.getElementById('semestresTable');
        
        if (semestres.length === 0) {
            semestresTable.innerHTML = '<p>No hay semestres registrados</p>';
            return;
        }
        
        let html = '<table class="data-table">';
        html += '<tr><th>Carrera</th><th>Número</th><th>Nombre</th><th>Acciones</th></tr>';
        
        semestres.forEach(semestre => {
            html += `<tr>
                <td>${semestre.nombre_carrera}</td>
                <td>${semestre.numero_semestre}</td>
                <td>${semestre.nombre_semestre || '-'}</td>
                <td>
                    <button class="btn-editar" onclick="editarSemestre(${semestre.id_semestre}, ${semestre.id_carrera}, ${semestre.numero_semestre}, '${semestre.nombre_semestre || ''}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-eliminar" onclick="eliminarSemestre(${semestre.id_semestre}, '${semestre.nombre_semestre || semestre.numero_semestre + '° Semestre'}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>`;
        });
        
        html += '</table>';
        semestresTable.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar semestres:', error);
        showAlert('Error al cargar semestres', 'error');
    }
}

// Función para editar semestre
function editarSemestre(id, idCarrera, numeroSemestre, nombreSemestre) {
    mostrarModal('Editar Semestre');
    
    const camposEdicion = document.getElementById('camposEdicion');
    camposEdicion.innerHTML = `
        <div class="form-group">
            <label>Carrera:</label>
            <select name="id_carrera" id="editCarreraSemestre" required>
                <option value="">Seleccionar carrera</option>
            </select>
        </div>
        <div class="form-group">
            <label>Número de Semestre:</label>
            <select name="numero_semestre" required>
                ${[...Array(12)].map((_, i) => 
                    `<option value="${i+1}" ${numeroSemestre === i+1 ? 'selected' : ''}>${i+1}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Nombre del Semestre:</label>
            <input type="text" name="nombre_semestre" value="${nombreSemestre}">
        </div>
    `;
    
    // Cargar carreras en el select de edición
    fetch('/api/carreras')
        .then(response => response.json())
        .then(carreras => {
            const select = document.getElementById('editCarreraSemestre');
            carreras.forEach(carrera => {
                select.innerHTML += `<option value="${carrera.id_carrera}" ${carrera.id_carrera === idCarrera ? 'selected' : ''}>${carrera.nombre_carrera}</option>`;
            });
        });
    
    document.getElementById('editId').value = id;
    
    document.getElementById('formEdicion').onsubmit = async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const semestreData = {
            id_carrera: parseInt(formData.get('id_carrera')),
            numero_semestre: parseInt(formData.get('numero_semestre')),
            nombre_semestre: formData.get('nombre_semestre')
        };
        
        try {
            const response = await fetch(`/api/semestres/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(semestreData),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert(data.message || 'Semestre actualizado correctamente', 'success');
                cerrarModal();
                cargarSemestres();
            } else {
                showAlert(data.error || 'Error al actualizar semestre', 'error');
            }
        } catch (error) {
            console.error('Error al actualizar semestre:', error);
            showAlert('Error en el servidor', 'error');
        }
    };
}

// Función para eliminar semestre
function eliminarSemestre(id, nombre) {
    if (confirm(`¿Eliminar el semestre "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
        fetch(`/api/semestres/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                showAlert('Semestre eliminado correctamente', 'success');
                cargarSemestres();
            } else {
                showAlert(data.error || 'Error al eliminar semestre', 'error');
            }
        })
        .catch(error => {
            console.error('Error al eliminar semestre:', error);
            showAlert('Error en el servidor', 'error');
        });
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Manejador del formulario de semestre (NUEVA FUNCIONALIDAD)
    const formSemestre = document.getElementById('formSemestre');
    if (formSemestre) {
        formSemestre.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const generarData = {
                id_carrera: parseInt(formData.get('id_carrera')),
                cantidad_semestres: parseInt(formData.get('cantidad_semestres'))
            };
            
            try {
                const response = await fetch('/api/semestres/generar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(generarData),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Mostrar información detallada del resultado
                    let mensaje = data.message;
                    if (data.data && data.data.insertados > 0) {
                        mensaje += `\n\nSemestres creados: ${data.data.insertados}`;
                        if (data.data.existentes > 0) {
                            mensaje += `\nSemestres que ya existían: ${data.data.existentes}`;
                        }
                    }
                    
                    showAlert(mensaje, 'success');
                    this.reset();
                    document.getElementById('infoMessage').style.display = 'none';
                    cargarSemestres();
                } else {
                    showAlert(data.error || 'Error al generar semestres', 'error');
                }
            } catch (error) {
                console.error('Error al generar semestres:', error);
                showAlert('Error en el servidor', 'error');
            }
        });
    }
    
    // Filtro por carrera
    const filterCarrera = document.getElementById('filterCarreraSemestre');
    if (filterCarrera) {
        filterCarrera.addEventListener('change', function() {
            cargarSemestres(this.value);
        });
    }
    
    // Mostrar información de generación
    mostrarInfoGeneracion();
});

// Cargar datos iniciales
function cargarDatosIniciales() {
    cargarCarrerasSelect();
    cargarSemestres();
}
