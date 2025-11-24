// ===== FUNCIONES ESPECÍFICAS PARA CARRERAS =====

// Función para cargar carreras
async function cargarCarreras() {
    try {
        const response = await fetch('/api/carreras');
        const carreras = await response.json();
        
        const carrerasTable = document.getElementById('carrerasTable');
        
        if (carreras.length === 0) {
            carrerasTable.innerHTML = '<p>No hay carreras registradas</p>';
            return;
        }
        
        let html = '<table class="data-table">';
        html += '<tr><th>Nombre</th><th>Código</th><th>Acciones</th></tr>';
        
        carreras.forEach(carrera => {
            html += `<tr>
                <td>${carrera.nombre_carrera}</td>
                <td>${carrera.codigo_carrera}</td>
                <td>
                    <button class="btn-editar" onclick="editarCarrera(${carrera.id_carrera}, '${carrera.nombre_carrera}', '${carrera.codigo_carrera}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-eliminar" onclick="eliminarCarrera(${carrera.id_carrera}, '${carrera.nombre_carrera}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>`;
        });
        
        html += '</table>';
        carrerasTable.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar carreras:', error);
        showAlert('Error al cargar carreras', 'error');
    }
}

// Función para editar carrera
function editarCarrera(id, nombre, codigo) {
    mostrarModal('Editar Carrera');
    
    const camposEdicion = document.getElementById('camposEdicion');
    camposEdicion.innerHTML = `
        <div class="form-group">
            <label>Nombre de la Carrera:</label>
            <input type="text" name="nombre_carrera" value="${nombre}" required>
        </div>
        <div class="form-group">
            <label>Código de Carrera:</label>
            <input type="text" name="codigo_carrera" value="${codigo}" required>
        </div>
    `;
    
    document.getElementById('editId').value = id;
    
    document.getElementById('formEdicion').onsubmit = async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const carreraData = {
            nombre_carrera: formData.get('nombre_carrera'),
            codigo_carrera: formData.get('codigo_carrera')
        };
        
        try {
            const response = await fetch(`/api/carreras/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(carreraData),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert(data.message || 'Carrera actualizada correctamente', 'success');
                cerrarModal();
                cargarCarreras();
            } else {
                showAlert(data.error || 'Error al actualizar carrera', 'error');
            }
        } catch (error) {
            console.error('Error al actualizar carrera:', error);
            showAlert('Error en el servidor', 'error');
        }
    };
}

// Función para eliminar carrera
function eliminarCarrera(id, nombre) {
    if (confirm(`⚠️ ELIMINAR PERMANENTEMENTE la carrera ${nombre}?\n\n🚨 ADVERTENCIA: Esta acción es PERMANENTE e IRREVERSIBLE\n🚨 La carrera se borrará COMPLETAMENTE de la base de datos\n🚨 NO se podrá recuperar\n\n¿Estás ABSOLUTAMENTE SEGURO?`)) {
        fetch(`/api/carreras/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                showAlert('💥 Carrera eliminada PERMANENTEMENTE del sistema', 'success');
                cargarCarreras();
            } else {
                showAlert(data.error || 'Error al eliminar carrera', 'error');
            }
        })
        .catch(error => {
            console.error('Error al eliminar carrera:', error);
            showAlert('Error en el servidor', 'error');
        });
    }
}

// Manejador del formulario de carrera
document.addEventListener('DOMContentLoaded', function() {
    const formCarrera = document.getElementById('formCarrera');
    if (formCarrera) {
        formCarrera.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const carreraData = {
                nombre_carrera: formData.get('nombreCarrera'),
                codigo_carrera: formData.get('codigoCarrera')
            };
            
            try {
                const response = await fetch('/api/carreras', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(carreraData),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert(data.message, 'success');
                    this.reset();
                    cargarCarreras();
                } else {
                    showAlert(data.error || 'Error al registrar carrera', 'error');
                }
            } catch (error) {
                console.error('Error al registrar carrera:', error);
                showAlert('Error en el servidor', 'error');
            }
        });
    }
});

// Cargar datos iniciales
function cargarDatosIniciales() {
    cargarCarreras();
}
