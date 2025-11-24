CREATE DATABASE SistemaAsistenciaEscolar;
USE SistemaAsistenciaEscolar;

-- ========================================
-- NIVEL 1: CARRERA
-- ========================================
CREATE TABLE Carreras (
    id_carrera INT PRIMARY KEY AUTO_INCREMENT,
    nombre_carrera VARCHAR(100) NOT NULL,
    codigo_carrera VARCHAR(10) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- NIVEL 2: SEMESTRE
-- Pertenece a una CARRERA
-- ========================================
CREATE TABLE Semestres (
    id_semestre INT PRIMARY KEY AUTO_INCREMENT,
    id_carrera INT NOT NULL,
    numero_semestre INT NOT NULL CHECK (numero_semestre BETWEEN 1 AND 12),
    nombre_semestre VARCHAR(50), -- Opcional: "Primer Semestre"
    FOREIGN KEY (id_carrera) REFERENCES Carreras(id_carrera) ON DELETE CASCADE,
    UNIQUE KEY unique_carrera_semestre (id_carrera, numero_semestre)
);

-- ========================================
-- NIVEL 3: MATERIAS
-- Cada materia pertenece a UNA carrera específica
-- ========================================
CREATE TABLE Materias (
    id_materia INT PRIMARY KEY AUTO_INCREMENT,
    id_carrera INT NOT NULL,
    nombre_materia VARCHAR(100) NOT NULL,
    codigo_materia VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_carrera) REFERENCES Carreras(id_carrera) ON DELETE CASCADE
);

-- ========================================
-- TABLA INTERMEDIA: PLAN DE ESTUDIOS
-- Relaciona: CARRERA + SEMESTRE + MATERIA
-- Define QUÉ MATERIAS se cursan en QUÉ SEMESTRE de QUÉ CARRERA
-- ========================================
CREATE TABLE PlanEstudios (
    id_plan INT PRIMARY KEY AUTO_INCREMENT,
    id_carrera INT NOT NULL,
    id_semestre INT NOT NULL,
    id_materia INT NOT NULL,
    FOREIGN KEY (id_carrera) REFERENCES Carreras(id_carrera) ON DELETE CASCADE,
    FOREIGN KEY (id_semestre) REFERENCES Semestres(id_semestre) ON DELETE CASCADE,
    FOREIGN KEY (id_materia) REFERENCES Materias(id_materia) ON DELETE CASCADE,
    UNIQUE KEY unique_plan_materia (id_carrera, id_semestre, id_materia)
);

-- ========================================
-- MAESTROS (Usuarios del sistema)
-- Incluye: maestros, prefectos y administradores
-- ========================================
CREATE TABLE Maestros (
    id_maestro INT PRIMARY KEY AUTO_INCREMENT,
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    tipo_usuario ENUM('maestro', 'prefecto', 'admin') NOT NULL,
    -- Información personal
    nombre_completo VARCHAR(150) NOT NULL,
    apellido_paterno VARCHAR(50),
    apellido_materno VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- HORARIOS (Bloques de 50 minutos)
-- 7:00 AM - 2:00 PM con receso de 30 min
-- ========================================
CREATE TABLE Horarios (
    id_horario INT PRIMARY KEY AUTO_INCREMENT,
    dia_semana ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes') NOT NULL,
    bloque INT NOT NULL CHECK (bloque BETWEEN 1 AND 8),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    UNIQUE KEY unique_dia_bloque (dia_semana, bloque)
);

-- ========================================
-- NIVEL 4: GRUPOS
-- Representa un conjunto de alumnos de una carrera/semestre
-- Ejemplo: "3A Sistemas", "2B Mecatrónica"
-- ========================================
CREATE TABLE Grupos (
    id_grupo INT PRIMARY KEY AUTO_INCREMENT,
    id_carrera INT NOT NULL,
    id_semestre INT NOT NULL,
    nombre_grupo VARCHAR(10) NOT NULL,
    turno ENUM('Matutino') DEFAULT 'Matutino',
    periodo ENUM('Enero-Junio', 'Agosto-Enero') NOT NULL,
    anio YEAR NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_carrera) REFERENCES Carreras(id_carrera) ON DELETE CASCADE,
    FOREIGN KEY (id_semestre) REFERENCES Semestres(id_semestre) ON DELETE RESTRICT,
    UNIQUE KEY unique_grupo (id_carrera, id_semestre, nombre_grupo, periodo, anio)
);

-- ========================================
-- ASIGNACIONES (Grupo + Materia + Maestro + Horario)
-- Define QUÉ MAESTRO imparte QUÉ MATERIA a QUÉ GRUPO en QUÉ HORARIO
-- ========================================
CREATE TABLE Asignaciones (
    id_asignacion INT PRIMARY KEY AUTO_INCREMENT,
    id_grupo INT NOT NULL,
    id_materia INT NOT NULL,
    id_maestro INT NOT NULL,  -- Ahora referencia directamente a Usuarios (maestros)
    id_horario INT NOT NULL,
    FOREIGN KEY (id_grupo) REFERENCES Grupos(id_grupo) ON DELETE CASCADE,
    FOREIGN KEY (id_materia) REFERENCES Materias(id_materia) ON DELETE CASCADE,
    FOREIGN KEY (id_maestro) REFERENCES Maestros(id_maestro) ON DELETE RESTRICT,
    FOREIGN KEY (id_horario) REFERENCES Horarios(id_horario) ON DELETE RESTRICT,
    UNIQUE KEY unique_grupo_horario (id_grupo, id_horario),
    UNIQUE KEY unique_maestro_horario (id_maestro, id_horario)
);

-- ========================================
-- NIVEL 5: ALUMNOS
-- PRIMERO se asigna a CARRERA, luego a SEMESTRE, luego a GRUPO
-- ========================================
CREATE TABLE Alumnos (
    id_alumno INT PRIMARY KEY AUTO_INCREMENT,
    matricula VARCHAR(20) NOT NULL UNIQUE,
    nombre_alumno VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(50) NOT NULL,
    apellido_materno VARCHAR(50),
    -- PASO 1: Asignar a una CARRERA
    id_carrera INT NOT NULL,
    -- PASO 2: Asignar a un SEMESTRE de esa carrera
    id_semestre INT NOT NULL,
    -- PASO 3: Asignar a un GRUPO de ese semestre
    id_grupo INT NOT NULL,
    foto_base64 LONGTEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_carrera) REFERENCES Carreras(id_carrera) ON DELETE RESTRICT,
    FOREIGN KEY (id_semestre) REFERENCES Semestres(id_semestre) ON DELETE RESTRICT,
    FOREIGN KEY (id_grupo) REFERENCES Grupos(id_grupo) ON DELETE RESTRICT
);

-- ========================================
-- NIVEL 6: ASISTENCIAS
-- Registra asistencia de ALUMNO en una ASIGNACIÓN específica
-- ========================================
CREATE TABLE Asistencias (
    id_asistencia INT PRIMARY KEY AUTO_INCREMENT,
    id_alumno INT NOT NULL,
    id_asignacion INT NOT NULL,
    fecha DATE NOT NULL,
    estado ENUM('asistencia', 'falta', 'justificante') NOT NULL,
    hora_registro TIME DEFAULT (CURRENT_TIME),
    observaciones TEXT,
    FOREIGN KEY (id_alumno) REFERENCES Alumnos(id_alumno) ON DELETE CASCADE,
    FOREIGN KEY (id_asignacion) REFERENCES Asignaciones(id_asignacion) ON DELETE CASCADE,
    UNIQUE KEY unique_asistencia_fecha (id_alumno, id_asignacion, fecha)
);

-- Tabla para registrar cuando un prefecto atiende un caso de alumno problemático
CREATE TABLE IF NOT EXISTS Atenciones_Alumnos (
    id_atencion INT PRIMARY KEY AUTO_INCREMENT,
    id_alumno INT NOT NULL,
    id_prefecto INT NOT NULL,
    fecha_atencion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    FOREIGN KEY (id_alumno) REFERENCES Alumnos(id_alumno) ON DELETE CASCADE,
    FOREIGN KEY (id_prefecto) REFERENCES Maestros(id_maestro) ON DELETE CASCADE,
    INDEX idx_alumno (id_alumno),
    INDEX idx_prefecto (id_prefecto),
    INDEX idx_fecha (fecha_atencion)
);


-- ========================================
-- DATOS INICIALES
-- ========================================

-- Usuario administrador
INSERT INTO Maestros (nombre_usuario, contrasena, tipo_usuario, nombre_completo) 
VALUES ('admin', 'admin123', 'admin', 'Administrador del Sistema');

-- Horarios preconfigurados (8 bloques de 50 min)
INSERT INTO Horarios (dia_semana, bloque, hora_inicio, hora_fin) VALUES
-- LUNES
('Lunes', 1, '07:00:00', '07:50:00'),
('Lunes', 2, '07:50:00', '08:40:00'),
('Lunes', 3, '08:40:00', '09:30:00'),
('Lunes', 4, '09:30:00', '10:20:00'),
-- RECESO 30 minutos
('Lunes', 5, '10:50:00', '11:40:00'),
('Lunes', 6, '11:40:00', '12:30:00'),
('Lunes', 7, '12:30:00', '13:20:00'),
('Lunes', 8, '13:20:00', '14:10:00'),
-- MARTES
('Martes', 1, '07:00:00', '07:50:00'),
('Martes', 2, '07:50:00', '08:40:00'),
('Martes', 3, '08:40:00', '09:30:00'),
('Martes', 4, '09:30:00', '10:20:00'),
('Martes', 5, '10:50:00', '11:40:00'),
('Martes', 6, '11:40:00', '12:30:00'),
('Martes', 7, '12:30:00', '13:20:00'),
('Martes', 8, '13:20:00', '14:10:00'),
-- MIÉRCOLES
('Miércoles', 1, '07:00:00', '07:50:00'),
('Miércoles', 2, '07:50:00', '08:40:00'),
('Miércoles', 3, '08:40:00', '09:30:00'),
('Miércoles', 4, '09:30:00', '10:20:00'),
('Miércoles', 5, '10:50:00', '11:40:00'),
('Miércoles', 6, '11:40:00', '12:30:00'),
('Miércoles', 7, '12:30:00', '13:20:00'),
('Miércoles', 8, '13:20:00', '14:10:00'),
-- JUEVES
('Jueves', 1, '07:00:00', '07:50:00'),
('Jueves', 2, '07:50:00', '08:40:00'),
('Jueves', 3, '08:40:00', '09:30:00'),
('Jueves', 4, '09:30:00', '10:20:00'),
('Jueves', 5, '10:50:00', '11:40:00'),
('Jueves', 6, '11:40:00', '12:30:00'),
('Jueves', 7, '12:30:00', '13:20:00'),
('Jueves', 8, '13:20:00', '14:10:00'),
-- VIERNES
('Viernes', 1, '07:00:00', '07:50:00'),
('Viernes', 2, '07:50:00', '08:40:00'),
('Viernes', 3, '08:40:00', '09:30:00'),
('Viernes', 4, '09:30:00', '10:20:00'),
('Viernes', 5, '10:50:00', '11:40:00'),
('Viernes', 6, '11:40:00', '12:30:00'),
('Viernes', 7, '12:30:00', '13:20:00'),
('Viernes', 8, '13:20:00', '14:10:00');

-- ========================================
-- EJEMPLO DE DATOS DE PRUEBA
-- ========================================

-- Crear carrera
INSERT INTO Carreras (nombre_carrera, codigo_carrera) 
VALUES ('Ingeniería en Sistemas Computacionales', 'ISC');

-- Crear semestres para ISC (id_carrera = 1)
INSERT INTO Semestres (id_carrera, numero_semestre, nombre_semestre) VALUES
(1, 1, 'Primer Semestre'),
(1, 2, 'Segundo Semestre'),
(1, 3, 'Tercer Semestre'),
(1, 4, 'Cuarto Semestre'),
(1, 5, 'Quinto Semestre'),
(1, 6, 'Sexto Semestre'),
(1, 7, 'Séptimo Semestre'),
(1, 8, 'Octavo Semestre'),
(1, 9, 'Noveno Semestre');

-- Crear materias para ISC (id_carrera = 1)
INSERT INTO Materias (id_carrera, nombre_materia, codigo_materia) VALUES
(1, 'Programación Web', 'PW-301'),
(1, 'Bases de Datos', 'BD-302'),
(1, 'Matemáticas Discretas', 'MD-303'),
(1, 'Estructuras de Datos', 'ED-304');

-- Asignar materias al 3er semestre de ISC (Plan de Estudios)
INSERT INTO PlanEstudios (id_carrera, id_semestre, id_materia) VALUES
(1, 3, 1), -- Programación Web en 3er semestre
(1, 3, 2), -- Bases de Datos en 3er semestre
(1, 3, 3), -- Matemáticas Discretas en 3er semestre
(1, 3, 4); -- Estructuras de Datos en 3er semestre

-- Crear un grupo: 3A de Sistemas
INSERT INTO Grupos (id_carrera, id_semestre, nombre_grupo, turno, periodo, anio) 
VALUES (1, 3, 'A', 'Matutino', 'Agosto-Enero', 2025);

-- Asignar Programación Web al grupo 3A con el maestro Luis (id_usuario=3) en Lunes 7:00-7:50
INSERT INTO Asignaciones (id_grupo, id_materia, id_maestro, id_horario) 
VALUES (1, 1, 3, 1);

-- Registrar algunos alumnos: CARRERA → SEMESTRE → GRUPO
INSERT INTO Alumnos (matricula, nombre_alumno, apellido_paterno, apellido_materno, id_carrera, id_semestre, id_grupo) VALUES
('2023001', 'Juan', 'Pérez', 'López', 1, 3, 1),      -- Carrera ISC, 3er Semestre, Grupo 3A
('2023002', 'María', 'González', 'Martínez', 1, 3, 1), -- Carrera ISC, 3er Semestre, Grupo 3A
('2023003', 'Carlos', 'Rodríguez', 'Sánchez', 1, 3, 1); -- Carrera ISC, 3er Semestre, Grupo 3A

-- Script para inicializar la tabla de Horarios con los 35 bloques
-- Horario escolar: 7:00 AM - 1:20 PM (7 bloques de 50 minutos)
-- Receso de 30 minutos: 9:30 - 10:00 (entre bloque 3 y 4)

-- LUNES (7 bloques)
INSERT INTO Horarios (dia_semana, bloque, hora_inicio, hora_fin) VALUES
('Lunes', 1, '07:00:00', '07:50:00'),
('Lunes', 2, '07:50:00', '08:40:00'),
('Lunes', 3, '08:40:00', '09:30:00'),
-- RECESO 9:30 - 10:00
('Lunes', 4, '10:00:00', '10:50:00'),
('Lunes', 5, '10:50:00', '11:40:00'),
('Lunes', 6, '11:40:00', '12:30:00'),
('Lunes', 7, '12:30:00', '13:20:00');

-- MARTES (7 bloques)
INSERT INTO Horarios (dia_semana, bloque, hora_inicio, hora_fin) VALUES
('Martes', 1, '07:00:00', '07:50:00'),
('Martes', 2, '07:50:00', '08:40:00'),
('Martes', 3, '08:40:00', '09:30:00'),
-- RECESO 9:30 - 10:00
('Martes', 4, '10:00:00', '10:50:00'),
('Martes', 5, '10:50:00', '11:40:00'),
('Martes', 6, '11:40:00', '12:30:00'),
('Martes', 7, '12:30:00', '13:20:00');

-- MIÉRCOLES (7 bloques)
INSERT INTO Horarios (dia_semana, bloque, hora_inicio, hora_fin) VALUES
('Miércoles', 1, '07:00:00', '07:50:00'),
('Miércoles', 2, '07:50:00', '08:40:00'),
('Miércoles', 3, '08:40:00', '09:30:00'),
-- RECESO 9:30 - 10:00
('Miércoles', 4, '10:00:00', '10:50:00'),
('Miércoles', 5, '10:50:00', '11:40:00'),
('Miércoles', 6, '11:40:00', '12:30:00'),
('Miércoles', 7, '12:30:00', '13:20:00');

-- JUEVES (7 bloques)
INSERT INTO Horarios (dia_semana, bloque, hora_inicio, hora_fin) VALUES
('Jueves', 1, '07:00:00', '07:50:00'),
('Jueves', 2, '07:50:00', '08:40:00'),
('Jueves', 3, '08:40:00', '09:30:00'),
-- RECESO 9:30 - 10:00
('Jueves', 4, '10:00:00', '10:50:00'),
('Jueves', 5, '10:50:00', '11:40:00'),
('Jueves', 6, '11:40:00', '12:30:00'),
('Jueves', 7, '12:30:00', '13:20:00');

-- VIERNES (7 bloques)
INSERT INTO Horarios (dia_semana, bloque, hora_inicio, hora_fin) VALUES
('Viernes', 1, '07:00:00', '07:50:00'),
('Viernes', 2, '07:50:00', '08:40:00'),
('Viernes', 3, '08:40:00', '09:30:00'),
-- RECESO 9:30 - 10:00
('Viernes', 4, '10:00:00', '10:50:00'),
('Viernes', 5, '10:50:00', '11:40:00'),
('Viernes', 6, '11:40:00', '12:30:00'),
('Viernes', 7, '12:30:00', '13:20:00');

-- Total: 35 horarios (5 días × 7 bloques)


SELECT '✅ Base de datos creada con jerarquía simplificada:
1️⃣ Carrera → 2️⃣ Semestre → 3️⃣ Materia → 4️⃣ Grupo → 5️⃣ Alumno → 6️⃣ Asistencia
📚 Tabla intermedia PlanEstudios vincula Carrera+Semestre+Materia
👨‍🏫 Una sola tabla Usuarios (maestros, prefectos, admin diferenciados por tipo)
⏰ 35 horarios precargados (7 bloques × 5 días)
📝 Datos de ejemplo incluidos' AS Mensaje;