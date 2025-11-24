document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay una sesión activa en el servidor
    checkSession();
    
    // Configurar el formulario de login
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const usuario = document.getElementById('usuario').value;
        const contrasena = document.getElementById('contrasena').value;
        
        if (!usuario || !contrasena) {
            showAlert('Usuario y contraseña son obligatorios', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Importante para las cookies de sesión
                body: JSON.stringify({ usuario, contrasena }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert('Inicio de sesión exitoso', 'success');
                
                // La sesión se guarda automáticamente en el servidor
                // Guardar también en localStorage para compatibilidad con código existente
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redireccionar según el tipo de usuario
                setTimeout(() => {
                    if (data.user.tipoUsuario === 'admin') {
                        window.location.href = '/admin';
                    } else if (data.user.tipoUsuario === 'prefecto') {
                        window.location.href = '/prefecto';
                    } else {
                        window.location.href = '/maestro';
                    }
                }, 1000);
            } else {
                showAlert(data.message || 'Credenciales incorrectas', 'error');
            }
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            showAlert('Error en el servidor. Intente nuevamente.', 'error');
        }
    });
});

// Verificar sesión activa en el servidor
async function checkSession() {
    // No verificar si acabamos de cerrar sesión
    if (sessionStorage.getItem('loggingOut') === 'true') {
        sessionStorage.removeItem('loggingOut');
        console.log('Logout completado, no verificar sesión');
        return;
    }
    
    try {
        const response = await fetch('/api/session', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success && data.user) {
            // Hay una sesión activa, redirigir
            if (data.user.tipoUsuario === 'admin') {
                window.location.href = '/admin';
            } else if (data.user.tipoUsuario === 'maestro') {
                window.location.href = '/maestro';
            } else if (data.user.tipoUsuario === 'prefecto') {
                window.location.href = '/prefecto';
            }
        }
    } catch (error) {
        console.log('No hay sesión activa');
    }
}

function showAlert(message, type) {
    const alertDiv = document.getElementById('loginAlert');
    alertDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    
    setTimeout(() => {
        alertDiv.innerHTML = '';
    }, 3000);
}

// Función global para cerrar sesión
function logout() {
    cerrarSesion();
}

async function cerrarSesion() {
    try {
        // Marcar que estamos cerrando sesión
        sessionStorage.setItem('loggingOut', 'true');
        
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
        // Aún así redirigir
        window.location.href = '/';
    }
}

