// ===== FUNCIONES ESPECÍFICAS PARA USUARIOS =====

// Función para mostrar/ocultar el campo nombre real según el tipo de usuario
function toggleNombreReal() {
    const tipoUsuario = document.getElementById('tipoUsuario').value;
    const grupoNombreReal = document.getElementById('grupo_nombre_real');
    const nombreReal = document.getElementById('nombreReal');
    const label = grupoNombreReal.querySelector('label');
    
    if (tipoUsuario) {
        grupoNombreReal.style.display = 'block';
        
        // Ajustar label y placeholder según el tipo de usuario
        if (tipoUsuario === 'admin') {
            label.innerHTML = 'Nombre Completo: <span style="color: #888; font-weight: normal;">(Opcional)</span>';
            nombreReal.placeholder = 'Ej: Juan Pérez García (Opcional - por defecto: Administrador del Sistema)';
            nombreReal.required = false;
        } else if (tipoUsuario === 'maestro') {
            label.innerHTML = 'Nombre Completo: <span style="color: red;">*</span>';
            nombreReal.placeholder = 'Ej: Juan Pérez García';
            nombreReal.required = true;
        } else if (tipoUsuario === 'prefecto') {
            label.innerHTML = 'Nombre Completo: <span style="color: red;">*</span>';
            nombreReal.placeholder = 'Ej: Juan Pérez García';
            nombreReal.required = true;
        }
    } else {
        grupoNombreReal.style.display = 'none';
        nombreReal.required = false;
        nombreReal.value = '';
    }
}

// Función para cargar todos los usuarios del sistema (admin, maestros, prefectos)
async function cargarUsuariosUnificados() {
    try {
        // Obtener usuarios regulares
        const responseUsuarios = await fetch('/api/usuarios');
        const usuarios = await responseUsuarios.json();
        
        // Obtener maestros (que incluyen información del usuario)
        const responseMaestros = await fetch('/api/maestros');
        const maestros = await responseMaestros.json();
        
        // Debug: mostrar datos recibidos
        console.log('Usuarios regulares:', usuarios);
        console.log('Maestros:', maestros);
        
        const table = document.getElementById('usuariosUnificadosTable');
        
        // Combinar datos: usuarios que no son maestros + maestros con información completa
        const usuariosCompletos = [];
        const nombresUsuariosUsados = new Set();
        
        // Primero agregar maestros (tienen prioridad)
        maestros.forEach(maestro => {
            // Verificar que no sea un maestro con nombre de usuario 'admin' si ya existe un admin
            const esAdminMaestro = maestro.nombre_usuario === 'admin';
            const yaExisteAdmin = usuarios.some(u => u.nombre_usuario === 'admin' && u.tipo_usuario === 'admin');
            
            if (!esAdminMaestro || !yaExisteAdmin) {
                usuariosCompletos.push({
                    id: maestro.id_maestro,
                    tipo: 'maestro',
                    nombre_completo: maestro.nombre_completo,
                    nombre_usuario: maestro.nombre_usuario,
                    tipo_usuario: maestro.tipo_usuario || 'maestro',
                    fuente: 'maestros'
                });
                nombresUsuariosUsados.add(maestro.nombre_usuario);
            }
        });
        
        // Luego agregar usuarios regulares que no sean maestros y no tengan nombre de usuario duplicado
        usuarios.forEach(usuario => {
            if (usuario.tipo_usuario !== 'maestro' && !nombresUsuariosUsados.has(usuario.nombre_usuario)) {
                // Para usuarios sin nombre completo, mostrar un nombre descriptivo según el tipo
                // El campo viene como 'nombreCompleto' desde la BD (alias en la consulta SQL)
                let nombreCompleto = usuario.nombreCompleto;
                
                // Si el nombre está vacío, es null, undefined o es el valor por defecto anterior
                if (!nombreCompleto || 
                    nombreCompleto === '-' || 
                    nombreCompleto === 'Usuario del Sistema' || 
                    (typeof nombreCompleto === 'string' && nombreCompleto.trim() === '')) {
                    if (usuario.tipo_usuario === 'admin') {
                        nombreCompleto = 'Administrador del Sistema';
                    } else if (usuario.tipo_usuario === 'prefecto') {
                        nombreCompleto = 'Prefecto de Disciplina';
                    } else {
                        nombreCompleto = 'Usuario del Sistema';
                    }
                }
                
                usuariosCompletos.push({
                    id: usuario.id,
                    tipo: 'usuario',
                    nombre_completo: nombreCompleto,
                    nombre_usuario: usuario.nombre_usuario,
                    tipo_usuario: usuario.tipo_usuario,
                    fuente: 'usuarios'
                });
                nombresUsuariosUsados.add(usuario.nombre_usuario);
            }
        });
        
        if (usuariosCompletos.length === 0) {
            table.innerHTML = '<p>No hay usuarios registrados en el sistema</p>';
            return;
        }
        
        // Ordenar usuarios: admin primero, luego maestros, luego otros usuarios
        usuariosCompletos.sort((a, b) => {
            if (a.tipo_usuario === 'admin') return -1;
            if (b.tipo_usuario === 'admin') return 1;
            if (a.tipo_usuario === 'maestro' && b.tipo_usuario !== 'maestro') return -1;
            if (b.tipo_usuario === 'maestro' && a.tipo_usuario !== 'maestro') return 1;
            return a.nombre_usuario.localeCompare(b.nombre_usuario);
        });
        
        // Debug: mostrar usuarios finales
        console.log('Usuarios finales a mostrar:', usuariosCompletos);
        
        let html = '<table class="data-table">';
        html += '<tr><th>Tipo</th><th>Nombre Completo</th><th>Usuario</th><th>Rol</th><th>Acciones</th></tr>';
        
        usuariosCompletos.forEach(usuario => {
            const iconoTipo = usuario.tipo_usuario === 'admin' ? '👑' : 
                             usuario.tipo_usuario === 'maestro' ? '🎓' : '👮';
            
            html += `<tr>
                <td>${iconoTipo}</td>
                <td>${usuario.nombre_completo}</td>
                <td>${usuario.nombre_usuario}</td>
                <td><span class="badge badge-${usuario.tipo_usuario}">${usuario.tipo_usuario}</span></td>
                <td>
                    <button onclick="editarUsuarioUnificado('${usuario.fuente}', ${usuario.id}, '${usuario.nombre_completo}', '${usuario.nombre_usuario}', '${usuario.tipo_usuario}')" class="btn-editar">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="eliminarUsuarioUnificado('${usuario.fuente}', ${usuario.id}, '${usuario.nombre_completo || usuario.nombre_usuario}')" class="btn-eliminar">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>`;
        });
        
        html += '</table>';
        table.innerHTML = html;
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        showAlert('Error al cargar usuarios del sistema', 'error');
    }
}

// Función para editar usuario unificado usando modal
function editarUsuarioUnificado(fuente, id, nombreCompleto, nombreUsuario, tipoUsuario) {
    const camposEdicion = document.getElementById('camposEdicion');
    
    // Crear campos según el tipo de usuario
    let camposHTML = `
        <div class="form-group">
            <label>Tipo de Usuario:</label>
            <select name="tipoUsuario" id="editTipoUsuario" required onchange="toggleNombreRealModal()">
                <option value="admin">Administrador</option>
                <option value="maestro">Maestro</option>
                <option value="prefecto">Prefecto</option>
            </select>
        </div>
        <div class="form-group" id="grupo_nombre_real_modal" style="display:none;">
            <label>Nombre Completo:</label>
            <input type="text" name="nombreReal" id="editNombreReal" placeholder="Ej: Juan Pérez García">
        </div>
        <div class="form-group">
            <label>Usuario de Acceso:</label>
            <input type="text" name="nombreUsuario" id="editNombreUsuario" required placeholder="Ej: jperez">
        </div>
        <div class="form-group">
            <label>Nueva Contraseña:</label>
            <input type="password" name="contrasena" id="editContrasena" placeholder="Dejar vacío para mantener la actual">
            <small style="color: #666; display: block; margin-top: 5px;">
                Solo completa este campo si deseas cambiar la contraseña
            </small>
        </div>
    `;
    
    camposEdicion.innerHTML = camposHTML;
    
    // Guardar datos en el campo oculto
    document.getElementById('editId').value = JSON.stringify({ fuente, id });
    
    // Llenar los valores
    document.getElementById('editTipoUsuario').value = tipoUsuario;
    document.getElementById('editNombreUsuario').value = nombreUsuario;
    
    // Mostrar y llenar el campo de nombre completo para todos los tipos
    toggleNombreRealModal();
    
    const inputNombreReal = document.getElementById('editNombreReal');
    // Cargar siempre el nombre completo actual (incluso si es el valor por defecto)
    if (nombreCompleto && nombreCompleto !== '-') {
        inputNombreReal.value = nombreCompleto;
    } else {
        inputNombreReal.value = '';
    }
    
    mostrarModal('Editar Usuario');
}

// Función para toggle del nombre real en el modal
function toggleNombreRealModal() {
    const tipoUsuario = document.getElementById('editTipoUsuario').value;
    const grupoNombreReal = document.getElementById('grupo_nombre_real_modal');
    const nombreReal = document.getElementById('editNombreReal');
    const label = grupoNombreReal.querySelector('label');
    
    if (tipoUsuario) {
        grupoNombreReal.style.display = 'block';
        
        // Ajustar label y placeholder según el tipo de usuario
        if (tipoUsuario === 'admin') {
            label.innerHTML = 'Nombre Completo: <span style="color: #888; font-weight: normal;">(Opcional)</span>';
            nombreReal.placeholder = 'Ej: Juan Pérez García (Opcional - por defecto: Administrador del Sistema)';
            nombreReal.required = false;
        } else if (tipoUsuario === 'maestro') {
            label.innerHTML = 'Nombre Completo: <span style="color: red;">*</span>';
            nombreReal.placeholder = 'Ej: Juan Pérez García';
            nombreReal.required = true;
        } else if (tipoUsuario === 'prefecto') {
            label.innerHTML = 'Nombre Completo: <span style="color: red;">*</span>';
            nombreReal.placeholder = 'Ej: Juan Pérez García';
            nombreReal.required = true;
        }
    } else {
        grupoNombreReal.style.display = 'none';
        nombreReal.required = false;
        nombreReal.value = '';
    }
}

// Función para eliminar usuario unificado
function eliminarUsuarioUnificado(fuente, id, nombre) {
    const tipoEntidad = fuente === 'maestros' ? 'maestro' : 'usuario';
    const endpoint = fuente === 'maestros' ? `/api/maestros/${id}` : `/api/usuarios/${id}`;
    
    if (confirm(`¿Está seguro que desea eliminar al ${tipoEntidad} ${nombre}? Esta acción no se puede deshacer.`)) {
        fetch(endpoint, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success || data.message) {
                showAlert(`${tipoEntidad.charAt(0).toUpperCase() + tipoEntidad.slice(1)} eliminado correctamente`, 'success');
                cargarUsuariosUnificados();
            } else {
                showAlert(data.error || `Error al eliminar ${tipoEntidad}`, 'error');
            }
        })
        .catch(error => {
            console.error(`Error al eliminar ${tipoEntidad}:`, error);
            showAlert(`Error al eliminar ${tipoEntidad}`, 'error');
        });
    }
}

// Manejador del formulario unificado (solo para creación)
document.addEventListener('DOMContentLoaded', function() {
    const formUsuarioUnificado = document.getElementById('formUsuarioUnificado');
    if (formUsuarioUnificado) {
        formUsuarioUnificado.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const tipoUsuario = formData.get('tipoUsuario');
            const nombreUsuario = formData.get('nombreUsuario');
            const contrasena = formData.get('contrasena');
            const nombreReal = formData.get('nombreReal');
            
            try {
                let endpoint, datos;
                
                // Solo creación (el formulario principal ya no se usa para editar)
                if (tipoUsuario === 'maestro') {
                    endpoint = '/api/maestros';
                    datos = {
                        nombre_completo: nombreReal,
                        nombre_usuario: nombreUsuario,
                        contrasena: contrasena,
                        tipo_usuario: tipoUsuario
                    };
                } else {
                    // Para admin y prefecto
                    endpoint = '/api/usuarios';
                    datos = {
                        nombreUsuario: nombreUsuario,  // camelCase
                        contrasena: contrasena,
                        tipoUsuario: tipoUsuario,  // camelCase
                        nombreCompleto: nombreReal || null  // Agregar nombre completo para prefectos
                    };
                }
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(datos),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert(data.message || 'Usuario registrado correctamente', 'success');
                    this.reset();
                    document.getElementById('grupo_nombre_real').style.display = 'none';
                    cargarUsuariosUnificados();
                } else {
                    showAlert(data.error || 'Error en la operación', 'error');
                }
            } catch (error) {
                console.error('Error en la operación:', error);
                showAlert('Error de conexión con el servidor', 'error');
            }
        });
    }
    
    // Manejador del formulario de edición (modal)
    const formEdicion = document.getElementById('formEdicion');
    if (formEdicion) {
        formEdicion.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const editData = JSON.parse(document.getElementById('editId').value);
            const tipoUsuario = formData.get('tipoUsuario');
            const nombreUsuario = formData.get('nombreUsuario');
            const contrasena = formData.get('contrasena');
            const nombreReal = formData.get('nombreReal');
            
            try {
                let endpoint, datos;
                
                if (editData.fuente === 'maestros') {
                    endpoint = `/api/maestros/${editData.id}`;
                    datos = {
                        nombre_completo: nombreReal,
                        nombre_usuario: nombreUsuario,
                        tipo_usuario: tipoUsuario
                    };
                    // Solo agregar contraseña si se proporcionó
                    if (contrasena) {
                        datos.contrasena = contrasena;
                    }
                } else {
                    // Para admin y prefecto
                    endpoint = `/api/usuarios/${editData.id}`;
                    datos = {
                        nombreUsuario: nombreUsuario,  // camelCase
                        tipoUsuario: tipoUsuario,  // camelCase
                        nombreCompleto: nombreReal || ''  // Enviar string vacío si no hay valor
                    };
                    // Solo agregar contraseña si se proporcionó
                    if (contrasena && contrasena.trim() !== '') {
                        datos.contrasena = contrasena;
                    }
                }
                
                const response = await fetch(endpoint, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(datos),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert(data.message || 'Usuario actualizado correctamente', 'success');
                    cerrarModal();
                    cargarUsuariosUnificados();
                } else {
                    showAlert(data.error || 'Error al actualizar usuario', 'error');
                }
            } catch (error) {
                console.error('Error al actualizar usuario:', error);
                showAlert('Error de conexión con el servidor', 'error');
            }
        });
    }
});

// Cargar datos iniciales
function cargarDatosIniciales() {
    cargarUsuariosUnificados();
}
