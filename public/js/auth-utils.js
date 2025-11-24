/**
 * Utilidades de Autenticación
 * Funciones comunes para manejo de autenticación en el portal de prefectos
 */

// ========== FUNCIONES DE AUTENTICACIÓN ==========

/**
 * Verificar autenticación del usuario
 */
function checkAuthentication(requiredRoles = ['prefecto', 'admin']) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.usuario || !requiredRoles.includes(user.tipoUsuario)) {
        console.log('❌ Usuario no autorizado para acceder a esta sección');
        window.location.href = '/';
        return false;
    }
    
    console.log('✅ Usuario autenticado:', user.nombre);
    return true;
}

/**
 * Obtener datos del usuario actual
 */
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || '{}');
}

/**
 * Obtener headers de autenticación para peticiones AJAX
 */
function getAuthHeaders() {
    const user = getCurrentUser();
    return {
        'Content-Type': 'application/json',
        'X-User-Data': encodeURIComponent(JSON.stringify(user))
    };
}

/**
 * Realizar petición fetch con autenticación automática
 */
async function authenticatedFetch(url, options = {}) {
    const defaultOptions = {
        headers: getAuthHeaders(),
        ...options
    };
    
    // Combinar headers si se proporcionan opciones adicionales
    if (options.headers) {
        defaultOptions.headers = {
            ...getAuthHeaders(),
            ...options.headers
        };
    }
    
    try {
        const response = await fetch(url, defaultOptions);
        
        // Verificar si la respuesta indica problemas de autenticación
        if (response.status === 401) {
            console.log('🔐 Sesión expirada, redirigiendo al login...');
            localStorage.removeItem('user');
            window.location.href = '/';
            throw new Error('Sesión expirada');
        }
        
        if (response.status === 403) {
            console.log('🚫 Acceso denegado');
            throw new Error('Acceso denegado');
        }
        
        return response;
    } catch (error) {
        console.error('❌ Error en petición autenticada:', error);
        throw error;
    }
}

/**
 * Cerrar sesión
 */
function logout() {
    localStorage.removeItem('user');
    window.location.href = '/';
}

/**
 * Inicializar autenticación para una página
 */
function initializeAuth(requiredRoles = ['prefecto', 'admin']) {
    // Verificar autenticación
    if (!checkAuthentication(requiredRoles)) {
        return false;
    }
    
    // Actualizar nombre de usuario en el header si existe
    const user = getCurrentUser();
    const userNameElement = document.querySelector('.prefecto-user-name');
    if (userNameElement && user.nombre) {
        userNameElement.textContent = user.nombre;
    }
    
    // Configurar enlaces de logout
    const logoutLinks = document.querySelectorAll('.logout-btn');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });
    
    return true;
}

// ========== FUNCIONES DE UTILIDAD ==========

/**
 * Mostrar/ocultar loading overlay
 */
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
            overlay.classList.add('hidden');
        }
    }
}

/**
 * Mostrar mensaje de éxito
 */
function showSuccess(message) {
    console.log('✅ Success:', message);
    // Implementar notificación toast en el futuro
    alert(`Éxito: ${message}`);
}

/**
 * Mostrar mensaje de error
 */
function showError(message) {
    console.error('❌ Error:', message);
    // Implementar notificación toast en el futuro
    alert(`Error: ${message}`);
}

/**
 * Actualizar elemento DOM de forma segura
 */
function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        element.classList.remove('loading-text');
    } else {
        console.warn(`⚠️ Elemento ${elementId} no encontrado`);
    }
}

/**
 * Descargar archivo CSV
 */
function downloadCSV(data, filename) {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Convertir array de objetos a CSV
 */
function convertToCSV(objArray) {
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    let str = '';
    
    // Header row
    const headers = Object.keys(array[0]);
    str += headers.join(',') + '\r\n';
    
    // Data rows
    for (let i = 0; i < array.length; i++) {
        let line = '';
        for (let index in headers) {
            if (line !== '') line += ',';
            line += '"' + (array[i][headers[index]] || '') + '"';
        }
        str += line + '\r\n';
    }
    
    return str;
}

/**
 * Función debounce para optimizar eventos
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== MANEJO DE ERRORES GLOBALES ==========

// Manejar errores globales
window.addEventListener('error', function(event) {
    console.error('❌ Error global:', event.error);
});

// Manejar errores de promesas no capturadas
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Promesa rechazada no manejada:', event.reason);
    event.preventDefault();
});

console.log('🔧 Utilidades de autenticación cargadas');
