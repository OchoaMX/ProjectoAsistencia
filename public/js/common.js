// ===== FUNCIONES COMUNES DEL SISTEMA =====

// Función para obtener la fecha actual en zona horaria local (formato YYYY-MM-DD)
// Evita el problema de toISOString() que devuelve fecha en UTC
function obtenerFechaLocal(fecha = null) {
    const fechaObj = fecha ? new Date(fecha) : new Date();
    const año = fechaObj.getFullYear();
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.usuario || user.tipoUsuario !== 'admin') {
        window.location.href = '/';
        return;
    }
    
    document.getElementById('userName').textContent = 'Usuario: ' + (user.nombre || user.usuario || 'Administrador');
    
    // Actualizar información del footer
    const footerUserName = document.getElementById('footerUserName');
    const lastUpdate = document.getElementById('lastUpdate');
    
    if (footerUserName) {
        footerUserName.textContent = user.nombre || user.usuario || 'Administrador';
    }
    
    if (lastUpdate) {
        lastUpdate.textContent = new Date().toLocaleString('es-ES');
    }
    
    // Cargar datos iniciales según la página
    if (typeof cargarDatosIniciales === 'function') {
        cargarDatosIniciales();
    }
});

// Función para mostrar alertas
function showAlert(message, type) {
    const alertsDiv = document.getElementById('alerts');
    if (alertsDiv) {
        alertsDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        
        setTimeout(() => {
            alertsDiv.innerHTML = '';
        }, 3000);
    }
}

// Función para cerrar sesión
async function logout() {
    try {
        // Marcar que estamos cerrando sesión
        sessionStorage.setItem('loggingOut', 'true');
        
        // Cerrar sesión en el servidor
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        // Limpiar localStorage
        localStorage.removeItem('user');
        
        // Redirigir al login
        window.location.href = '/';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        // Aún así limpiar y redirigir
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// ===== FUNCIONES DE EDICIÓN Y ELIMINACIÓN =====

// Modal
function mostrarModal(titulo) {
    const modalTitulo = document.getElementById('modalTitulo');
    const modalEdicion = document.getElementById('modalEdicion');
    
    if (modalTitulo && modalEdicion) {
        modalTitulo.textContent = titulo;
        modalEdicion.style.display = 'block';
    }
}

function cerrarModal() {
    const modalEdicion = document.getElementById('modalEdicion');
    if (modalEdicion) {
        modalEdicion.style.display = 'none';
    }
}

// ===== FUNCIONES DEL FOOTER =====

// Función para exportar datos
function exportarDatos() {
    showAlert('Función de exportación en desarrollo', 'info');
}

// Función para generar reporte PDF
function generarReporte() {
    showAlert('Función de reporte PDF en desarrollo', 'info');
}

// Actualizar timestamp cada minuto
setInterval(() => {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleString('es-ES');
    }
}, 60000);
