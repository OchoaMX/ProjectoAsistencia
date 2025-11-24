// Middleware y utilidades para reducir redundancias

// Validador genérico de campos requeridos
export const validateRequiredFields = (fields) => {
    return (req, res, next) => {
        const missing = fields.filter(field => !req.body[field]);
        
        if (missing.length > 0) {
            return res.status(400).json({
                error: `Los siguientes campos son requeridos: ${missing.join(', ')}`,
                success: false
            });
        }
        next();
    };
};

// Validador de ID numérico
export const validateNumericId = (req, res, next) => {
    const id = req.params.id;
    if (!id || isNaN(id)) {
        return res.status(400).json({
            error: "ID inválido",
            success: false
        });
    }
    next();
};

// Manejo genérico de errores de base de datos
export const handleDbError = (res, error, operation = 'operación') => {
    console.error(`Error en ${operation}:`, error);
    
    const errorResponses = {
        'ER_DUP_ENTRY': { status: 400, message: 'Ya existe un registro con esos datos' },
        'ER_ROW_IS_REFERENCED_2': { status: 400, message: 'No se puede eliminar porque tiene registros relacionados' },
        'ER_NO_REFERENCED_ROW_2': { status: 400, message: 'El registro referenciado no existe' }
    };
    
    const errorResponse = errorResponses[error.code];
    
    if (errorResponse) {
        return res.status(errorResponse.status).json({
            error: errorResponse.message,
            success: false
        });
    }
    
    return res.status(500).json({
        error: `Error interno del servidor en ${operation}`,
        success: false
    });
};

// Wrapper para operaciones async que maneja errores automáticamente
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(error => {
            handleDbError(res, error, 'la operación solicitada');
        });
    };
};

// Respuestas estándar
export const sendSuccess = (res, data, message = 'Operación exitosa', status = 200) => {
    res.status(status).json({
        success: true,
        message,
        data
    });
};

export const sendError = (res, message, status = 400, additionalData = {}) => {
    res.status(status).json({
        error: message,
        success: false,
        ...additionalData
    });
};

// Validador para verificación de existencia genérico
export const validateExists = (checkFunction, entityName) => {
    return async (req, res, next) => {
        try {
            const exists = await checkFunction(req.params.id);
            if (!exists) {
                return sendError(res, `${entityName} no encontrado(a)`, 404);
            }
            next();
        } catch (error) {
            handleDbError(res, error, `verificar ${entityName}`);
        }
    };
};

// Generador de rutas CRUD estándar
export const createCRUDRoutes = (router, basePath, db, config = {}) => {
    const {
        entityName = basePath.slice(1), // remueve el '/' inicial
        entityNamePlural = entityName + 's', // plural por defecto
        requiredFields = [],
        hasRelations = false,
        relationCheck = null
    } = config;

    // Capitalizar nombres para métodos
    const capitalizedSingular = entityName.charAt(0).toUpperCase() + entityName.slice(1);
    const capitalizedPlural = entityNamePlural.charAt(0).toUpperCase() + entityNamePlural.slice(1);

    // GET todos
    router.get(basePath, asyncHandler(async (req, res) => {
        const items = await db[`obtener${capitalizedPlural}`]();
        res.json(items); // Enviar directamente el array para compatibilidad con frontend
    }));

    // GET por ID  
    router.get(`${basePath}/:id`, validateNumericId, asyncHandler(async (req, res) => {
        const item = await db[`obtener${capitalizedSingular}PorId`](req.params.id);
        if (!item) return sendError(res, `${entityName} no encontrado`, 404);
        res.json(item); // Enviar directamente el objeto para compatibilidad con frontend
    }));

    // POST crear
    if (requiredFields.length > 0) {
        router.post(basePath,
            validateRequiredFields(requiredFields),
            asyncHandler(async (req, res) => {
                const id = await db[`insertar${capitalizedSingular}`](req.body);
                sendSuccess(res, { id }, `${entityName} registrado correctamente`, 201);
            })
        );
    }

    // PUT actualizar
    if (requiredFields.length > 0) {
        router.put(`${basePath}/:id`,
            validateNumericId,
            validateRequiredFields(requiredFields),
            asyncHandler(async (req, res) => {
                const resultado = await db[`actualizar${capitalizedSingular}`](req.params.id, req.body);
                if (resultado.affectedRows === 0) return sendError(res, `${entityName} no encontrado`, 404);
                sendSuccess(res, null, `${entityName} actualizado correctamente`);
            })
        );
    }

    // DELETE eliminar
    router.delete(`${basePath}/:id`,
        validateNumericId,
        asyncHandler(async (req, res) => {
            if (hasRelations && relationCheck) {
                const item = await db[`obtener${capitalizedSingular}PorId`](req.params.id);
                if (!item) return sendError(res, `${entityName} no encontrado`, 404);
                
                const tieneRelaciones = await relationCheck(req.params.id);
                if (tieneRelaciones) {
                    return sendError(res, `No se puede eliminar porque tiene registros relacionados`, 400);
                }
            }

            const resultado = await db[`eliminar${capitalizedSingular}`](req.params.id);
            if (resultado.affectedRows === 0) return sendError(res, `${entityName} no encontrado`, 404);
            sendSuccess(res, null, `${entityName} eliminado correctamente`);
        })
    );
};

// ========== MIDDLEWARE DE AUTENTICACIÓN ==========

// Middleware de autenticación basado en sesiones
export function requireAuth(allowedRoles = []) {
    return (req, res, next) => {
        // Verificar si hay sesión activa
        if (!req.session || !req.session.user) {
            // Si es una petición API, devolver JSON
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({ 
                    error: 'No autorizado',
                    requireLogin: true 
                });
            }
            // Si es una vista, redirigir al login
            return res.redirect('/?redirect=' + encodeURIComponent(req.originalUrl));
        }
        
        const user = req.session.user;
        
        // Verificar roles si se especificaron
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.tipoUsuario)) {
            // Si es una petición API, devolver JSON
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({ error: 'Acceso denegado' });
            }
            // Si es una vista, redirigir al login
            return res.redirect('/?error=access_denied');
        }
        
        // Adjuntar usuario a la petición
        req.user = user;
        next();
    };
}

// Middleware para verificar si el usuario está logueado (sin restricción de rol)
export function requireLogin(req, res, next) {
    return requireAuth()(req, res, next);
}

// Middleware específico para prefectos y administradores
export function requirePrefecto(req, res, next) {
    return requireAuth(['prefecto', 'admin'])(req, res, next);
}

// Middleware específico para administradores
export function requireAdmin(req, res, next) {
    return requireAuth(['admin'])(req, res, next);
}

// Middleware específico para maestros
export function requireMaestro(req, res, next) {
    return requireAuth(['maestro'])(req, res, next);
}