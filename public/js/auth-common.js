/**
 * auth-common.js
 * Funciones comunes de autenticación para el portal
 */

// Función global para cerrar sesión
async function cerrarSesion() {
    try {
        // Marcar que estamos cerrando sesión
        sessionStorage.setItem('loggingOut', 'true');
        
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Limpiar localStorage
            localStorage.removeItem('user');
            
            // Redirigir al login
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        // Aún así redirigir al login
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// Verificar sesión periódicamente
setInterval(async () => {
    try {
        const response = await fetch('/api/session', {
            credentials: 'include'
        });
        
        if (!response.ok || response.status === 401) {
            console.log('Sesión expirada, redirigiendo...');
            window.location.href = '/?error=session_expired';
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
    }
}, 5 * 60 * 1000); // Verificar cada 5 minutos

// Exportar funciones globales
window.cerrarSesion = cerrarSesion;

