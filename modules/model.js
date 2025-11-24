import mysql from "mysql2";
import BaseModel from "../utils/BaseModel.js";
import logger from "../utils/logger.js";

// Configuración de conexión
const dbConfig = {
    host: "centerbeam.proxy.rlwy.net",
    port: 48742,
    user: "root",
    password: "QoeVPzHfoWKnrDHZoxgtXXMreyIQhpnI",
    database: "SistemaAsistenciaEscolar",
    timezone: '-07:00'
};

// Crear pool de conexiones (se reconecta automáticamente)
const conexion = mysql.createPool(dbConfig);

// Verificar conexión
conexion.getConnection((error, connection) => {
    if(error){
        logger.error("Error de conexión a la base de datos", error);
    } else {
        logger.info("Conectado a la base de datos SistemaAsistenciaEscolar");
        connection.release();
    }
});

// Instancia del modelo base
const baseModel = new BaseModel(conexion);
const asistenciaDB = {};

// ========== FUNCIONES PARA CARRERAS ==========
asistenciaDB.insertarCarrera = (carrera) => baseModel.create('Carreras', carrera);
asistenciaDB.obtenerCarreras = () => baseModel.findAll('Carreras', '', [], 'nombre_carrera');
asistenciaDB.obtenerCarreraPorId = (id) => baseModel.findById('Carreras', id, 'id_carrera');
asistenciaDB.actualizarCarrera = (id, carrera) => baseModel.update('Carreras', id, carrera, 'id_carrera');
asistenciaDB.eliminarCarrera = (id) => baseModel.delete('Carreras', id, 'id_carrera');
asistenciaDB.verificarRelacionesCarrera = async (idCarrera) => {
    const totalSemestres = await baseModel.countRelated('Semestres', 'id_carrera', idCarrera);
    const totalMaterias = await baseModel.countRelated('Materias', 'id_carrera', idCarrera);
    const totalGrupos = await baseModel.countRelated('Grupos', 'id_carrera', idCarrera);
    return (totalSemestres + totalMaterias + totalGrupos) > 0;
};

// ========== FUNCIONES PARA SEMESTRES ==========
asistenciaDB.insertarSemestre = (semestre) => baseModel.create('Semestres', semestre);
asistenciaDB.obtenerSemestres = () => {
    const sql = `
        SELECT 
            s.id_semestre,
            s.id_carrera,
            s.numero_semestre,
            s.nombre_semestre,
            c.nombre_carrera
        FROM Semestres s
        JOIN Carreras c ON s.id_carrera = c.id_carrera
        ORDER BY c.nombre_carrera, s.numero_semestre
    `;
    return baseModel.query(sql);
};

asistenciaDB.obtenerSemestresPorCarrera = (idCarrera) => {
    const sql = `
        SELECT 
            s.id_semestre,
            s.id_carrera,
            s.numero_semestre,
            s.nombre_semestre,
            c.nombre_carrera
        FROM Semestres s
        JOIN Carreras c ON s.id_carrera = c.id_carrera
        WHERE s.id_carrera = ?
        ORDER BY s.numero_semestre
    `;
    return baseModel.query(sql, [idCarrera]);
};

asistenciaDB.obtenerSemestrePorId = (id) => {
    const sql = `
        SELECT 
            s.id_semestre,
            s.id_carrera,
            s.numero_semestre,
            s.nombre_semestre,
            c.nombre_carrera
        FROM Semestres s
        JOIN Carreras c ON s.id_carrera = c.id_carrera
        WHERE s.id_semestre = ?
    `;
    return baseModel.query(sql, [id]).then(result => result[0]);
};

asistenciaDB.actualizarSemestre = (id, semestre) => baseModel.update('Semestres', id, semestre, 'id_semestre');
asistenciaDB.eliminarSemestre = (id) => baseModel.delete('Semestres', id, 'id_semestre');

asistenciaDB.verificarSemestreEnUso = async (idSemestre) => {
    // Verificar en PlanEstudios usando id_semestre
    const totalPlan = await baseModel.countRelated('PlanEstudios', 'id_semestre', idSemestre);
    
    // Verificar en Grupos usando id_semestre (ahora es foreign key)
    const totalGrupos = await baseModel.countRelated('Grupos', 'id_semestre', idSemestre);
    
    // Verificar en Alumnos usando id_semestre
    const totalAlumnos = await baseModel.countRelated('Alumnos', 'id_semestre', idSemestre);
    
    return (totalPlan + totalGrupos + totalAlumnos) > 0;
};

asistenciaDB.verificarSemestreDuplicado = async (idCarrera, numeroSemestre, idSemestreExcluir = null) => {
    let sql = 'SELECT COUNT(*) as count FROM Semestres WHERE id_carrera = ? AND numero_semestre = ?';
    const params = [idCarrera, numeroSemestre];
    
    if (idSemestreExcluir) {
        sql += ' AND id_semestre != ?';
        params.push(idSemestreExcluir);
    }
    
    const resultado = await baseModel.query(sql, params);
    return resultado[0].count > 0;
};

asistenciaDB.generarSemestresMultiples = async (idCarrera, cantidadSemestres) => {
    const nombres = {
        1: 'Primer Semestre',
        2: 'Segundo Semestre',
        3: 'Tercer Semestre',
        4: 'Cuarto Semestre',
        5: 'Quinto Semestre',
        6: 'Sexto Semestre',
        7: 'Séptimo Semestre',
        8: 'Octavo Semestre',
        9: 'Noveno Semestre',
        10: 'Décimo Semestre',
        11: 'Décimo Primer Semestre',
        12: 'Décimo Segundo Semestre'
    };

    // Verificar qué semestres ya existen para esta carrera
    const semestresExistentes = await asistenciaDB.obtenerSemestresPorCarrera(idCarrera);
    const numerosExistentes = new Set(semestresExistentes.map(s => s.numero_semestre));

    // Crear array de semestres a insertar (solo los que no existen)
    const semestresAInsertar = [];
    for (let i = 1; i <= cantidadSemestres; i++) {
        if (!numerosExistentes.has(i)) {
            semestresAInsertar.push({
                id_carrera: idCarrera,
                numero_semestre: i,
                nombre_semestre: nombres[i] || `${i}° Semestre`
            });
        }
    }

    // Si no hay semestres nuevos que insertar
    if (semestresAInsertar.length === 0) {
        return {
            success: false,
            message: `Ya existen todos los semestres del 1 al ${cantidadSemestres} para esta carrera`,
            insertados: 0,
            existentes: semestresExistentes.length
        };
    }

    // Insertar los semestres nuevos
    let insertados = 0;
    const errores = [];

    for (const semestre of semestresAInsertar) {
        try {
            await asistenciaDB.insertarSemestre(semestre);
            insertados++;
        } catch (error) {
            errores.push(`Error al insertar semestre ${semestre.numero_semestre}: ${error.message}`);
        }
    }

    return {
        success: insertados > 0,
        message: insertados > 0 ? 
            `Se generaron ${insertados} semestre(s) correctamente` : 
            'No se pudo generar ningún semestre',
        insertados,
        existentes: semestresExistentes.length,
        errores: errores.length > 0 ? errores : null
    };
};

// ========== FUNCIONES PARA MAESTROS (FUSIONADA CON USUARIOS) ==========
asistenciaDB.insertarMaestro = (maestro) => baseModel.create('Maestros', maestro);

asistenciaDB.obtenerMaestros = () => {
    const sql = `
        SELECT 
            id_maestro,
            nombre_usuario,
            tipo_usuario,
            nombre_completo,
            apellido_paterno,
            apellido_materno,
            activo
        FROM Maestros
        WHERE tipo_usuario = 'maestro'
        ORDER BY nombre_completo
    `;
    return baseModel.query(sql);
};

asistenciaDB.obtenerMaestroPorId = async (id) => {
    const sql = `
        SELECT 
            id_maestro,
            nombre_usuario,
            tipo_usuario,
            nombre_completo,
            apellido_paterno,
            apellido_materno,
            activo
        FROM Maestros
        WHERE id_maestro = ?
    `;
    const resultado = await baseModel.query(sql, [id]);
    return resultado[0];
};

asistenciaDB.obtenerMaestroCompleto = async (id) => {
    const sql = `
        SELECT 
            id_maestro,
            nombre_usuario,
            contrasena,
            tipo_usuario,
            nombre_completo,
            apellido_paterno,
            apellido_materno,
            activo
        FROM Maestros
        WHERE id_maestro = ?
    `;
    const resultado = await baseModel.query(sql, [id]);
    return resultado[0];
};

asistenciaDB.actualizarMaestro = (id, maestro) => baseModel.update('Maestros', id, maestro, 'id_maestro');

asistenciaDB.eliminarMaestro = (id) => baseModel.delete('Maestros', id, 'id_maestro');

asistenciaDB.verificarAsignacionesMaestro = async (idMaestro) => {
    const resultado = await baseModel.query('SELECT COUNT(*) as count FROM Asignaciones WHERE id_maestro = ?', [idMaestro]);
    return resultado[0].count > 0;
};

// Login usando consulta SQL directa
asistenciaDB.verificarLoginMaestro = async (usuario, contrasena) => {
    const sql = `
        SELECT 
            id_maestro,
            nombre_usuario,
            tipo_usuario,
            nombre_completo,
            apellido_paterno,
            apellido_materno
        FROM Maestros 
        WHERE nombre_usuario = ? AND contrasena = ? AND tipo_usuario = 'maestro' AND activo = TRUE
    `;
    const resultado = await baseModel.query(sql, [usuario, contrasena]);
    return resultado[0]; // Devolver el primer resultado
};

// Login para usuarios regulares (admin/prefectos)
asistenciaDB.verificarLoginUsuario = async (usuario, contrasena) => {
    const sql = `
        SELECT id_maestro as id, nombre_usuario, tipo_usuario, nombre_completo
        FROM Maestros 
        WHERE nombre_usuario = ? AND contrasena = ? AND tipo_usuario IN ('admin', 'prefecto') AND activo = TRUE
    `;
    const resultado = await baseModel.query(sql, [usuario, contrasena]);
    return resultado[0]; // Devolver el primer resultado
};

// ========== FUNCIONES PARA MATERIAS ==========
asistenciaDB.insertarMateria = (materia) => baseModel.create('Materias', materia);

asistenciaDB.obtenerMaterias = () => {
    const sql = `
        SELECT 
            id_materia,
            nombre_materia,
            codigo_materia
        FROM Materias
        ORDER BY nombre_materia
    `;
    return baseModel.query(sql);
};

asistenciaDB.obtenerMateriasPorCarrera = (idCarrera) => {
    const sql = `
        SELECT DISTINCT
            m.id_materia,
            m.nombre_materia,
            m.codigo_materia
        FROM Materias m
        JOIN PlanEstudios p ON m.id_materia = p.id_materia
        WHERE p.id_carrera = ?
        ORDER BY m.nombre_materia
    `;
    return baseModel.query(sql, [idCarrera]);
};

asistenciaDB.obtenerMateriaPorId = (id) => {
    const sql = `
        SELECT 
            id_materia,
            nombre_materia,
            codigo_materia
        FROM Materias
        WHERE id_materia = ?
    `;
    return baseModel.query(sql, [id]).then(result => result[0]);
};

asistenciaDB.actualizarMateria = (id, materia) => baseModel.update('Materias', id, materia, 'id_materia');
asistenciaDB.eliminarMateria = (id) => baseModel.delete('Materias', id, 'id_materia');

asistenciaDB.verificarAsignacionesMateria = async (idMateria) => {
    // Solo verificar Asignaciones - ya no verificamos PlanEstudios porque es parte del sistema unificado
    // y se elimina automáticamente por CASCADE
    const totalAsignaciones = await baseModel.query('SELECT COUNT(*) as count FROM Asignaciones WHERE id_materia = ?', [idMateria]);
    return totalAsignaciones[0].count > 0;
};

// ========== FUNCIONES PARA PLAN DE ESTUDIOS ==========
asistenciaDB.insertarPlanEstudios = (plan) => baseModel.create('PlanEstudios', plan);

asistenciaDB.obtenerPlanEstudios = () => {
    const sql = `
        SELECT 
            p.id_plan,
            p.id_carrera,
            p.id_semestre,
            p.id_materia,
            c.nombre_carrera,
            s.numero_semestre,
            s.nombre_semestre,
            m.nombre_materia,
            m.codigo_materia
        FROM PlanEstudios p
        JOIN Carreras c ON p.id_carrera = c.id_carrera
        JOIN Semestres s ON p.id_semestre = s.id_semestre
        JOIN Materias m ON p.id_materia = m.id_materia
        ORDER BY c.nombre_carrera, s.numero_semestre, m.nombre_materia
    `;
    return baseModel.query(sql);
};

asistenciaDB.obtenerPlanEstudiosPorCarrera = (idCarrera) => {
    const sql = `
        SELECT 
            p.id_plan,
            p.id_carrera,
            p.id_semestre,
            p.id_materia,
            c.nombre_carrera,
            s.numero_semestre,
            s.nombre_semestre,
            m.nombre_materia,
            m.codigo_materia
        FROM PlanEstudios p
        JOIN Carreras c ON p.id_carrera = c.id_carrera
        JOIN Semestres s ON p.id_semestre = s.id_semestre
        JOIN Materias m ON p.id_materia = m.id_materia
        WHERE p.id_carrera = ?
        ORDER BY s.numero_semestre, m.nombre_materia
    `;
    return baseModel.query(sql, [idCarrera]);
};

asistenciaDB.obtenerMateriasPorSemestre = (idCarrera, idSemestre) => {
    const sql = `
        SELECT 
            m.id_materia,
            m.nombre_materia,
            m.codigo_materia,
            p.id_plan
        FROM PlanEstudios p
        JOIN Materias m ON p.id_materia = m.id_materia
        WHERE p.id_carrera = ? AND p.id_semestre = ?
        ORDER BY m.nombre_materia
    `;
    return baseModel.query(sql, [idCarrera, idSemestre]);
};

asistenciaDB.obtenerPlanEstudioPorId = (id) => {
    const sql = `
        SELECT 
            p.id_plan,
            p.id_carrera,
            p.id_semestre,
            p.id_materia,
            c.nombre_carrera,
            s.numero_semestre,
            s.nombre_semestre,
            m.nombre_materia,
            m.codigo_materia
        FROM PlanEstudios p
        JOIN Carreras c ON p.id_carrera = c.id_carrera
        JOIN Semestres s ON p.id_semestre = s.id_semestre
        JOIN Materias m ON p.id_materia = m.id_materia
        WHERE p.id_plan = ?
    `;
    return baseModel.query(sql, [id]).then(result => result[0]);
};

asistenciaDB.eliminarPlanEstudios = (id) => baseModel.delete('PlanEstudios', id, 'id_plan');

asistenciaDB.actualizarPlanEstudiosPorMateria = async (idMateria, idCarrera, idSemestre) => {
    const sql = `
        UPDATE PlanEstudios 
        SET id_semestre = ? 
        WHERE id_materia = ? AND id_carrera = ?
    `;
    return baseModel.query(sql, [idSemestre, idMateria, idCarrera]);
};

asistenciaDB.verificarPlanEstudiosDuplicado = async (idCarrera, idSemestre, idMateria) => {
    const sql = 'SELECT COUNT(*) as count FROM PlanEstudios WHERE id_carrera = ? AND id_semestre = ? AND id_materia = ?';
    const resultado = await baseModel.query(sql, [idCarrera, idSemestre, idMateria]);
    return resultado[0].count > 0;
};

// ========== FUNCIONES PARA GRUPOS ==========
asistenciaDB.insertarGrupo = (grupo) => baseModel.create('Grupos', grupo);
asistenciaDB.actualizarGrupo = (id, grupo) => baseModel.update('Grupos', id, grupo, 'id_grupo');
asistenciaDB.eliminarGrupo = (id) => baseModel.delete('Grupos', id, 'id_grupo');
asistenciaDB.verificarGrupo = (idGrupo) => baseModel.exists('Grupos', idGrupo, 'id_grupo');

asistenciaDB.obtenerGrupos = () => {
    const sql = `
        SELECT 
            g.id_grupo,
            g.id_carrera,
            g.id_semestre,
            g.nombre_grupo,
            g.turno,
            g.periodo,
            g.anio,
            g.activo,
            c.nombre_carrera,
            c.codigo_carrera,
            s.numero_semestre,
            s.nombre_semestre
        FROM Grupos g
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        ORDER BY c.nombre_carrera, s.numero_semestre, g.nombre_grupo
    `;
    return baseModel.query(sql);
};

asistenciaDB.obtenerGruposPorCarrera = (idCarrera) => {
    const sql = `
        SELECT 
            g.id_grupo,
            g.id_carrera,
            g.id_semestre,
            g.nombre_grupo,
            g.turno,
            g.periodo,
            g.anio,
            g.activo,
            c.nombre_carrera,
            c.codigo_carrera,
            s.numero_semestre,
            s.nombre_semestre
        FROM Grupos g
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        WHERE g.id_carrera = ?
        ORDER BY s.numero_semestre, g.nombre_grupo
    `;
    return baseModel.query(sql, [idCarrera]);
};

asistenciaDB.obtenerGruposPorCarreraYSemestre = (idCarrera, idSemestre) => {
    const sql = `
        SELECT 
            g.id_grupo,
            g.id_carrera,
            g.id_semestre,
            g.nombre_grupo,
            g.turno,
            g.periodo,
            g.anio,
            g.activo,
            c.nombre_carrera,
            c.codigo_carrera,
            s.numero_semestre,
            s.nombre_semestre
        FROM Grupos g
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        WHERE g.id_carrera = ? AND g.id_semestre = ?
        ORDER BY g.nombre_grupo
    `;
    return baseModel.query(sql, [idCarrera, idSemestre]);
};

asistenciaDB.obtenerGrupoPorId = (id) => {
    const sql = `
        SELECT 
            g.id_grupo,
            g.id_carrera,
            g.id_semestre,
            g.nombre_grupo,
            g.turno,
            g.periodo,
            g.anio,
            g.activo,
            c.nombre_carrera,
            c.codigo_carrera,
            s.numero_semestre,
            s.nombre_semestre
        FROM Grupos g
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        WHERE g.id_grupo = ?
    `;
    return baseModel.query(sql, [id]).then(result => result[0]);
};

asistenciaDB.verificarAlumnosEnGrupo = async (idGrupo) => {
    const resultado = await baseModel.query('SELECT COUNT(*) as count FROM Alumnos WHERE id_grupo = ?', [idGrupo]);
    return resultado[0].count > 0;
};

// ========== FUNCIONES PARA ALUMNOS ==========
asistenciaDB.insertarAlumno = (alumno) => {
    return baseModel.create('Alumnos', {
        matricula: alumno.matricula,
        nombre_alumno: alumno.nombre_alumno,
        apellido_paterno: alumno.apellido_paterno,
        apellido_materno: alumno.apellido_materno,
        id_carrera: alumno.id_carrera,
        id_semestre: alumno.id_semestre,
        id_grupo: alumno.id_grupo,
        foto_base64: alumno.foto_base64 || null,
        activo: alumno.activo !== undefined ? alumno.activo : true
    });
};

asistenciaDB.actualizarAlumno = (id, alumno) => {
    return baseModel.update('Alumnos', id, {
        matricula: alumno.matricula,
        nombre_alumno: alumno.nombre_alumno,
        apellido_paterno: alumno.apellido_paterno,
        apellido_materno: alumno.apellido_materno,
        id_carrera: alumno.id_carrera,
        id_semestre: alumno.id_semestre,
        id_grupo: alumno.id_grupo,
        foto_base64: alumno.foto_base64 !== undefined ? alumno.foto_base64 : null,
        activo: alumno.activo !== undefined ? alumno.activo : true
    }, 'id_alumno');
};

asistenciaDB.eliminarAlumno = (id) => baseModel.delete('Alumnos', id, 'id_alumno');

asistenciaDB.obtenerAlumnos = () => {
    const sql = `
        SELECT 
            a.id_alumno,
            a.matricula,
            a.nombre_alumno,
            a.apellido_paterno,
            a.apellido_materno,
            CONCAT_WS(' ', a.nombre_alumno, COALESCE(a.apellido_paterno, ''), COALESCE(a.apellido_materno, '')) as nombre_completo,
            a.id_carrera,
            a.id_semestre,
            a.id_grupo,
            a.foto_base64,
            a.activo,
            c.nombre_carrera,
            s.numero_semestre,
            s.nombre_semestre,
            g.nombre_grupo,
            g.turno
        FROM Alumnos a
        JOIN Carreras c ON a.id_carrera = c.id_carrera
        JOIN Semestres s ON a.id_semestre = s.id_semestre
        JOIN Grupos g ON a.id_grupo = g.id_grupo
        ORDER BY a.nombre_alumno, a.apellido_paterno
    `;
    return baseModel.query(sql);
};

asistenciaDB.obtenerAlumnosPorGrupo = (idGrupo) => {
    const sql = `
        SELECT 
            a.id_alumno,
            a.matricula,
            a.nombre_alumno,
            a.apellido_paterno,
            a.apellido_materno,
            CONCAT_WS(' ', a.nombre_alumno, COALESCE(a.apellido_paterno, ''), COALESCE(a.apellido_materno, '')) as nombre_completo,
            a.id_carrera,
            a.id_semestre,
            a.id_grupo,
            a.foto_base64,
            a.activo,
            c.nombre_carrera,
            s.numero_semestre,
            g.nombre_grupo
        FROM Alumnos a
        JOIN Carreras c ON a.id_carrera = c.id_carrera
        JOIN Semestres s ON a.id_semestre = s.id_semestre
        JOIN Grupos g ON a.id_grupo = g.id_grupo
        WHERE a.id_grupo = ?
        ORDER BY a.nombre_alumno, a.apellido_paterno
    `;
    return baseModel.query(sql, [idGrupo]);
};

asistenciaDB.buscarAlumnoPorMatricula = (matricula) => {
    const sql = `
        SELECT 
            a.id_alumno,
            a.matricula,
            a.nombre_alumno,
            a.apellido_paterno,
            a.apellido_materno,
            CONCAT_WS(' ', a.nombre_alumno, COALESCE(a.apellido_paterno, ''), COALESCE(a.apellido_materno, '')) as nombre_completo,
            a.id_carrera,
            a.id_semestre,
            a.id_grupo,
            a.foto_base64,
            a.activo,
            c.nombre_carrera,
            s.numero_semestre,
            g.nombre_grupo
        FROM Alumnos a
        JOIN Carreras c ON a.id_carrera = c.id_carrera
        JOIN Semestres s ON a.id_semestre = s.id_semestre
        JOIN Grupos g ON a.id_grupo = g.id_grupo
        WHERE a.matricula = ?
    `;
    return baseModel.query(sql, [matricula]).then(result => result[0]);
};

asistenciaDB.obtenerAlumnoPorId = (id) => {
    const sql = `
        SELECT 
            a.id_alumno,
            a.matricula,
            a.nombre_alumno,
            a.apellido_paterno,
            a.apellido_materno,
            CONCAT_WS(' ', a.nombre_alumno, COALESCE(a.apellido_paterno, ''), COALESCE(a.apellido_materno, '')) as nombre_completo,
            a.id_carrera,
            a.id_semestre,
            a.id_grupo,
            a.foto_base64,
            a.activo,
            c.nombre_carrera,
            s.numero_semestre,
            s.nombre_semestre,
            g.nombre_grupo,
            g.turno
        FROM Alumnos a
        JOIN Carreras c ON a.id_carrera = c.id_carrera
        JOIN Semestres s ON a.id_semestre = s.id_semestre
        JOIN Grupos g ON a.id_grupo = g.id_grupo
        WHERE a.id_alumno = ?
    `;
    return baseModel.query(sql, [id]).then(result => result[0]);
};

asistenciaDB.verificarMatriculaExistente = async (matricula, idAlumnoExcluir = null) => {
    let sql = 'SELECT COUNT(*) as count FROM Alumnos WHERE matricula = ?';
    const params = [matricula];
    
    if (idAlumnoExcluir) {
        sql += ' AND id_alumno != ?';
        params.push(idAlumnoExcluir);
    }
    
    const total = await baseModel.query(sql, params);
    return total[0].count > 0;
};

asistenciaDB.verificarAsistenciasAlumno = async (idAlumno) => {
    const total = await baseModel.countRelated('Asistencias', 'id_alumno', idAlumno);
    return total; // Retorna el número de asistencias
};

asistenciaDB.eliminarAsistenciasDeAlumno = async (idAlumno) => {
    const sql = `DELETE FROM Asistencias WHERE id_alumno = ?`;
    return await baseModel.query(sql, [idAlumno]);
};

// ========== FUNCIONES PARA HORARIOS ==========
asistenciaDB.insertarHorario = (horario) => baseModel.create('Horarios', horario);

asistenciaDB.obtenerHorarios = () => {
    const sql = `
        SELECT 
            id_horario,
            dia_semana,
            bloque,
            hora_inicio,
            hora_fin
        FROM Horarios
        ORDER BY FIELD(dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'), bloque
    `;
    return baseModel.query(sql);
};

asistenciaDB.obtenerHorarioPorId = (id) => baseModel.findById('Horarios', id, 'id_horario');

asistenciaDB.obtenerHorariosDisponibles = async (idGrupo, idMaestro) => {
    // Obtener todos los horarios
    const todosHorarios = await asistenciaDB.obtenerHorarios();
    
    // Obtener horarios ocupados por el GRUPO (un grupo no puede tener dos materias al mismo tiempo)
    const horariosGrupo = await baseModel.query(`
        SELECT DISTINCT h.id_horario
        FROM Asignaciones a
        JOIN Horarios h ON a.id_horario = h.id_horario
        WHERE a.id_grupo = ?
    `, [idGrupo]);
    
    // Obtener horarios ocupados por el MAESTRO (un maestro no puede estar en dos grupos al mismo tiempo)
    const horariosMaestro = await baseModel.query(`
        SELECT DISTINCT h.id_horario
        FROM Asignaciones a
        JOIN Horarios h ON a.id_horario = h.id_horario
        WHERE a.id_maestro = ?
    `, [idMaestro]);
    
    // IDs de horarios ocupados (grupo O maestro)
    const ocupados = new Set([
        ...horariosGrupo.map(h => h.id_horario),
        ...horariosMaestro.map(h => h.id_horario)
    ]);
    
    // Filtrar horarios disponibles (los que NO estén ocupados ni por el grupo ni por el maestro)
    const disponibles = todosHorarios.filter(h => !ocupados.has(h.id_horario));
    
    return disponibles;
};

// ========== FUNCIONES PARA ASIGNACIONES ==========
asistenciaDB.insertarAsignacion = (asignacion) => baseModel.create('Asignaciones', asignacion);

asistenciaDB.obtenerAsignaciones = () => {
    const sql = `
        SELECT 
            asig.id_asignacion,
            m.id_maestro,
            CONCAT_WS(' ', m.nombre_completo, COALESCE(m.apellido_paterno, ''), COALESCE(m.apellido_materno, '')) as nombre_maestro,
            mat.id_materia,
            mat.nombre_materia,
            mat.codigo_materia,
            g.id_grupo,
            g.nombre_grupo,
            g.id_semestre,
            s.numero_semestre,
            s.nombre_semestre,
            c.id_carrera,
            c.nombre_carrera,
            h.dia_semana,
            h.hora_inicio,
            h.hora_fin
        FROM Asignaciones asig
        JOIN Maestros m ON asig.id_maestro = m.id_maestro
        JOIN Materias mat ON asig.id_materia = mat.id_materia
        JOIN Grupos g ON asig.id_grupo = g.id_grupo
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        JOIN Horarios h ON asig.id_horario = h.id_horario
        ORDER BY c.nombre_carrera, s.numero_semestre, mat.nombre_materia
    `;
    return baseModel.query(sql);
};

asistenciaDB.obtenerAsignacionPorId = (id) => {
    const sql = `
        SELECT 
            asig.id_asignacion,
            m.id_maestro,
            CONCAT_WS(' ', m.nombre_completo, COALESCE(m.apellido_paterno, ''), COALESCE(m.apellido_materno, '')) as nombre_maestro,
            mat.id_materia,
            mat.nombre_materia,
            mat.codigo_materia,
            g.id_grupo,
            g.nombre_grupo,
            g.id_semestre,
            s.numero_semestre,
            s.nombre_semestre,
            c.id_carrera,
            c.nombre_carrera,
            h.id_horario,
            h.dia_semana,
            h.hora_inicio,
            h.hora_fin
        FROM Asignaciones asig
        JOIN Maestros m ON asig.id_maestro = m.id_maestro
        JOIN Materias mat ON asig.id_materia = mat.id_materia
        JOIN Grupos g ON asig.id_grupo = g.id_grupo
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        JOIN Horarios h ON asig.id_horario = h.id_horario
        WHERE asig.id_asignacion = ?
    `;
    return baseModel.query(sql, [id]).then(result => result[0]);
};

asistenciaDB.actualizarAsignacion = (id, asignacion) => baseModel.update('Asignaciones', id, asignacion, 'id_asignacion');

asistenciaDB.eliminarAsignacion = (id) => baseModel.delete('Asignaciones', id, 'id_asignacion');

asistenciaDB.verificarAsignacionExistente = async (idMaestro, idMateria, idGrupo, idHorario) => {
    const sql = 'SELECT COUNT(*) as count FROM Asignaciones WHERE id_maestro = ? AND id_materia = ? AND id_grupo = ? AND id_horario = ?';
    const resultado = await baseModel.query(sql, [idMaestro, idMateria, idGrupo, idHorario]);
    return resultado[0].count > 0;
};

asistenciaDB.verificarHorarioOcupado = async (idHorario, idGrupo, idMaestro) => {
    const sql = `
        SELECT COUNT(*) as count 
        FROM Asignaciones 
        WHERE id_horario = ? AND (id_grupo = ? OR id_maestro = ?)
    `;
    const resultado = await baseModel.query(sql, [idHorario, idGrupo, idMaestro]);
    return resultado[0].count > 0;
};

asistenciaDB.obtenerAsignacionesPorMaestro = (idMaestro) => {
    const sql = `
        SELECT 
            asig.id_asignacion,
            m.id_maestro,
            CONCAT_WS(' ', m.nombre_completo, COALESCE(m.apellido_paterno, ''), COALESCE(m.apellido_materno, '')) as nombre_maestro,
            mat.id_materia,
            mat.nombre_materia,
            mat.codigo_materia,
            g.id_grupo,
            g.nombre_grupo,
            g.id_semestre,
            s.numero_semestre,
            s.nombre_semestre,
            c.id_carrera,
            c.nombre_carrera,
            h.dia_semana,
            h.hora_inicio,
            h.hora_fin
        FROM Asignaciones asig
        JOIN Maestros m ON asig.id_maestro = m.id_maestro
        JOIN Materias mat ON asig.id_materia = mat.id_materia
        JOIN Grupos g ON asig.id_grupo = g.id_grupo
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        JOIN Horarios h ON asig.id_horario = h.id_horario
        WHERE asig.id_maestro = ?
        ORDER BY c.nombre_carrera, s.numero_semestre, mat.nombre_materia
    `;
    return baseModel.query(sql, [idMaestro]);
};

asistenciaDB.obtenerAsignacionesPorGrupo = (idGrupo) => {
    const sql = `
        SELECT 
            asig.id_asignacion,
            mat.nombre_materia,
            mat.codigo_materia,
            CONCAT_WS(' ', m.nombre_completo, COALESCE(m.apellido_paterno, ''), COALESCE(m.apellido_materno, '')) as nombre_maestro,
            h.dia_semana,
            h.hora_inicio,
            h.hora_fin
        FROM Asignaciones asig
        JOIN Materias mat ON asig.id_materia = mat.id_materia
        JOIN Maestros m ON asig.id_maestro = m.id_maestro
        JOIN Horarios h ON asig.id_horario = h.id_horario
        WHERE asig.id_grupo = ?
        ORDER BY FIELD(h.dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'), h.hora_inicio
    `;
    return baseModel.query(sql, [idGrupo]);
};

// ========== FUNCIONES PARA ASISTENCIAS ==========
asistenciaDB.registrarAsistencia = async (asistencia) => {
    const data = {
        id_alumno: asistencia.id_alumno,
        id_asignacion: asistencia.id_asignacion,
        fecha: asistencia.fecha,
        estado: asistencia.estado,
        hora_registro: asistencia.hora_registro || new Date().toTimeString().split(' ')[0],
        observaciones: asistencia.observaciones || null
    };
    
    try {
        return await baseModel.create('Asistencias', data);
    } catch (error) {
        // Si es un error de entrada duplicada, actualizar el registro existente
        if (error.code === 'ER_DUP_ENTRY') {
            // Buscar el registro existente para obtener su id_asistencia
            const sql = `
                SELECT id_asistencia 
                FROM Asistencias 
                WHERE id_alumno = ? AND id_asignacion = ? AND fecha = ?
            `;
            const resultados = await baseModel.query(sql, [data.id_alumno, data.id_asignacion, data.fecha]);
            
            if (resultados.length > 0) {
                const idAsistencia = resultados[0].id_asistencia;
                const updateData = {
                    estado: data.estado,
                    hora_registro: data.hora_registro,
                    observaciones: data.observaciones
                };
                return await baseModel.update('Asistencias', idAsistencia, updateData, 'id_asistencia');
            }
        }
        throw error;
    }
};

asistenciaDB.registrarAsistenciasMasivo = async (asistencias) => {
    const promesas = asistencias.map(asistencia => asistenciaDB.registrarAsistencia(asistencia));
    return Promise.all(promesas);
};

asistenciaDB.obtenerAsistencias = (filtros = {}) => {
    let conditions = ['1=1'];
    const params = [];
    
    if (filtros.id_grupo) {
        conditions.push('g.id_grupo = ?');
        params.push(filtros.id_grupo);
    }
    
    if (filtros.id_asignacion) {
        conditions.push('ast.id_asignacion = ?');
        params.push(filtros.id_asignacion);
    }
    
    if (filtros.fecha) {
        conditions.push('ast.fecha = ?');
        params.push(filtros.fecha);
    }
    
    if (filtros.id_alumno) {
        conditions.push('ast.id_alumno = ?');
        params.push(filtros.id_alumno);
    }
    
    const sql = `
        SELECT 
            ast.id_asistencia,
            ast.id_alumno,
            a.matricula,
            CONCAT_WS(' ', a.nombre_alumno, COALESCE(a.apellido_paterno, ''), COALESCE(a.apellido_materno, '')) as nombre_alumno,
            ast.id_asignacion,
            mat.id_materia,
            mat.nombre_materia,
            CONCAT_WS(' ', m.nombre_completo, COALESCE(m.apellido_paterno, ''), COALESCE(m.apellido_materno, '')) as nombre_maestro,
            ast.fecha,
            ast.estado,
            ast.hora_registro,
            ast.observaciones,
            g.nombre_grupo,
            c.nombre_carrera
        FROM Asistencias ast
        JOIN Alumnos a ON ast.id_alumno = a.id_alumno
        JOIN Asignaciones asig ON ast.id_asignacion = asig.id_asignacion
        JOIN Materias mat ON asig.id_materia = mat.id_materia
        JOIN Maestros m ON asig.id_maestro = m.id_maestro
        JOIN Grupos g ON a.id_grupo = g.id_grupo
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        WHERE ${conditions.join(' AND ')}
        ORDER BY ast.fecha DESC, a.nombre_alumno
    `;
    
    return baseModel.query(sql, params);
};

asistenciaDB.obtenerListaAlumnosParaAsistencia = async (idAsignacion) => {
    // Obtener información de la asignación
    const asignacion = await asistenciaDB.obtenerAsignacionPorId(idAsignacion);
    
    if (!asignacion) {
        return null;
    }
    
    // Obtener alumnos del grupo
    const alumnos = await asistenciaDB.obtenerAlumnosPorGrupo(asignacion.id_grupo);
    
    return {
        asignacion: {
            id_asignacion: asignacion.id_asignacion,
            nombre_materia: asignacion.nombre_materia,
            nombre_grupo: asignacion.nombre_grupo,
            dia_semana: asignacion.dia_semana,
            hora_inicio: asignacion.hora_inicio
        },
        alumnos: alumnos.map(a => ({
            id_alumno: a.id_alumno,
            matricula: a.matricula,
            nombre_completo: a.nombre_completo,
            foto_base64: a.foto_base64
        }))
    };
};

// ========== FUNCIONES PARA VISUALIZACIÓN DE DATOS ==========
asistenciaDB.obtenerEstructuraSistema = async (filtros = {}) => {
    let conditions = ['1=1'];
    const params = [];
    
    if (filtros.idCarrera) {
        conditions.push('c.id_carrera = ?');
        params.push(filtros.idCarrera);
    }
    
    if (filtros.idSemestre) {
        conditions.push('g.id_semestre = ?');
        params.push(filtros.idSemestre);
    }
    
    if (filtros.idGrupo) {
        conditions.push('g.id_grupo = ?');
        params.push(filtros.idGrupo);
    }
    
    const sql = `
        SELECT 
            c.id_carrera, c.nombre_carrera, c.codigo_carrera,
            g.id_grupo, g.nombre_grupo, g.id_semestre,
            s.numero_semestre, s.nombre_semestre,
            COUNT(a.id_alumno) as total_alumnos
        FROM Carreras c
        LEFT JOIN Grupos g ON c.id_carrera = g.id_carrera
        LEFT JOIN Semestres s ON g.id_semestre = s.id_semestre
        LEFT JOIN Alumnos a ON g.id_grupo = a.id_grupo
        WHERE ${conditions.join(' AND ')}
        GROUP BY c.id_carrera, g.id_grupo 
        ORDER BY c.nombre_carrera, s.numero_semestre, g.nombre_grupo
    `;
    
    const resultado = await baseModel.query(sql, params);
    return Array.isArray(resultado) ? resultado : [resultado].filter(Boolean);
};

// ========== FUNCIONES PARA ESTADÍSTICAS ==========
asistenciaDB.obtenerEstadisticasGrupo = async (idGrupo, fechaInicio, fechaFin) => {
    const sql = `
        SELECT 
            a.id_alumno,
            a.matricula,
            CONCAT_WS(' ', a.nombre_alumno, COALESCE(a.apellido_paterno, ''), COALESCE(a.apellido_materno, '')) as nombre,
            COUNT(CASE WHEN ast.estado = 'asistencia' THEN 1 END) as asistencias,
            COUNT(CASE WHEN ast.estado = 'falta' THEN 1 END) as faltas,
            COUNT(CASE WHEN ast.estado = 'justificante' THEN 1 END) as justificantes,
            COUNT(ast.id_asistencia) as total_clases,
            ROUND((COUNT(CASE WHEN ast.estado = 'asistencia' THEN 1 END) / COUNT(ast.id_asistencia)) * 100, 2) as porcentaje
        FROM Alumnos a
        LEFT JOIN Asistencias ast ON a.id_alumno = ast.id_alumno
        WHERE a.id_grupo = ?
        ${fechaInicio ? 'AND ast.fecha >= ?' : ''}
        ${fechaFin ? 'AND ast.fecha <= ?' : ''}
        GROUP BY a.id_alumno
        ORDER BY a.nombre_alumno, a.apellido_paterno
    `;
    
    const params = [idGrupo];
    if (fechaInicio) params.push(fechaInicio);
    if (fechaFin) params.push(fechaFin);
    
    return baseModel.query(sql, params);
};

// ========== FUNCIONES PARA USUARIOS DEL SISTEMA (ADMIN Y PREFECTOS) ==========
asistenciaDB.obtenerUsuarios = () => {
    const sql = `
        SELECT 
            id_maestro as id,
            nombre_completo as nombreCompleto,
            nombre_usuario,
            tipo_usuario
        FROM Maestros 
        WHERE tipo_usuario IN ('admin', 'prefecto')
        ORDER BY nombre_usuario
    `;
    return baseModel.query(sql);
};

asistenciaDB.obtenerUsuarioPorId = async (id) => {
    const sql = `
        SELECT 
            id_maestro as id,
            nombre_completo as nombreCompleto,
            nombre_usuario,
            tipo_usuario
        FROM Maestros 
        WHERE id_maestro = ?
    `;
    const resultado = await baseModel.query(sql, [id]);
    return resultado[0];
};

asistenciaDB.insertarUsuario = (usuario) => {
    // Si es admin y no tiene nombre completo, usar un nombre por defecto
    let nombreCompleto = usuario.nombreCompleto;
    if (!nombreCompleto && usuario.tipoUsuario === 'admin') {
        nombreCompleto = 'Administrador del Sistema';
    } else if (!nombreCompleto) {
        // Para maestros y prefectos el nombre completo es obligatorio
        // Si llega vacío, lanzar error
        throw new Error('El nombre completo es obligatorio');
    }
    
    return baseModel.create('Maestros', {
        nombre_completo: nombreCompleto,
        nombre_usuario: usuario.nombreUsuario,
        contrasena: usuario.contrasena,
        tipo_usuario: usuario.tipoUsuario
    });
};

asistenciaDB.actualizarUsuario = (id, usuario) => {
    // Si es admin y no tiene nombre completo, usar un nombre por defecto
    let nombreCompleto = usuario.nombreCompleto ? usuario.nombreCompleto.trim() : '';
    
    if (!nombreCompleto && usuario.tipoUsuario === 'admin') {
        nombreCompleto = 'Administrador del Sistema';
    } else if (!nombreCompleto && (usuario.tipoUsuario === 'maestro' || usuario.tipoUsuario === 'prefecto')) {
        // Para maestros y prefectos el nombre completo es obligatorio
        throw new Error('El nombre completo es obligatorio para maestros y prefectos');
    }
    
    const datosActualizar = {
        nombre_completo: nombreCompleto,
        nombre_usuario: usuario.nombreUsuario,
        tipo_usuario: usuario.tipoUsuario
    };
    
    // Solo actualizar contraseña si se proporcionó una nueva
    if (usuario.contrasena && usuario.contrasena.trim() !== '') {
        datosActualizar.contrasena = usuario.contrasena;
    }
    
    return baseModel.update('Maestros', id, datosActualizar, 'id_maestro');
};

asistenciaDB.eliminarUsuario = (id) => baseModel.delete('Maestros', id, 'id_maestro');

asistenciaDB.verificarRelacionesUsuario = async (idUsuario) => {
    // Verificar si el usuario tiene asignaciones activas
    const resultado = await baseModel.query('SELECT COUNT(*) as count FROM Asignaciones WHERE id_maestro = ?', [idUsuario]);
    return resultado[0].count > 0;
};

// ========== FUNCIONES PARA PORTAL DE PREFECTOS ==========

// Dashboard Principal - Métricas del día
asistenciaDB.obtenerMetricasDashboard = async (fecha = null) => {
    const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
    
    // Métricas básicas del día
    const sqlMetricas = `
        SELECT 
            (SELECT COUNT(*) FROM Alumnos WHERE activo = true) as total_alumnos,
            (SELECT COUNT(DISTINCT ast.id_alumno) 
             FROM Asistencias ast 
             WHERE ast.fecha = ? AND ast.estado = 'asistencia') as presentes_hoy,
            (SELECT COUNT(DISTINCT ast.id_alumno) 
             FROM Asistencias ast 
             WHERE ast.fecha = ? AND ast.estado = 'falta') as faltas_hoy,
            (SELECT COUNT(DISTINCT ast.id_alumno) 
             FROM Asistencias ast 
             WHERE ast.fecha = ? AND ast.estado = 'justificante') as justificantes_hoy
    `;
    
    const metricas = await baseModel.query(sqlMetricas, [fechaConsulta, fechaConsulta, fechaConsulta]);
    const resultado = metricas[0];
    
    // Calcular porcentajes
    resultado.porcentaje_asistencia = resultado.total_alumnos > 0 ? 
        ((resultado.presentes_hoy / resultado.total_alumnos) * 100).toFixed(1) : 0;
    resultado.porcentaje_faltas = resultado.total_alumnos > 0 ? 
        ((resultado.faltas_hoy / resultado.total_alumnos) * 100).toFixed(1) : 0;
    resultado.porcentaje_justificantes = resultado.total_alumnos > 0 ? 
        ((resultado.justificantes_hoy / resultado.total_alumnos) * 100).toFixed(1) : 0;
    
    return resultado;
};

// Dashboard - Tendencia de asistencia últimos 7 días
asistenciaDB.obtenerTendenciaAsistencia = async (dias = 7) => {
    const sql = `
        SELECT 
            ast.fecha,
            SUM(CASE WHEN ast.estado = 'asistencia' THEN 1 ELSE 0 END) as presentes,
            COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END) as total_registros,
            ROUND((SUM(CASE WHEN ast.estado = 'asistencia' THEN 1 ELSE 0 END) / 
                   GREATEST(COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END), 1)) * 100, 1) as porcentaje
        FROM Asistencias ast
        WHERE ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND ast.estado IN ('asistencia', 'falta')
        GROUP BY ast.fecha
        HAVING total_registros > 0
        ORDER BY ast.fecha DESC
        LIMIT ?
    `;
    
    return baseModel.query(sql, [dias, dias]);
};

// Dashboard - Top grupos con mejor/menor asistencia
asistenciaDB.obtenerRankingGrupos = async (limite = 5, periodo = 30) => {
    const sql = `
        SELECT 
            g.id_grupo,
            g.nombre_grupo,
            c.codigo_carrera,
            s.numero_semestre,
            CONCAT(s.numero_semestre, g.nombre_grupo, ' ', c.codigo_carrera) as grupo_completo,
            SUM(CASE WHEN ast.estado = 'asistencia' THEN 1 ELSE 0 END) as total_asistencias,
            COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END) as total_registros,
            ROUND((SUM(CASE WHEN ast.estado = 'asistencia' THEN 1 ELSE 0 END) / 
                   GREATEST(COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END), 1)) * 100, 1) as porcentaje_asistencia
        FROM Grupos g
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        LEFT JOIN Alumnos a ON g.id_grupo = a.id_grupo
        LEFT JOIN Asistencias ast ON a.id_alumno = ast.id_alumno 
            AND ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND ast.estado IN ('asistencia', 'falta')
        GROUP BY g.id_grupo, g.nombre_grupo, c.codigo_carrera, s.numero_semestre
        HAVING total_registros > 0
        ORDER BY porcentaje_asistencia DESC
        LIMIT ?
    `;
    
    const mejores = await baseModel.query(sql, [periodo, limite]);
    
    const sqlPeores = sql.replace('ORDER BY porcentaje_asistencia DESC', 'ORDER BY porcentaje_asistencia ASC');
    const peores = await baseModel.query(sqlPeores, [periodo, limite]);
    
    return { mejores, peores };
};

// Dashboard - Estadísticas adicionales (grupos por categoría)
asistenciaDB.obtenerEstadisticasGrupos = async (periodo = 30) => {
    // Grupos excelentes (>= 90% asistencia)
    const sqlExcelentes = `
        SELECT COUNT(*) as count
        FROM (
            SELECT 
                g.id_grupo,
                COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END) as total_registros,
                ROUND((SUM(CASE WHEN ast.estado = 'asistencia' THEN 1 ELSE 0 END) / 
                       GREATEST(COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END), 1)) * 100, 2) as porcentaje
        FROM Grupos g
            JOIN Alumnos a ON g.id_grupo = a.id_grupo
        LEFT JOIN Asistencias ast ON a.id_alumno = ast.id_alumno 
            AND ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                AND ast.estado IN ('asistencia', 'falta')
        GROUP BY g.id_grupo
            HAVING total_registros > 0 AND porcentaje >= 90
        ) AS grupos_excelentes
    `;
    
    // Grupos críticos (< 70% asistencia)
    const sqlCriticos = `
        SELECT COUNT(*) as count
        FROM (
            SELECT 
                g.id_grupo,
                COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END) as total_registros,
                ROUND((SUM(CASE WHEN ast.estado = 'asistencia' THEN 1 ELSE 0 END) / 
                       GREATEST(COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END), 1)) * 100, 2) as porcentaje
        FROM Grupos g
            JOIN Alumnos a ON g.id_grupo = a.id_grupo
        LEFT JOIN Asistencias ast ON a.id_alumno = ast.id_alumno 
            AND ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                AND ast.estado IN ('asistencia', 'falta')
        GROUP BY g.id_grupo
            HAVING total_registros > 0 AND porcentaje < 70
        ) AS grupos_criticos
    `;
    
    // Promedio semanal general
    const sqlPromedio = `
        SELECT ROUND(
            (SUM(CASE WHEN ast.estado = 'asistencia' THEN 1 ELSE 0 END) / 
             GREATEST(COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END), 1)) * 100, 1
        ) as promedio
        FROM Asistencias ast
        WHERE ast.fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND ast.estado IN ('asistencia', 'falta')
    `;
    
    const [excelentes, criticos, promedio] = await Promise.all([
        baseModel.query(sqlExcelentes, [periodo]),
        baseModel.query(sqlCriticos, [periodo]),
        baseModel.query(sqlPromedio)
    ]);
    
    return {
        grupos_excelentes: excelentes[0]?.count || 0, // Cantidad de grupos con >= 90%
        grupos_criticos: criticos[0]?.count || 0,     // Cantidad de grupos con < 70%
        promedio_semanal: promedio[0]?.promedio || 0
    };
};

// Dashboard - Alertas importantes
asistenciaDB.obtenerAlertas = async () => {
    // Alumnos con más de 5 faltas esta semana
    const sqlAlumnosFaltas = `
        SELECT COUNT(DISTINCT ast.id_alumno) as count
        FROM Asistencias ast
        WHERE ast.fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND ast.estado = 'falta'
        GROUP BY ast.id_alumno
        HAVING COUNT(*) >= 5
    `;
    
    // Maestros sin registrar asistencia hoy
    const sqlMaestrosSinRegistro = `
        SELECT COUNT(DISTINCT asig.id_maestro) as count
        FROM Asignaciones asig
        JOIN Horarios h ON asig.id_horario = h.id_horario
        LEFT JOIN Asistencias ast ON asig.id_asignacion = ast.id_asignacion 
            AND ast.fecha = CURDATE()
        WHERE h.dia_semana = CASE DAYOFWEEK(CURDATE())
            WHEN 1 THEN 'Domingo'
            WHEN 2 THEN 'Lunes'
            WHEN 3 THEN 'Martes'
            WHEN 4 THEN 'Miércoles'
            WHEN 5 THEN 'Jueves'
            WHEN 6 THEN 'Viernes'
            WHEN 7 THEN 'Sábado'
        END
        AND ast.id_asistencia IS NULL
    `;
    
    // Grupos con 100% asistencia hoy
    const sqlGrupos100 = `
        SELECT COUNT(*) as count
        FROM (
            SELECT 
                g.id_grupo,
                COUNT(DISTINCT a.id_alumno) as total_alumnos,
                COUNT(DISTINCT CASE WHEN ast.estado = 'asistencia' THEN a.id_alumno END) as alumnos_presentes,
                COUNT(DISTINCT CASE WHEN ast.estado IN ('asistencia', 'falta') THEN a.id_alumno END) as alumnos_con_registro
            FROM Grupos g
            JOIN Alumnos a ON g.id_grupo = a.id_grupo AND a.activo = true
            LEFT JOIN Asistencias ast ON a.id_alumno = ast.id_alumno 
                AND ast.fecha = CURDATE()
                AND ast.estado IN ('asistencia', 'falta')
            GROUP BY g.id_grupo
            HAVING alumnos_con_registro > 0 
                AND alumnos_presentes = alumnos_con_registro
                AND alumnos_con_registro = total_alumnos
        ) as grupos_perfectos
    `;
    
    const [alumnosFaltas, maestrosSinRegistro, grupos100] = await Promise.all([
        baseModel.query(sqlAlumnosFaltas),
        baseModel.query(sqlMaestrosSinRegistro),
        baseModel.query(sqlGrupos100)
    ]);
    
    return {
        alumnos_problemas: alumnosFaltas.length,
        maestros_sin_registro: maestrosSinRegistro[0]?.count || 0,
        grupos_perfectos: grupos100[0]?.count || 0
    };
};

// Alumnos Problemáticos - Lista con filtros
asistenciaDB.obtenerAlumnosProblematicos = async (filtros = {}) => {
    const periodo = parseInt(filtros.periodo) || 7; // días
    const minimo_faltas = parseInt(filtros.minimo_faltas) || 1;
    
    // IMPORTANTE: El orden de los parámetros debe coincidir con el orden en el SQL
    // 1. periodo (para INTERVAL ? DAY)
    // 2. Filtros del WHERE (carrera, semestre, grupo)
    // 3. minimo_faltas (para HAVING)
    
    const params = [periodo]; // Primero el período para el INTERVAL
    let conditions = ['1=1'];
    
    // Convertir strings a números para asegurar comparación correcta
    if (filtros.id_carrera) {
        conditions.push('a.id_carrera = ?');
        params.push(parseInt(filtros.id_carrera));
    }
    
    if (filtros.id_semestre) {
        conditions.push('a.id_semestre = ?');
        params.push(parseInt(filtros.id_semestre));
    }
    
    if (filtros.id_grupo) {
        conditions.push('a.id_grupo = ?');
        params.push(parseInt(filtros.id_grupo));
    }
    
    const sql = `
        SELECT 
            a.id_alumno,
            a.matricula,
            CONCAT_WS(' ', a.nombre_alumno, COALESCE(a.apellido_paterno, ''), COALESCE(a.apellido_materno, '')) as nombre_completo,
            g.nombre_grupo,
            s.numero_semestre,
            c.codigo_carrera,
            COUNT(CASE WHEN ast.estado = 'asistencia' THEN 1 END) as total_asistencias,
            COUNT(CASE WHEN ast.estado = 'falta' THEN 1 END) as total_faltas,
            COUNT(CASE WHEN ast.estado = 'justificante' THEN 1 END) as total_justificantes,
            COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END) as total_clases,
            ROUND((COUNT(CASE WHEN ast.estado = 'asistencia' THEN 1 END) / 
                   GREATEST(COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END), 1)) * 100, 1) as porcentaje_asistencia
        FROM Alumnos a
        JOIN Grupos g ON a.id_grupo = g.id_grupo
        JOIN Semestres s ON a.id_semestre = s.id_semestre
        JOIN Carreras c ON a.id_carrera = c.id_carrera
        LEFT JOIN Asistencias ast ON a.id_alumno = ast.id_alumno 
            AND ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        WHERE ${conditions.join(' AND ')} AND a.activo = true
        GROUP BY a.id_alumno
        HAVING total_faltas >= ?
        ORDER BY porcentaje_asistencia ASC, total_faltas DESC
    `;
    
    // Agregar minimo_faltas al final
    params.push(minimo_faltas);
    
    return baseModel.query(sql, params);
};

// Detalle de Alumno - Historial completo
asistenciaDB.obtenerDetalleAlumno = async (idAlumno, periodo = 30) => {
    // Información básica del alumno
    const alumno = await asistenciaDB.obtenerAlumnoPorId(idAlumno);
    if (!alumno) return null;
    
    // Estadísticas generales
    const sqlEstadisticas = `
        SELECT 
            COUNT(CASE WHEN estado = 'asistencia' THEN 1 END) as total_asistencias,
            COUNT(CASE WHEN estado = 'falta' THEN 1 END) as total_faltas,
            COUNT(CASE WHEN estado = 'justificante' THEN 1 END) as total_justificantes,
            COUNT(CASE WHEN estado IN ('asistencia', 'falta') THEN 1 END) as total_clases,
            ROUND((COUNT(CASE WHEN estado = 'asistencia' THEN 1 END) / 
                   GREATEST(COUNT(CASE WHEN estado IN ('asistencia', 'falta') THEN 1 END), 1)) * 100, 1) as porcentaje_global
        FROM Asistencias
        WHERE id_alumno = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `;
    
    // Asistencia por materia
    const sqlPorMateria = `
        SELECT 
            m.nombre_materia,
            COUNT(CASE WHEN ast.estado = 'asistencia' THEN 1 END) as asistencias,
            COUNT(CASE WHEN ast.estado = 'falta' THEN 1 END) as faltas,
            COUNT(CASE WHEN ast.estado = 'justificante' THEN 1 END) as justificantes,
            ROUND((COUNT(CASE WHEN ast.estado = 'asistencia' THEN 1 END) / 
                   GREATEST(COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END), 1)) * 100, 1) as porcentaje
        FROM Asistencias ast
        JOIN Asignaciones asig ON ast.id_asignacion = asig.id_asignacion
        JOIN Materias m ON asig.id_materia = m.id_materia
        WHERE ast.id_alumno = ? AND ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY m.id_materia
        ORDER BY porcentaje ASC
    `;
    
    // Historial detallado
    const sqlHistorial = `
        SELECT 
            ast.fecha,
            m.nombre_materia,
            ast.estado,
            ast.observaciones,
            CONCAT_WS(' ', mae.nombre_completo, COALESCE(mae.apellido_paterno, '')) as nombre_maestro
        FROM Asistencias ast
        JOIN Asignaciones asig ON ast.id_asignacion = asig.id_asignacion
        JOIN Materias m ON asig.id_materia = m.id_materia
        JOIN Maestros mae ON asig.id_maestro = mae.id_maestro
        WHERE ast.id_alumno = ? AND ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY ast.fecha DESC, m.nombre_materia
        LIMIT 50
    `;
    
    const [estadisticas, porMateria, historial] = await Promise.all([
        baseModel.query(sqlEstadisticas, [idAlumno, periodo]),
        baseModel.query(sqlPorMateria, [idAlumno, periodo]),
        baseModel.query(sqlHistorial, [idAlumno, periodo])
    ]);
    
    return {
        alumno,
        estadisticas: estadisticas[0] || {},
        por_materia: porMateria,
        historial: historial
    };
};

// Control de Maestros - Clases sin registrar
asistenciaDB.obtenerClasesSinRegistrar = async (fecha = null) => {
    const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
    const diaSemana = new Date(fechaConsulta).toLocaleDateString('es-ES', { weekday: 'long' });
    const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    
    // Clases programadas sin registro
    const sqlSinRegistro = `
        SELECT 
            asig.id_asignacion,
            CONCAT_WS(' ', m.nombre_completo, COALESCE(m.apellido_paterno, '')) as nombre_maestro,
            m.id_maestro,
            mat.nombre_materia,
            g.nombre_grupo,
            CONCAT(s.numero_semestre, g.nombre_grupo, ' ', c.codigo_carrera) as grupo_completo,
            h.hora_inicio,
            h.hora_fin,
            h.dia_semana,
            CASE 
                WHEN TIME(NOW()) > h.hora_fin THEN 'Pasada'
                WHEN TIME(NOW()) BETWEEN h.hora_inicio AND h.hora_fin THEN 'En curso'
                ELSE 'Futura'
            END as estado_horario
        FROM Asignaciones asig
        JOIN Maestros m ON asig.id_maestro = m.id_maestro
        JOIN Materias mat ON asig.id_materia = mat.id_materia
        JOIN Grupos g ON asig.id_grupo = g.id_grupo
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Horarios h ON asig.id_horario = h.id_horario
        LEFT JOIN Asistencias ast ON asig.id_asignacion = ast.id_asignacion 
            AND ast.fecha = ?
        WHERE h.dia_semana = ? AND ast.id_asistencia IS NULL
        ORDER BY h.hora_inicio
    `;
    
    // Clases con registro completo - incluye validación de hora
    const sqlConRegistro = `
        SELECT 
            CONCAT_WS(' ', m.nombre_completo, COALESCE(m.apellido_paterno, '')) as nombre_maestro,
            mat.nombre_materia,
            CONCAT(s.numero_semestre, g.nombre_grupo, ' ', c.codigo_carrera) as grupo_completo,
            h.hora_inicio,
            h.hora_fin,
            MIN(ast.hora_registro) as hora_registro,
            CASE 
                -- Validar si registró dentro del horario o con tolerancia
                WHEN MIN(TIME(ast.hora_registro)) <= ADDTIME(h.hora_inicio, '00:15:00') THEN 'A tiempo'
                WHEN MIN(TIME(ast.hora_registro)) <= ADDTIME(h.hora_fin, '02:00:00') THEN 'Tarde'
                ELSE 'Muy tarde'
            END as estado_registro,
            CASE 
                WHEN MIN(TIME(ast.hora_registro)) <= ADDTIME(h.hora_inicio, '00:15:00') THEN '🟢'
                WHEN MIN(TIME(ast.hora_registro)) <= ADDTIME(h.hora_fin, '02:00:00') THEN '🟡'
                ELSE '🟠'
            END as icono_estado
        FROM Asistencias ast
        JOIN Asignaciones asig ON ast.id_asignacion = asig.id_asignacion
        JOIN Maestros m ON asig.id_maestro = m.id_maestro
        JOIN Materias mat ON asig.id_materia = mat.id_materia
        JOIN Grupos g ON asig.id_grupo = g.id_grupo
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Horarios h ON asig.id_horario = h.id_horario
        WHERE ast.fecha = ?
        GROUP BY asig.id_asignacion
        ORDER BY hora_registro
    `;
    
    const [sinRegistro, conRegistro] = await Promise.all([
        baseModel.query(sqlSinRegistro, [fechaConsulta, diaSemanaCapitalizado]),
        baseModel.query(sqlConRegistro, [fechaConsulta])
    ]);
    
    return {
        sin_registro: sinRegistro,
        con_registro: conRegistro,
        resumen: {
            total_programadas: sinRegistro.length + conRegistro.length,
            registradas: conRegistro.length,
            sin_registrar: sinRegistro.length,
            porcentaje_cumplimiento: sinRegistro.length + conRegistro.length > 0 ? 
                ((conRegistro.length / (sinRegistro.length + conRegistro.length)) * 100).toFixed(1) : 100
        }
    };
};

// Detalle de Maestro - Desempeño de registro
asistenciaDB.obtenerDetalleMaestro = async (idMaestro, periodo = 30) => {
    // Información básica del maestro
    const maestro = await asistenciaDB.obtenerMaestroPorId(idMaestro);
    if (!maestro) return null;
    
    // Estadísticas de registro - Cuenta clases por asignación desde su fecha de creación
    const sqlEstadisticas = `
        SELECT 
            -- Clases programadas = suma de semanas desde la fecha de asignación de cada asignación
            SUM(
                CASE 
                    WHEN DATE(asig.fecha_asignacion) > DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN
                        -- Si la asignación es reciente, calcular desde su fecha de creación
                        FLOOR(DATEDIFF(CURDATE(), DATE(asig.fecha_asignacion)) / 7)
                    ELSE
                        -- Si la asignación es antigua, usar el período completo
                        FLOOR(? / 7)
                END
            ) as clases_programadas,
            -- Clases registradas = combinaciones únicas de fecha + asignación
            COUNT(DISTINCT CASE WHEN ast.id_asistencia IS NOT NULL 
                THEN CONCAT(ast.fecha, '-', ast.id_asignacion) 
                ELSE NULL END) as clases_registradas,
            -- Clases sin registro
            SUM(
                CASE 
                    WHEN DATE(asig.fecha_asignacion) > DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN
                        FLOOR(DATEDIFF(CURDATE(), DATE(asig.fecha_asignacion)) / 7)
                    ELSE
                        FLOOR(? / 7)
                END
            ) - 
            COUNT(DISTINCT CASE WHEN ast.id_asistencia IS NOT NULL 
                THEN CONCAT(ast.fecha, '-', ast.id_asignacion) 
                ELSE NULL END) as clases_sin_registro,
            -- Porcentaje de cumplimiento
            ROUND((COUNT(DISTINCT CASE WHEN ast.id_asistencia IS NOT NULL 
                THEN CONCAT(ast.fecha, '-', ast.id_asignacion) 
                ELSE NULL END) / 
                   GREATEST(SUM(
                        CASE 
                            WHEN DATE(asig.fecha_asignacion) > DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN
                                FLOOR(DATEDIFF(CURDATE(), DATE(asig.fecha_asignacion)) / 7)
                            ELSE
                                FLOOR(? / 7)
                        END
                   ), 1)) * 100, 1) as porcentaje_cumplimiento
        FROM Asignaciones asig
        JOIN Horarios h ON asig.id_horario = h.id_horario
        LEFT JOIN Asistencias ast ON asig.id_asignacion = ast.id_asignacion 
            AND ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND ast.fecha >= DATE(asig.fecha_asignacion)
        WHERE asig.id_maestro = ?
    `;
    
    // Materias y grupos asignados con estadísticas
    const sqlMaterias = `
        SELECT 
            asig.id_asignacion,
            mat.nombre_materia,
            CONCAT(s.numero_semestre, g.nombre_grupo, ' ', c.codigo_carrera) as grupo_completo,
            h.dia_semana,
            h.hora_inicio,
            -- Contar registros para esta asignación específica
            COUNT(DISTINCT CASE WHEN ast.id_asistencia IS NOT NULL 
                THEN ast.fecha 
                ELSE NULL END) as registros,
            -- Clases programadas = semanas desde la fecha de asignación
            CASE 
                WHEN DATE(asig.fecha_asignacion) > DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN
                    FLOOR(DATEDIFF(CURDATE(), DATE(asig.fecha_asignacion)) / 7)
                ELSE
                    FLOOR(? / 7)
            END as clases_programadas,
            ROUND((COUNT(DISTINCT CASE WHEN ast.id_asistencia IS NOT NULL 
                THEN ast.fecha 
                ELSE NULL END) / GREATEST(
                    CASE 
                        WHEN DATE(asig.fecha_asignacion) > DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN
                            FLOOR(DATEDIFF(CURDATE(), DATE(asig.fecha_asignacion)) / 7)
                        ELSE
                            FLOOR(? / 7)
                    END
                , 1)) * 100, 1) as porcentaje_registro
        FROM Asignaciones asig
        JOIN Materias mat ON asig.id_materia = mat.id_materia
        JOIN Grupos g ON asig.id_grupo = g.id_grupo
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Horarios h ON asig.id_horario = h.id_horario
        LEFT JOIN Asistencias ast ON asig.id_asignacion = ast.id_asignacion 
            AND ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND ast.fecha >= DATE(asig.fecha_asignacion)
        WHERE asig.id_maestro = ?
        GROUP BY asig.id_asignacion, mat.nombre_materia, grupo_completo, h.dia_semana, h.hora_inicio
        ORDER BY porcentaje_registro ASC
    `;
    
    // Historial de registros faltantes (últimos 7 días para evitar mostrar fechas anteriores a la asignación)
    const sqlHistorialFaltantes = `
        SELECT 
            DATE(CURDATE() - INTERVAL seq.seq DAY) as fecha,
            mat.nombre_materia,
            CONCAT(s.numero_semestre, g.nombre_grupo, ' ', c.codigo_carrera) as grupo_completo,
            h.hora_inicio,
            h.dia_semana
        FROM (
            SELECT 0 as seq UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 
            UNION ALL SELECT 5 UNION ALL SELECT 6
        ) seq
        JOIN Asignaciones asig ON asig.id_maestro = ?
        JOIN Materias mat ON asig.id_materia = mat.id_materia
        JOIN Grupos g ON asig.id_grupo = g.id_grupo
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Horarios h ON asig.id_horario = h.id_horario
        LEFT JOIN Asistencias ast ON asig.id_asignacion = ast.id_asignacion 
            AND ast.fecha = DATE(CURDATE() - INTERVAL seq.seq DAY)
        WHERE h.dia_semana = CASE DAYOFWEEK(CURDATE() - INTERVAL seq.seq DAY)
            WHEN 1 THEN 'Domingo'
            WHEN 2 THEN 'Lunes'
            WHEN 3 THEN 'Martes'
            WHEN 4 THEN 'Miércoles'
            WHEN 5 THEN 'Jueves'
            WHEN 6 THEN 'Viernes'
            WHEN 7 THEN 'Sábado'
        END
            AND DATE(CURDATE() - INTERVAL seq.seq DAY) < CURDATE()  -- Solo fechas pasadas, no hoy ni futuras
            AND DATE(CURDATE() - INTERVAL seq.seq DAY) >= DATE(asig.fecha_asignacion)  -- No mostrar fechas anteriores a la asignación
            AND ast.id_asistencia IS NULL
        ORDER BY fecha DESC
        LIMIT 10
    `;
    
    const [estadisticas, materias, historialFaltantes] = await Promise.all([
        baseModel.query(sqlEstadisticas, [periodo, periodo, periodo, periodo, periodo, periodo, periodo, idMaestro]),
        baseModel.query(sqlMaterias, [periodo, periodo, periodo, periodo, periodo, idMaestro]),
        baseModel.query(sqlHistorialFaltantes, [idMaestro])
    ]);
    
    return {
        maestro,
        estadisticas: estadisticas[0] || {},
        materias: materias,
        historial_faltantes: historialFaltantes
    };
};

// Maestros con problemas recurrentes
asistenciaDB.obtenerMaestrosProblematicos = async (periodo = 30, umbralCumplimiento = 80) => {
    const sql = `
        SELECT 
            m.id_maestro,
            CONCAT_WS(' ', m.nombre_completo, COALESCE(m.apellido_paterno, '')) as nombre_maestro,
            m.nombre_usuario,
            -- Calcular días desde que existe la asignación o desde el inicio del período
            -- Lo que sea más reciente
            SUM(
                CASE 
                    WHEN DATE(asig.fecha_asignacion) > DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN
                        -- Si la asignación es reciente, calcular desde su fecha de creación
                        FLOOR(DATEDIFF(CURDATE(), DATE(asig.fecha_asignacion)) / 7)
                    ELSE
                        -- Si la asignación es antigua, usar el período completo
                        FLOOR(? / 7)
                END
            ) as clases_programadas,
            -- Clases registradas = combinaciones únicas de fecha + asignación
            COUNT(DISTINCT CASE WHEN ast.id_asistencia IS NOT NULL 
                THEN CONCAT(ast.fecha, '-', ast.id_asignacion) 
                ELSE NULL END) as clases_registradas,
            -- Clases sin registro
            SUM(
                CASE 
                    WHEN DATE(asig.fecha_asignacion) > DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN
                        FLOOR(DATEDIFF(CURDATE(), DATE(asig.fecha_asignacion)) / 7)
                    ELSE
                        FLOOR(? / 7)
                END
            ) - 
            COUNT(DISTINCT CASE WHEN ast.id_asistencia IS NOT NULL 
                THEN CONCAT(ast.fecha, '-', ast.id_asignacion) 
                ELSE NULL END) as clases_sin_registro,
            -- Porcentaje de cumplimiento
            ROUND((COUNT(DISTINCT CASE WHEN ast.id_asistencia IS NOT NULL 
                THEN CONCAT(ast.fecha, '-', ast.id_asignacion) 
                ELSE NULL END) / 
                   GREATEST(SUM(
                        CASE 
                            WHEN DATE(asig.fecha_asignacion) > DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN
                                FLOOR(DATEDIFF(CURDATE(), DATE(asig.fecha_asignacion)) / 7)
                            ELSE
                                FLOOR(? / 7)
                        END
                   ), 1)) * 100, 1) as porcentaje_cumplimiento
        FROM Maestros m
        JOIN Asignaciones asig ON m.id_maestro = asig.id_maestro
        JOIN Horarios h ON asig.id_horario = h.id_horario
        LEFT JOIN Asistencias ast ON asig.id_asignacion = ast.id_asignacion 
            AND ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND ast.fecha >= DATE(asig.fecha_asignacion)
        WHERE m.tipo_usuario = 'maestro' AND m.activo = true
        GROUP BY m.id_maestro
        HAVING porcentaje_cumplimiento < ?
        ORDER BY porcentaje_cumplimiento ASC
    `;
    
    return baseModel.query(sql, [periodo, periodo, periodo, periodo, periodo, periodo, periodo, umbralCumplimiento]);
};

// Obtener grupos con asistencia excelente (≥90%)
asistenciaDB.obtenerGruposExcelentes = async (periodo = 30) => {
    const sql = `
        SELECT 
            g.id_grupo,
            CONCAT(s.numero_semestre, g.nombre_grupo, ' - ', c.nombre_carrera) as grupo_completo,
            CONCAT(s.numero_semestre, g.nombre_grupo) as nombre_grupo,
            c.codigo_carrera,
            g.turno,
            COUNT(DISTINCT a.id_alumno) as total_alumnos,
            SUM(CASE WHEN ast.estado = 'asistencia' THEN 1 ELSE 0 END) as presentes,
            SUM(CASE WHEN ast.estado = 'falta' THEN 1 ELSE 0 END) as faltas,
            COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END) as total_registros,
            ROUND((SUM(CASE WHEN ast.estado = 'asistencia' THEN 1 ELSE 0 END) / 
                   GREATEST(COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END), 1)) * 100, 2) as porcentaje_asistencia
        FROM Grupos g
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        JOIN Alumnos a ON g.id_grupo = a.id_grupo
        LEFT JOIN Asistencias ast ON a.id_alumno = ast.id_alumno
            AND ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND ast.estado IN ('asistencia', 'falta')
        GROUP BY g.id_grupo, g.nombre_grupo, c.nombre_carrera, c.codigo_carrera, s.numero_semestre, g.turno
        HAVING total_registros > 0 AND porcentaje_asistencia >= 90
        ORDER BY porcentaje_asistencia DESC, g.nombre_grupo
    `;
    
    return baseModel.query(sql, [periodo]);
};

// Obtener grupos con asistencia crítica (<70%)
asistenciaDB.obtenerGruposCriticos = async (periodo = 30) => {
    const sql = `
        SELECT 
            g.id_grupo,
            CONCAT(s.numero_semestre, g.nombre_grupo, ' - ', c.nombre_carrera) as grupo_completo,
            CONCAT(s.numero_semestre, g.nombre_grupo) as nombre_grupo,
            c.codigo_carrera,
            g.turno,
            COUNT(DISTINCT a.id_alumno) as total_alumnos,
            SUM(CASE WHEN ast.estado = 'asistencia' THEN 1 ELSE 0 END) as presentes,
            SUM(CASE WHEN ast.estado = 'falta' THEN 1 ELSE 0 END) as faltas,
            COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END) as total_registros,
            ROUND((SUM(CASE WHEN ast.estado = 'asistencia' THEN 1 ELSE 0 END) / 
                   GREATEST(COUNT(CASE WHEN ast.estado IN ('asistencia', 'falta') THEN 1 END), 1)) * 100, 2) as porcentaje_asistencia
        FROM Grupos g
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        JOIN Alumnos a ON g.id_grupo = a.id_grupo
        LEFT JOIN Asistencias ast ON a.id_alumno = ast.id_alumno
            AND ast.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            AND ast.estado IN ('asistencia', 'falta')
        GROUP BY g.id_grupo, g.nombre_grupo, c.nombre_carrera, c.codigo_carrera, s.numero_semestre, g.turno
        HAVING total_registros > 0 AND porcentaje_asistencia < 70
        ORDER BY porcentaje_asistencia ASC, g.nombre_grupo
    `;
    
    return baseModel.query(sql, [periodo]);
};

// Histórico de registros de maestros
asistenciaDB.obtenerHistoricoRegistrosMaestros = async (filtros = {}) => {
    const {
        fechaDesde = null,
        fechaHasta = null,
        idMaestro = null,
        idCarrera = null,
        idSemestre = null,
        idGrupo = null
    } = filtros;
    
    // Establecer fechas por defecto (últimos 30 días)
    const fechaInicio = fechaDesde || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fechaFin = fechaHasta || new Date().toISOString().split('T')[0];
    
    let sql = `
        SELECT 
            ast.fecha,
            CONCAT_WS(' ', m.nombre_completo, COALESCE(m.apellido_paterno, '')) as nombre_maestro,
            m.id_maestro,
            mat.nombre_materia,
            CONCAT(s.numero_semestre, g.nombre_grupo, ' ', c.codigo_carrera) as grupo_completo,
            g.id_grupo,
            g.turno,
            h.hora_inicio,
            h.hora_fin,
            ast.hora_registro,
            CASE 
                WHEN ast.hora_registro IS NULL THEN 'Sin registro'
                WHEN TIME(ast.hora_registro) <= ADDTIME(h.hora_inicio, '00:15:00') THEN 'A tiempo'
                ELSE 'Tarde'
            END as estado_registro,
            COUNT(DISTINCT a.id_alumno) as total_alumnos,
            SUM(CASE WHEN ast2.estado = 'asistencia' THEN 1 ELSE 0 END) as alumnos_presentes,
            SUM(CASE WHEN ast2.estado = 'falta' THEN 1 ELSE 0 END) as alumnos_faltantes
        FROM Asignaciones asig
        JOIN Maestros m ON asig.id_maestro = m.id_maestro
        JOIN Materias mat ON asig.id_materia = mat.id_materia
        JOIN Grupos g ON asig.id_grupo = g.id_grupo
        JOIN Semestres s ON g.id_semestre = s.id_semestre
        JOIN Carreras c ON g.id_carrera = c.id_carrera
        JOIN Horarios h ON asig.id_horario = h.id_horario
        LEFT JOIN Alumnos a ON g.id_grupo = a.id_grupo
        LEFT JOIN (
            SELECT DISTINCT fecha, id_asignacion, MIN(hora_registro) as hora_registro 
            FROM Asistencias 
            GROUP BY fecha, id_asignacion
        ) ast ON asig.id_asignacion = ast.id_asignacion
        LEFT JOIN Asistencias ast2 ON a.id_alumno = ast2.id_alumno 
            AND ast2.fecha = ast.fecha 
            AND ast2.id_asignacion = asig.id_asignacion
        WHERE 1=1
    `;
    
    const params = [];
    
    // Aplicar filtros
    if (fechaInicio && fechaFin) {
        sql += ` AND ast.fecha BETWEEN ? AND ?`;
        params.push(fechaInicio, fechaFin);
    }
    
    if (idMaestro) {
        sql += ` AND m.id_maestro = ?`;
        params.push(idMaestro);
    }
    
    if (idCarrera) {
        sql += ` AND c.id_carrera = ?`;
        params.push(idCarrera);
    }
    
    if (idSemestre) {
        sql += ` AND s.id_semestre = ?`;
        params.push(idSemestre);
    }
    
    if (idGrupo) {
        sql += ` AND g.id_grupo = ?`;
        params.push(idGrupo);
    }
    
    sql += `
        GROUP BY ast.fecha, asig.id_asignacion, m.id_maestro, mat.nombre_materia, 
                 g.id_grupo, s.numero_semestre, c.codigo_carrera, h.hora_inicio, 
                 h.hora_fin, ast.hora_registro, g.turno
        ORDER BY ast.fecha DESC, h.hora_inicio
    `;
    
    const registros = await baseModel.query(sql, params);
    
    // Calcular estadísticas del período
    const totalRegistros = registros.length;
    const registrosCompletos = registros.filter(r => r.hora_registro !== null).length;
    const registrosFaltantes = totalRegistros - registrosCompletos;
    const porcentajeCumplimiento = totalRegistros > 0 ? 
        ((registrosCompletos / totalRegistros) * 100).toFixed(1) : 100;
    
    return {
        registros,
        resumen: {
            total_registros: totalRegistros,
            registros_completos: registrosCompletos,
            registros_faltantes: registrosFaltantes,
            porcentaje_cumplimiento: porcentajeCumplimiento,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin
        }
    };
};

// ========== GESTIÓN DE ATENCIONES A ALUMNOS ==========

// Registrar atención a un alumno
asistenciaDB.registrarAtencionAlumno = async (idAlumno, idPrefecto, notas = null) => {
    const sql = `
        INSERT INTO Atenciones_Alumnos (id_alumno, id_prefecto, notas)
        VALUES (?, ?, ?)
    `;
    return baseModel.query(sql, [idAlumno, idPrefecto, notas]);
};

// Verificar si un alumno ha sido atendido
asistenciaDB.verificarAlumnoAtendido = async (idAlumno) => {
    const sql = `
        SELECT 
            aa.*,
            CONCAT_WS(' ', m.nombre_completo, COALESCE(m.apellido_paterno, '')) as nombre_prefecto
        FROM Atenciones_Alumnos aa
        JOIN Maestros m ON aa.id_prefecto = m.id_maestro
        WHERE aa.id_alumno = ?
        ORDER BY aa.fecha_atencion DESC
        LIMIT 1
    `;
    const result = await baseModel.query(sql, [idAlumno]);
    return result.length > 0 ? result[0] : null;
};

// Obtener todos los alumnos atendidos (últimos 30 días por defecto)
asistenciaDB.obtenerAlumnosAtendidos = async (dias = 30) => {
    const sql = `
        SELECT 
            aa.id_alumno,
            MAX(aa.fecha_atencion) as fecha_atencion,
            CONCAT_WS(' ', m.nombre_completo, COALESCE(m.apellido_paterno, '')) as nombre_prefecto
        FROM Atenciones_Alumnos aa
        JOIN Maestros m ON aa.id_prefecto = m.id_maestro
        WHERE aa.fecha_atencion >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY aa.id_alumno, m.nombre_completo, m.apellido_paterno
        ORDER BY fecha_atencion DESC
    `;
    return baseModel.query(sql, [dias]);
};

// Eliminar registro de atención (si es necesario revertir)
asistenciaDB.eliminarAtencionAlumno = async (idAlumno) => {
    const sql = `DELETE FROM Atenciones_Alumnos WHERE id_alumno = ?`;
    return baseModel.query(sql, [idAlumno]);
};

export default asistenciaDB;