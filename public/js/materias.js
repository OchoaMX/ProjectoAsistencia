// ===== FUNCIONES ESPECÍFICAS PARA MATERIAS =====

// Función para cargar materias
async function cargarMaterias() {
    try {
        const response = await fetch('/api/materias');
        const materias = await response.json();
        
        const materiasTable = document.getElementById('materiasTable');
        
        if (materias.length === 0) {
            materiasTable.innerHTML = '<p>No hay materias registradas</p>';
            return;
        }
        
        let html = '<table class="data-table">';
        html += '<tr><th>Nombre</th><th>Código</th><th>Acciones</th></tr>';
        
        materias.forEach(materia => {
            html += `<tr>
                <td>${materia.nombreMateria}</td>
                <td>${materia.codigoMateria}</td>
                <td>
                    <button class="btn-editar" onclick="editarMateria(${materia.idMateria}, '${materia.nombreMateria}', '${materia.codigoMateria}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-eliminar" onclick="eliminarMateria(${materia.idMateria}, '${materia.nombreMateria}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>`;
        });
        
        html += '</table>';
        materiasTable.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar materias:', error);
        showAlert('Error al cargar materias', 'error');
    }
}

// Función para editar materia
function editarMateria(id, nombre, codigo) {
    mostrarModal('Editar Materia');
    
    const camposEdicion = document.getElementById('camposEdicion');
    camposEdicion.innerHTML = `
        <div class="form-group">
            <label>Nombre de la Materia:</label>
            <input type="text" name="nombreMateria" value="${nombre}" required>
        </div>
        <div class="form-group">
            <label>Código de Materia:</label>
            <input type="text" name="codigoMateria" value="${codigo}" required>
        </div>
    `;
    
    document.getElementById('editId').value = id;
    
    document.getElementById('formEdicion').onsubmit = async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const materiaData = {
            nombreMateria: formData.get('nombreMateria'),
            codigoMateria: formData.get('codigoMateria')
        };
        
        try {
            const response = await fetch(`/api/materias/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(materiaData),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert(data.message || 'Materia actualizada correctamente', 'success');
                cerrarModal();
                cargarMaterias();
            } else {
                showAlert(data.error || 'Error al actualizar materia', 'error');
            }
        } catch (error) {
            console.error('Error al actualizar materia:', error);
            showAlert('Error en el servidor', 'error');
        }
    };
}

// Función para eliminar materia
function eliminarMateria(id, nombre) {
    if (confirm(`⚠️ ELIMINAR PERMANENTEMENTE la materia ${nombre}?\n\n🚨 ADVERTENCIA: Esta acción es PERMANENTE e IRREVERSIBLE\n🚨 La materia se borrará COMPLETAMENTE de la base de datos\n🚨 NO se podrá recuperar\n\n¿Estás ABSOLUTAMENTE SEGURO?`)) {
        fetch(`/api/materias/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                showAlert('💥 Materia eliminada PERMANENTEMENTE del sistema', 'success');
                cargarMaterias();
            } else {
                showAlert(data.error || 'Error al eliminar materia', 'error');
            }
        })
        .catch(error => {
            console.error('Error al eliminar materia:', error);
            showAlert('Error en el servidor', 'error');
        });
    }
}

// Manejador del formulario de materia
document.addEventListener('DOMContentLoaded', function() {
    const formMateria = document.getElementById('formMateria');
    if (formMateria) {
        formMateria.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const materiaData = {
                nombreMateria: formData.get('nombreMateria'),
                codigoMateria: formData.get('codigoMateria')
            };
            
            try {
                const response = await fetch('/api/materias', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(materiaData),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert(data.message, 'success');
                    this.reset();
                    cargarMaterias();
                } else {
                    showAlert(data.error || 'Error al registrar materia', 'error');
                }
            } catch (error) {
                console.error('Error al registrar materia:', error);
                showAlert('Error en el servidor', 'error');
            }
        });
    }
});

// Cargar datos iniciales
function cargarDatosIniciales() {
    cargarMaterias();
}
