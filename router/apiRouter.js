import express from "express";
import asistenciaDB from "../modules/model.js";
import {
    validateRequiredFields,
    validateNumericId,
    asyncHandler,
    sendSuccess,
    sendError,
    requirePrefecto
} from "../utils/middleware.js";

const router = express.Router();

// ========== RUTAS PARA AUTENTICACIÓN ==========
router.post("/login", async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;
        
        // Primero intentar como maestro
        const maestro = await asistenciaDB.verificarLoginMaestro(usuario, contrasena);
        
        if (maestro) {
            const userData = {
                id: maestro.id_maestro,
                nombre: maestro.nombre_completo,
                usuario: maestro.nombre_usuario,
                tipoUsuario: maestro.tipo_usuario
            };
            
            // Guardar en sesión de manera explícita
            req.session.user = userData;
            
            // Esperar a que se guarde la sesión antes de responder
            return req.session.save((err) => {
                if (err) {
                    console.error('Error guardando sesión:', err);
                    return res.status(500).json({ error: "Error guardando sesión" });
                }
                
                res.json({ 
                    success: true, 
                    user: userData
                });
            });
        }
        
        // Si no es maestro, intentar como usuario regular (admin/prefecto)
        const usuarioRegular = await asistenciaDB.verificarLoginUsuario(usuario, contrasena);
        
        if (usuarioRegular) {
            const userData = {
                id: usuarioRegular.id,
                nombre: usuarioRegular.nombre_completo || usuarioRegular.nombre_usuario,
                usuario: usuarioRegular.nombre_usuario,
                tipoUsuario: usuarioRegular.tipo_usuario
            };
            
            // Guardar en sesión de manera explícita
            req.session.user = userData;
            
            // Esperar a que se guarde la sesión antes de responder
            return req.session.save((err) => {
                if (err) {
                    console.error('Error guardando sesión:', err);
                    return res.status(500).json({ error: "Error guardando sesión" });
                }
                
                res.json({ 
                    success: true, 
                    user: userData
                });
            });
        }
        
        // Si no se encuentra en ninguna tabla
        return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Ruta para cerrar sesión
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error al cerrar sesión" });
        }
        res.json({ success: true, message: "Sesión cerrada correctamente" });
    });
});

// Ruta para verificar sesión activa
router.get("/session", (req, res) => {
    if (req.session && req.session.user) {
        return res.json({ 
            success: true, 
            user: req.session.user 
        });
    }
    res.status(401).json({ 
        success: false, 
        message: "No hay sesión activa" 
    });
});

// ========== RUTAS PARA CARRERAS ==========
router.get("/carreras", asyncHandler(async (req, res) => {
    const carreras = await asistenciaDB.obtenerCarreras();
    res.json(carreras);
}));

router.get("/carreras/:id", validateNumericId, asyncHandler(async (req, res) => {
    const carrera = await asistenciaDB.obtenerCarreraPorId(req.params.id);
    if (!carrera) return sendError(res, "Carrera no encontrada", 404);
    res.json(carrera);
}));

router.post("/carreras", 
    validateRequiredFields(['nombre_carrera', 'codigo_carrera']),
    asyncHandler(async (req, res) => {
        const id = await asistenciaDB.insertarCarrera(req.body);
        sendSuccess(res, { id }, "Carrera creada correctamente", 201);
    })
);

router.put("/carreras/:id", 
    validateNumericId,
    validateRequiredFields(['nombre_carrera', 'codigo_carrera']),
    asyncHandler(async (req, res) => {
        const resultado = await asistenciaDB.actualizarCarrera(req.params.id, req.body);
        if (resultado.affectedRows === 0) return sendError(res, "Carrera no encontrada", 404);
        sendSuccess(res, null, "Carrera actualizada correctamente");
    })
);

router.delete("/carreras/:id", 
    validateNumericId,
    asyncHandler(async (req, res) => {
        const tieneRelaciones = await asistenciaDB.verificarRelacionesCarrera(req.params.id);
        if (tieneRelaciones) {
            return sendError(res, "No se puede eliminar porque tiene registros relacionados", 400);
        }
        
        const resultado = await asistenciaDB.eliminarCarrera(req.params.id);
        if (resultado.affectedRows === 0) return sendError(res, "Carrera no encontrada", 404);
        sendSuccess(res, null, "Carrera eliminada correctamente");
    })
);

// ========== RUTAS PARA SEMESTRES ==========
router.get("/semestres", asyncHandler(async (req, res) => {
    if (req.query.id_carrera) {
        const semestres = await asistenciaDB.obtenerSemestresPorCarrera(req.query.id_carrera);
        return res.json(semestres);
    }
    const semestres = await asistenciaDB.obtenerSemestres();
    res.json(semestres);
}));

router.get("/semestres/carrera/:idCarrera", asyncHandler(async (req, res) => {
    const idCarrera = parseInt(req.params.idCarrera);
    if (!idCarrera || isNaN(idCarrera) || idCarrera <= 0) {
        return sendError(res, "ID de carrera inválido", 400);
    }
    const semestres = await asistenciaDB.obtenerSemestresPorCarrera(idCarrera);
    res.json(semestres);
}));

router.get("/semestres/:id", validateNumericId, asyncHandler(async (req, res) => {
    const semestre = await asistenciaDB.obtenerSemestrePorId(req.params.id);
    if (!semestre) return sendError(res, "Semestre no encontrado", 404);
    res.json(semestre);
}));

router.post("/semestres", 
    validateRequiredFields(['id_carrera', 'numero_semestre', 'nombre_semestre']),
    asyncHandler(async (req, res) => {
        // Verificar que no exista duplicado
        const existe = await asistenciaDB.verificarSemestreDuplicado(
            req.body.id_carrera, 
            req.body.numero_semestre
        );
        if (existe) {
            return sendError(res, 'Ya existe este semestre en la carrera seleccionada', 400);
        }
        
        const id = await asistenciaDB.insertarSemestre(req.body);
        sendSuccess(res, { id }, "Semestre creado correctamente", 201);
    })
);

router.post("/semestres/generar", 
    validateRequiredFields(['id_carrera', 'cantidad_semestres']),
    asyncHandler(async (req, res) => {
        const { id_carrera, cantidad_semestres } = req.body;
        
        // Validar que la cantidad sea un número válido
        if (!cantidad_semestres || cantidad_semestres < 1 || cantidad_semestres > 12) {
            return sendError(res, 'La cantidad de semestres debe ser entre 1 y 12', 400);
        }
        
        const resultado = await asistenciaDB.generarSemestresMultiples(id_carrera, cantidad_semestres);
        
        if (resultado.success) {
            sendSuccess(res, resultado, resultado.message, 201);
        } else {
            sendSuccess(res, resultado, resultado.message, 200); // 200 porque no es error, solo que ya existían
        }
    })
);

router.put("/semestres/:id", 
    validateNumericId,
    validateRequiredFields(['id_carrera', 'numero_semestre', 'nombre_semestre']),
    asyncHandler(async (req, res) => {
        // Verificar que no exista duplicado (excluyendo el actual)
        const existe = await asistenciaDB.verificarSemestreDuplicado(
            req.body.id_carrera, 
            req.body.numero_semestre,
            req.params.id
        );
        if (existe) {
            return sendError(res, 'Ya existe este semestre en la carrera seleccionada', 400);
        }
        
        const resultado = await asistenciaDB.actualizarSemestre(req.params.id, req.body);
        if (resultado.affectedRows === 0) return sendError(res, "Semestre no encontrado", 404);
        sendSuccess(res, null, "Semestre actualizado correctamente");
    })
);

router.delete("/semestres/:id", 
    validateNumericId,
    asyncHandler(async (req, res) => {
        const enUso = await asistenciaDB.verificarSemestreEnUso(req.params.id);
        if (enUso) {
            return sendError(res, "No se puede eliminar porque tiene registros relacionados", 400);
        }
        
        const resultado = await asistenciaDB.eliminarSemestre(req.params.id);
        if (resultado.affectedRows === 0) return sendError(res, "Semestre no encontrado", 404);
        sendSuccess(res, null, "Semestre eliminado correctamente");
    })
);

// ========== RUTAS PARA MATERIAS ==========
router.get("/materias", asyncHandler(async (req, res) => {
    if (req.query.id_carrera) {
        const materias = await asistenciaDB.obtenerMateriasPorCarrera(req.query.id_carrera);
        return res.json(materias);
    }
    const materias = await asistenciaDB.obtenerMaterias();
    res.json(materias);
}));

router.get("/materias/:id", validateNumericId, asyncHandler(async (req, res) => {
    const materia = await asistenciaDB.obtenerMateriaPorId(req.params.id);
    if (!materia) return sendError(res, "Materia no encontrada", 404);
    res.json(materia);
}));

router.post("/materias", 
    validateRequiredFields(['id_carrera', 'id_semestre', 'nombre_materia', 'codigo_materia']),
    asyncHandler(async (req, res) => {
        // Crear la materia
        const materiaData = {
            id_carrera: req.body.id_carrera,
            nombre_materia: req.body.nombre_materia,
            codigo_materia: req.body.codigo_materia
        };
        const idMateria = await asistenciaDB.insertarMateria(materiaData);
        
        // Crear automáticamente en PlanEstudios
        const planData = {
            id_carrera: req.body.id_carrera,
            id_semestre: req.body.id_semestre,
            id_materia: idMateria
        };
        await asistenciaDB.insertarPlanEstudios(planData);
        
        sendSuccess(res, { id: idMateria }, "Materia registrada correctamente en el plan de estudios", 201);
    })
);

router.put("/materias/:id", 
    validateNumericId,
    validateRequiredFields(['id_carrera', 'nombre_materia', 'codigo_materia']),
    asyncHandler(async (req, res) => {
        const materiaData = {
            id_carrera: req.body.id_carrera,
            nombre_materia: req.body.nombre_materia,
            codigo_materia: req.body.codigo_materia
        };
        const resultado = await asistenciaDB.actualizarMateria(req.params.id, materiaData);
        if (resultado.affectedRows === 0) return sendError(res, "Materia no encontrada", 404);
        
        // Si cambió el semestre, actualizar PlanEstudios
        if (req.body.id_semestre) {
            await asistenciaDB.actualizarPlanEstudiosPorMateria(
                req.params.id, 
                req.body.id_carrera, 
                req.body.id_semestre
            );
        }
        
        sendSuccess(res, null, "Materia actualizada correctamente");
    })
);

router.delete("/materias/:id", 
    validateNumericId,
    asyncHandler(async (req, res) => {
        const tieneAsignaciones = await asistenciaDB.verificarAsignacionesMateria(req.params.id);
        if (tieneAsignaciones) {
            return sendError(res, "No se puede eliminar la materia porque tiene asignaciones activas (maestros asignados a grupos)", 400);
        }
        
        const resultado = await asistenciaDB.eliminarMateria(req.params.id);
        if (resultado.affectedRows === 0) return sendError(res, "Materia no encontrada", 404);
        sendSuccess(res, null, "Materia eliminada correctamente");
    })
);

// ========== RUTAS PARA PLAN DE ESTUDIOS ==========
// IMPORTANTE: Rutas específicas PRIMERO, genéricas DESPUÉS
router.get("/plan-estudios/carrera/:idCarrera", asyncHandler(async (req, res) => {
    const idCarrera = parseInt(req.params.idCarrera);
    if (!idCarrera || isNaN(idCarrera) || idCarrera <= 0) {
        return sendError(res, "ID de carrera inválido", 400);
    }
    const plan = await asistenciaDB.obtenerPlanEstudiosPorCarrera(idCarrera);
    res.json(plan);
}));

router.get("/plan-estudios/materias/:idCarrera/:idSemestre", asyncHandler(async (req, res) => {
    const idCarrera = parseInt(req.params.idCarrera);
    const idSemestre = parseInt(req.params.idSemestre);
    
    if (!idCarrera || !idSemestre || isNaN(idCarrera) || isNaN(idSemestre) || idCarrera <= 0 || idSemestre <= 0) {
        return sendError(res, "IDs inválidos", 400);
    }
    
    const materias = await asistenciaDB.obtenerMateriasPorSemestre(idCarrera, idSemestre);
    res.json(materias);
}));

router.get("/plan-estudios/:id", validateNumericId, asyncHandler(async (req, res) => {
    const plan = await asistenciaDB.obtenerPlanEstudioPorId(req.params.id);
    if (!plan) return sendError(res, "Plan de estudios no encontrado", 404);
    res.json(plan);
}));

router.get("/plan-estudios", asyncHandler(async (req, res) => {
    if (req.query.id_carrera) {
        const plan = await asistenciaDB.obtenerPlanEstudiosPorCarrera(req.query.id_carrera);
        return res.json(plan);
    }
    const plan = await asistenciaDB.obtenerPlanEstudios();
    res.json(plan);
}));

router.post("/plan-estudios", 
    validateRequiredFields(['id_carrera', 'id_semestre', 'id_materia']),
    asyncHandler(async (req, res) => {
        // Verificar que no exista duplicado
        const existe = await asistenciaDB.verificarPlanEstudiosDuplicado(
            req.body.id_carrera,
            req.body.id_semestre,
            req.body.id_materia
        );
        if (existe) {
            return sendError(res, 'Esta materia ya está asignada a este semestre', 400);
        }
        
        const id = await asistenciaDB.insertarPlanEstudios(req.body);
        sendSuccess(res, { id }, "Materia asignada al plan de estudios correctamente", 201);
    })
);

router.delete("/plan-estudios/:id", 
    validateNumericId,
    asyncHandler(async (req, res) => {
        const resultado = await asistenciaDB.eliminarPlanEstudios(req.params.id);
        if (resultado.affectedRows === 0) return sendError(res, "Registro no encontrado", 404);
        sendSuccess(res, null, "Materia removida del plan de estudios");
    })
);

// ========== RUTAS PARA GRUPOS ==========
router.get("/grupos", asyncHandler(async (req, res) => {
    if (req.query.id_carrera && req.query.id_semestre) {
        const grupos = await asistenciaDB.obtenerGruposPorCarreraYSemestre(
            req.query.id_carrera,
            req.query.id_semestre
        );
        return res.json(grupos);
    }
    if (req.query.id_carrera) {
        const grupos = await asistenciaDB.obtenerGruposPorCarrera(req.query.id_carrera);
        return res.json(grupos);
    }
    const grupos = await asistenciaDB.obtenerGrupos();
    res.json(grupos);
}));

router.get("/grupos/:id", validateNumericId, asyncHandler(async (req, res) => {
    const grupo = await asistenciaDB.obtenerGrupoPorId(req.params.id);
    if (!grupo) return sendError(res, "Grupo no encontrado", 404);
    res.json(grupo);
}));

router.post("/grupos", 
    validateRequiredFields(['id_carrera', 'id_semestre', 'nombre_grupo', 'turno', 'periodo', 'anio']),
    asyncHandler(async (req, res) => {
        const id = await asistenciaDB.insertarGrupo(req.body);
        sendSuccess(res, { id }, "Grupo creado correctamente", 201);
    })
);

router.put("/grupos/:id", 
    validateNumericId,
    validateRequiredFields(['id_carrera', 'id_semestre', 'nombre_grupo', 'turno', 'periodo', 'anio']),
    asyncHandler(async (req, res) => {
        const resultado = await asistenciaDB.actualizarGrupo(req.params.id, req.body);
        if (resultado.affectedRows === 0) return sendError(res, "Grupo no encontrado", 404);
        sendSuccess(res, null, "Grupo actualizado correctamente");
    })
);

router.delete("/grupos/:id", 
    validateNumericId,
    asyncHandler(async (req, res) => {
        const tieneAlumnos = await asistenciaDB.verificarAlumnosEnGrupo(req.params.id);
        if (tieneAlumnos) {
            return sendError(res, "No se puede eliminar porque tiene alumnos asignados", 400);
        }
        
        const resultado = await asistenciaDB.eliminarGrupo(req.params.id);
        if (resultado.affectedRows === 0) return sendError(res, "Grupo no encontrado", 404);
        sendSuccess(res, null, "Grupo eliminado correctamente");
    })
);

// ========== RUTAS PARA ALUMNOS ==========
router.get("/alumnos", asyncHandler(async (req, res) => {
    const alumnos = await asistenciaDB.obtenerAlumnos();
    res.json(alumnos);
}));

router.get("/alumnos/grupo/:idGrupo", asyncHandler(async (req, res) => {
    const alumnos = await asistenciaDB.obtenerAlumnosPorGrupo(req.params.idGrupo);
    res.json(alumnos);
}));

router.get("/alumnos/matricula/:matricula", asyncHandler(async (req, res) => {
    const alumno = await asistenciaDB.buscarAlumnoPorMatricula(req.params.matricula);
    if (!alumno) return sendError(res, "Alumno no encontrado", 404);
    res.json(alumno);
}));

router.get("/alumnos/:id", validateNumericId, asyncHandler(async (req, res) => {
    const alumno = await asistenciaDB.obtenerAlumnoPorId(req.params.id);
    if (!alumno) return sendError(res, "Alumno no encontrado", 404);
    res.json(alumno);
}));

router.post("/alumnos", 
    validateRequiredFields(['matricula', 'nombre_alumno', 'apellido_paterno', 'id_carrera', 'id_semestre', 'id_grupo']),
    asyncHandler(async (req, res) => {
        // Verificar matrícula duplicada
        const existe = await asistenciaDB.verificarMatriculaExistente(req.body.matricula);
        if (existe) {
            return sendError(res, 'Ya existe un alumno con esa matrícula', 400);
        }
        
        // Verificar que el grupo existe
        const grupoExiste = await asistenciaDB.verificarGrupo(req.body.id_grupo);
        if (!grupoExiste) {
            return sendError(res, 'El grupo seleccionado no existe', 400);
        }
        
        const id = await asistenciaDB.insertarAlumno(req.body);
        sendSuccess(res, { id }, "Alumno registrado correctamente", 201);
    })
);

router.put("/alumnos/:id", 
    validateNumericId,
    validateRequiredFields(['matricula', 'nombre_alumno', 'apellido_paterno', 'id_carrera', 'id_semestre', 'id_grupo']),
    asyncHandler(async (req, res) => {
        // Verificar matrícula duplicada (excluyendo el alumno actual)
        const existe = await asistenciaDB.verificarMatriculaExistente(req.body.matricula, req.params.id);
        if (existe) {
            return sendError(res, 'Ya existe otro alumno con esa matrícula', 400);
        }
        
        const resultado = await asistenciaDB.actualizarAlumno(req.params.id, req.body);
        if (resultado.affectedRows === 0) return sendError(res, "Alumno no encontrado", 404);
        sendSuccess(res, null, "Alumno actualizado correctamente");
    })
);

router.delete("/alumnos/:id",
    validateNumericId,
    asyncHandler(async (req, res) => {
        const idAlumno = req.params.id;
        const alumno = await asistenciaDB.obtenerAlumnoPorId(idAlumno);
        
        if (!alumno) {
            return sendError(res, "Alumno no encontrado", 404);
        }
        
        const tieneAsistencias = await asistenciaDB.verificarAsistenciasAlumno(idAlumno);
        
        if (tieneAsistencias) {
            const forzarEliminacion = req.query.forzar === 'true';
            
            if (!forzarEliminacion) {
                return sendError(res, `No se puede eliminar porque tiene ${tieneAsistencias} registros de asistencia`, 400, {
                    tieneAsistencias: true,
                    totalAsistencias: tieneAsistencias
                });
            }
            
            // Eliminar asistencias primero
            await asistenciaDB.eliminarAsistenciasDeAlumno(idAlumno);
        }
        
        const resultado = await asistenciaDB.eliminarAlumno(idAlumno);
        if (resultado.affectedRows === 0) {
            return sendError(res, "Alumno no encontrado", 404);
        }
        
        sendSuccess(res, null, "Alumno eliminado correctamente");
    })
);

// Ruta para importar alumnos masivamente desde CSV
router.post("/alumnos/importar-csv",
    validateRequiredFields(['alumnos']),
    asyncHandler(async (req, res) => {
        const { alumnos } = req.body;
        
        if (!Array.isArray(alumnos) || alumnos.length === 0) {
            return sendError(res, 'No se proporcionaron alumnos para importar', 400);
        }
        
        let importados = 0;
        let omitidos = 0;
        const errores = [];
        
        for (const alumno of alumnos) {
            try {
                // Verificar que tenga los campos requeridos
                if (!alumno.matricula || !alumno.nombre_alumno || !alumno.apellido_paterno || 
                    !alumno.id_carrera || !alumno.id_semestre || !alumno.id_grupo) {
                    omitidos++;
                    errores.push(`Matrícula ${alumno.matricula || 'desconocida'}: campos incompletos`);
                    continue;
                }
                
                // Verificar si ya existe la matrícula
                const existe = await asistenciaDB.verificarMatriculaExistente(alumno.matricula);
                if (existe) {
                    omitidos++;
                    errores.push(`Matrícula ${alumno.matricula}: ya existe`);
                    continue;
                }
                
                // Verificar que el grupo existe
                const grupoExiste = await asistenciaDB.verificarGrupo(alumno.id_grupo);
                if (!grupoExiste) {
                    omitidos++;
                    errores.push(`Matrícula ${alumno.matricula}: grupo no existe`);
                    continue;
                }
                
                // Insertar el alumno
                await asistenciaDB.insertarAlumno(alumno);
                importados++;
                
            } catch (error) {
                console.error(`Error al importar alumno ${alumno.matricula}:`, error);
                omitidos++;
                errores.push(`Matrícula ${alumno.matricula}: ${error.message}`);
            }
        }
        
        const mensaje = `Importación completada. ${importados} alumnos importados correctamente${omitidos > 0 ? `, ${omitidos} omitidos` : ''}`;
        
        sendSuccess(res, { 
            importados, 
            omitidos, 
            total: alumnos.length,
            errores: errores.length > 0 ? errores : undefined
        }, mensaje, 201);
    })
);

// ========== RUTAS PARA MAESTROS ==========
router.get("/maestros", asyncHandler(async (req, res) => {
    const maestros = await asistenciaDB.obtenerMaestros();
    res.json(maestros);
}));

router.get("/maestros/:id", validateNumericId, asyncHandler(async (req, res) => {
    const maestro = await asistenciaDB.obtenerMaestroPorId(req.params.id);
    if (!maestro) return sendError(res, "Maestro no encontrado", 404);
    res.json(maestro);
}));

router.get("/maestros/:id/completo", validateNumericId, asyncHandler(async (req, res) => {
    const maestro = await asistenciaDB.obtenerMaestroCompleto(req.params.id);
    if (!maestro) return sendError(res, "Maestro no encontrado", 404);
    res.json(maestro);
}));

router.post("/maestros",
    validateRequiredFields(['nombre_completo', 'nombre_usuario', 'contrasena']),
    asyncHandler(async (req, res) => {
        const maestroData = {
            nombre_completo: req.body.nombre_completo,
            apellido_paterno: req.body.apellido_paterno,
            apellido_materno: req.body.apellido_materno,
            nombre_usuario: req.body.nombre_usuario,
            contrasena: req.body.contrasena,
            tipo_usuario: 'maestro',
            activo: true
        };
        const id = await asistenciaDB.insertarMaestro(maestroData);
        sendSuccess(res, { id }, "Maestro registrado correctamente", 201);
    })
);

router.put("/maestros/:id",
    validateNumericId,
    validateRequiredFields(['nombre_completo']),
    asyncHandler(async (req, res) => {
        const resultado = await asistenciaDB.actualizarMaestro(req.params.id, req.body);
        if (resultado.affectedRows === 0) return sendError(res, "Maestro no encontrado", 404);
        sendSuccess(res, null, "Maestro actualizado correctamente");
    })
);

router.delete("/maestros/:id",
    validateNumericId,
    asyncHandler(async (req, res) => {
        const tieneAsignaciones = await asistenciaDB.verificarAsignacionesMaestro(req.params.id);
        if (tieneAsignaciones) {
            return sendError(res, "No se puede eliminar este maestro porque tiene asignaciones de materias", 400);
        }
        
        const resultado = await asistenciaDB.eliminarMaestro(req.params.id);
        sendSuccess(res, null, "Maestro eliminado correctamente");
    })
);

// ========== RUTAS PARA HORARIOS ==========
router.get("/horarios", asyncHandler(async (req, res) => {
    const horarios = await asistenciaDB.obtenerHorarios();
    res.json(horarios);
}));

router.get("/horarios/disponibles", asyncHandler(async (req, res) => {
    const { id_grupo, id_maestro } = req.query;
    
    if (!id_grupo || !id_maestro) {
        return sendError(res, "Se requieren id_grupo e id_maestro", 400);
    }
    
    const horarios = await asistenciaDB.obtenerHorariosDisponibles(id_grupo, id_maestro);
    res.json(horarios);
}));

router.get("/horarios/:id", validateNumericId, asyncHandler(async (req, res) => {
    const horario = await asistenciaDB.obtenerHorarioPorId(req.params.id);
    if (!horario) return sendError(res, "Horario no encontrado", 404);
    res.json(horario);
}));

// ========== RUTAS PARA ASIGNACIONES ==========
router.get("/asignaciones", asyncHandler(async (req, res) => {
    if (req.query.id_maestro) {
        const asignaciones = await asistenciaDB.obtenerAsignacionesPorMaestro(req.query.id_maestro);
        return res.json(asignaciones);
    }
    if (req.query.id_grupo) {
        const asignaciones = await asistenciaDB.obtenerAsignacionesPorGrupo(req.query.id_grupo);
        return res.json(asignaciones);
    }
    const asignaciones = await asistenciaDB.obtenerAsignaciones();
    res.json(asignaciones);
}));

router.get("/asignaciones/:id", validateNumericId, asyncHandler(async (req, res) => {
    const asignacion = await asistenciaDB.obtenerAsignacionPorId(req.params.id);
    if (!asignacion) return sendError(res, "Asignación no encontrada", 404);
    res.json(asignacion);
}));

router.post("/asignaciones", 
    validateRequiredFields(['id_maestro', 'id_materia', 'id_grupo', 'id_horario']),
    asyncHandler(async (req, res) => {
        const { id_maestro, id_materia, id_grupo, id_horario } = req.body;
        
        // Verificar que el horario no esté ocupado
        const ocupado = await asistenciaDB.verificarHorarioOcupado(id_horario, id_grupo, id_maestro);
        if (ocupado) {
            return sendError(res, 'El horario está ocupado por el grupo o el maestro', 400);
        }
        
        // Agregar fecha de asignación en zona horaria local
        // Formato: YYYY-MM-DD HH:MM:SS (compatible con MySQL DATETIME)
        const now = new Date();
        const fecha_asignacion = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        const asignacionData = {
            ...req.body,
            fecha_asignacion
        };
        
        const id = await asistenciaDB.insertarAsignacion(asignacionData);
        sendSuccess(res, { id }, "Asignación creada correctamente", 201);
    })
);

router.put("/asignaciones/:id", 
    validateNumericId,
    validateRequiredFields(['id_maestro', 'id_materia', 'id_grupo', 'id_horario']),
    asyncHandler(async (req, res) => {
        const resultado = await asistenciaDB.actualizarAsignacion(req.params.id, req.body);
        if (resultado.affectedRows === 0) return sendError(res, "Asignación no encontrada", 404);
        sendSuccess(res, null, "Asignación actualizada correctamente");
    })
);

router.delete("/asignaciones/:id", 
    validateNumericId,
    asyncHandler(async (req, res) => {
        const resultado = await asistenciaDB.eliminarAsignacion(req.params.id);
        if (resultado.affectedRows === 0) return sendError(res, "Asignación no encontrada", 404);
        sendSuccess(res, null, "Asignación eliminada correctamente");
    })
);

// ========== RUTAS PARA ASISTENCIAS ==========
router.get("/asistencias", asyncHandler(async (req, res) => {
    const filtros = {
        id_grupo: req.query.id_grupo,
        id_asignacion: req.query.id_asignacion,
        fecha: req.query.fecha,
        id_alumno: req.query.id_alumno
    };
    
    const asistencias = await asistenciaDB.obtenerAsistencias(filtros);
    res.json(asistencias);
}));

router.get("/asistencias/lista-alumnos", asyncHandler(async (req, res) => {
    if (!req.query.id_asignacion) {
        return sendError(res, "Se requiere id_asignacion", 400);
    }
    
    const lista = await asistenciaDB.obtenerListaAlumnosParaAsistencia(req.query.id_asignacion);
    if (!lista) {
        return sendError(res, "Asignación no encontrada", 404);
    }
    
    res.json(lista);
}));

router.post("/asistencias/registrar", 
    validateRequiredFields(['id_asignacion', 'fecha', 'asistencias']),
    asyncHandler(async (req, res) => {
        const { id_asignacion, fecha, asistencias } = req.body;
        
        // Verificar si ya existe una asistencia para esta asignación y fecha
        const asistenciaExistente = await asistenciaDB.obtenerAsistencias({
            id_asignacion: id_asignacion,
            fecha: fecha
        });
        
        // Preparar datos para inserción masiva
        const registros = asistencias.map(a => ({
            id_alumno: a.id_alumno,
            id_asignacion: id_asignacion,
            fecha: fecha,
            estado: a.estado,
            observaciones: a.observaciones || null
        }));
        
        await asistenciaDB.registrarAsistenciasMasivo(registros);
        
        // Si había registros existentes, se actualizaron; si no, se crearon nuevos
        const mensaje = asistenciaExistente.length > 0 
            ? "Asistencias actualizadas correctamente" 
            : "Asistencias registradas exitosamente";
        
        sendSuccess(res, { 
            registradas: registros.length, 
            fecha: fecha,
            actualizadas: asistenciaExistente.length > 0
        }, mensaje, 201);
    })
);

// ========== RUTAS PARA ESTADÍSTICAS ==========
router.get("/estadisticas/grupo", asyncHandler(async (req, res) => {
    const { id_grupo, fecha_inicio, fecha_fin } = req.query;
    
    if (!id_grupo) {
        return sendError(res, "Se requiere id_grupo", 400);
    }
    
    const estadisticas = await asistenciaDB.obtenerEstadisticasGrupo(id_grupo, fecha_inicio, fecha_fin);
    res.json(estadisticas);
}));

// ========== RUTAS PARA VISUALIZACIÓN ==========
router.get("/estructura", asyncHandler(async (req, res) => {
    const filtros = {
        idCarrera: req.query.idCarrera,
        semestre: req.query.semestre,
        idGrupo: req.query.idGrupo
    };
    
    const estructura = await asistenciaDB.obtenerEstructuraSistema(filtros);
    res.json(estructura);
}));

// ========== RUTAS PARA USUARIOS DEL SISTEMA (ADMIN Y PREFECTOS) ==========
router.get("/usuarios", asyncHandler(async (req, res) => {
    const usuarios = await asistenciaDB.obtenerUsuarios();
    res.json(usuarios);
}));

router.get("/usuarios/:id", validateNumericId, asyncHandler(async (req, res) => {
    const usuario = await asistenciaDB.obtenerUsuarioPorId(req.params.id);
    if (!usuario) return sendError(res, "Usuario no encontrado", 404);
    res.json(usuario);
}));

router.post("/usuarios", 
    validateRequiredFields(['nombreUsuario', 'contrasena', 'tipoUsuario']),
    asyncHandler(async (req, res) => {
        const id = await asistenciaDB.insertarUsuario(req.body);
        sendSuccess(res, { id }, "Usuario registrado correctamente", 201);
    })
);

router.put("/usuarios/:id", 
    validateNumericId,
    validateRequiredFields(['nombreUsuario', 'tipoUsuario']),
    asyncHandler(async (req, res) => {
        const resultado = await asistenciaDB.actualizarUsuario(req.params.id, req.body);
        if (resultado.affectedRows === 0) return sendError(res, "Usuario no encontrado", 404);
        sendSuccess(res, null, "Usuario actualizado correctamente");
    })
);

router.delete("/usuarios/:id", 
    validateNumericId,
    asyncHandler(async (req, res) => {
        const idUsuario = req.params.id;
        
        const usuario = await asistenciaDB.obtenerUsuarioPorId(idUsuario);
        if (!usuario) return sendError(res, "Usuario no encontrado", 404);
        
        const tieneRelaciones = await asistenciaDB.verificarRelacionesUsuario(idUsuario);
        if (tieneRelaciones) {
            return sendError(res, `No se puede eliminar al usuario ${usuario.nombre_usuario} porque tiene asignaciones activas.`, 400);
        }
        
        const resultado = await asistenciaDB.eliminarUsuario(idUsuario);
        if (resultado.affectedRows === 0) return sendError(res, "Usuario no encontrado", 404);
        
        sendSuccess(res, { 
            usuario_eliminado: { id: idUsuario, nombre: usuario.nombre_usuario, tipo: usuario.tipo_usuario }
        }, `Usuario ${usuario.nombre_usuario} eliminado correctamente`);
    })
);

// ========== RUTAS PARA PORTAL DE PREFECTOS ==========

// Dashboard Principal - Métricas en tiempo real
router.get("/prefectos/dashboard", requirePrefecto, asyncHandler(async (req, res) => {
    const fecha = req.query.fecha || null;
    
    const [metricas, tendencia, ranking, alertas, estadisticasGrupos] = await Promise.all([
        asistenciaDB.obtenerMetricasDashboard(fecha),
        asistenciaDB.obtenerTendenciaAsistencia(7),
        asistenciaDB.obtenerRankingGrupos(5, 30),
        asistenciaDB.obtenerAlertas(),
        asistenciaDB.obtenerEstadisticasGrupos(30)
    ]);
    
    res.json({
        metricas,
        tendencia,
        ranking,
        alertas,
        estadisticas_grupos: estadisticasGrupos
    });
}));

// Alumnos Problemáticos con filtros
router.get("/prefectos/alumnos-problematicos", requirePrefecto, asyncHandler(async (req, res) => {
    const filtros = {
        id_carrera: req.query.id_carrera || null,
        id_semestre: req.query.id_semestre || null,
        id_grupo: req.query.id_grupo || null,
        periodo: parseInt(req.query.periodo) || 7,
        minimo_faltas: parseInt(req.query.minimo_faltas) || 1
    };
    
    const alumnos = await asistenciaDB.obtenerAlumnosProblematicos(filtros);
    
    res.json(alumnos);
}));

// Detalle completo de alumno
router.get("/prefectos/alumno/:id", requirePrefecto, validateNumericId, asyncHandler(async (req, res) => {
    const periodo = parseInt(req.query.periodo) || 30;
    const detalle = await asistenciaDB.obtenerDetalleAlumno(req.params.id, periodo);
    
    if (!detalle) {
        return sendError(res, "Alumno no encontrado", 404);
    }
    
    res.json(detalle);
}));

// ========== GESTIÓN DE ATENCIONES A ALUMNOS ==========

// Registrar atención a un alumno
router.post("/prefectos/atencion-alumno", requirePrefecto, asyncHandler(async (req, res) => {
    const { id_alumno, notas } = req.body;
    const id_prefecto = req.session.user.id;
    
    if (!id_alumno) {
        return sendError(res, "ID de alumno es requerido", 400);
    }
    
    await asistenciaDB.registrarAtencionAlumno(id_alumno, id_prefecto, notas);
    sendSuccess(res, null, "Atención registrada correctamente", 201);
}));

// Verificar si un alumno ha sido atendido
router.get("/prefectos/atencion-alumno/:id", requirePrefecto, validateNumericId, asyncHandler(async (req, res) => {
    const atencion = await asistenciaDB.verificarAlumnoAtendido(req.params.id);
    res.json({ atendido: !!atencion, atencion });
}));

// Obtener todos los alumnos atendidos
router.get("/prefectos/alumnos-atendidos", requirePrefecto, asyncHandler(async (req, res) => {
    const dias = parseInt(req.query.dias) || 30;
    const alumnos = await asistenciaDB.obtenerAlumnosAtendidos(dias);
    res.json(alumnos);
}));

// Eliminar atención (revertir)
router.delete("/prefectos/atencion-alumno/:id", requirePrefecto, validateNumericId, asyncHandler(async (req, res) => {
    await asistenciaDB.eliminarAtencionAlumno(req.params.id);
    sendSuccess(res, null, "Atención eliminada correctamente");
}));

// Control de Maestros - Clases sin registrar
router.get("/prefectos/maestros-control", requirePrefecto, asyncHandler(async (req, res) => {
    const fecha = req.query.fecha || null;
    const control = await asistenciaDB.obtenerClasesSinRegistrar(fecha);
    res.json(control);
}));

// Detalle completo de maestro
router.get("/prefectos/maestro/:id", requirePrefecto, validateNumericId, asyncHandler(async (req, res) => {
    const periodo = parseInt(req.query.periodo) || 30;
    const detalle = await asistenciaDB.obtenerDetalleMaestro(req.params.id, periodo);
    
    if (!detalle) {
        return sendError(res, "Maestro no encontrado", 404);
    }
    
    res.json(detalle);
}));

// Maestros con problemas recurrentes
router.get("/prefectos/maestros-problematicos", requirePrefecto, asyncHandler(async (req, res) => {
    const periodo = parseInt(req.query.periodo) || 30;
    const umbral = parseInt(req.query.umbral) || 80;
    
    const maestros = await asistenciaDB.obtenerMaestrosProblematicos(periodo, umbral);
    res.json(maestros);
}));

// Histórico de registros de maestros
router.get("/prefectos/maestros-historico", requirePrefecto, asyncHandler(async (req, res) => {
    const filtros = {
        fechaDesde: req.query.fechaDesde,
        fechaHasta: req.query.fechaHasta,
        idMaestro: req.query.idMaestro ? parseInt(req.query.idMaestro) : null,
        idCarrera: req.query.idCarrera ? parseInt(req.query.idCarrera) : null,
        idSemestre: req.query.idSemestre ? parseInt(req.query.idSemestre) : null,
        idGrupo: req.query.idGrupo ? parseInt(req.query.idGrupo) : null
    };
    
    const historico = await asistenciaDB.obtenerHistoricoRegistrosMaestros(filtros);
    res.json(historico);
}));

// Tendencia de asistencia personalizada
router.get("/prefectos/tendencia", requirePrefecto, asyncHandler(async (req, res) => {
    const dias = parseInt(req.query.dias) || 7;
    const tendencia = await asistenciaDB.obtenerTendenciaAsistencia(dias);
    res.json(tendencia);
}));

// Ranking de grupos personalizado
router.get("/prefectos/ranking-grupos", requirePrefecto, asyncHandler(async (req, res) => {
    const limite = parseInt(req.query.limite) || 5;
    const periodo = parseInt(req.query.periodo) || 30;
    
    const ranking = await asistenciaDB.obtenerRankingGrupos(limite, periodo);
    res.json(ranking);
}));

// Alertas del sistema
router.get("/prefectos/alertas", requirePrefecto, asyncHandler(async (req, res) => {
    const alertas = await asistenciaDB.obtenerAlertas();
    res.json(alertas);
}));

// Grupos Excelentes (≥90% asistencia)
router.get("/prefectos/grupos-excelentes", requirePrefecto, asyncHandler(async (req, res) => {
    const periodo = parseInt(req.query.periodo) || 30;
    const grupos = await asistenciaDB.obtenerGruposExcelentes(periodo);
    res.json(grupos);
}));

// Grupos Críticos (<70% asistencia)
router.get("/prefectos/grupos-criticos", requirePrefecto, asyncHandler(async (req, res) => {
    const periodo = parseInt(req.query.periodo) || 30;
    const grupos = await asistenciaDB.obtenerGruposCriticos(periodo);
    res.json(grupos);
}));

export default router;