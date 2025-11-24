import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./router/apiRouter.js";
import cors from "cors";
import session from "express-session";
import { requirePrefecto, requireAuth } from "./utils/middleware.js";

// Configurar zona horaria para México (Mazatlán, Sinaloa)
process.env.TZ = 'America/Mazatlan';

// Configuración de la aplicación
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar sesiones
app.use(session({
    secret: 'sistema-asistencia-escolar-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // En producción con HTTPS, cambiar a true
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 8 // 8 horas
    }
}));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rutas API
app.use('/api', apiRouter);

// Rutas de vistas
app.get('/', (req, res) => {
    res.render('login');
});

// Ruta principal de admin (redirige a usuarios por defecto)
app.get('/admin', (req, res) => {
    res.redirect('/admin/usuarios');
});

// Rutas específicas para cada sección del admin
app.get('/admin/usuarios', (req, res) => {
    res.render('usuarios', { currentPage: 'usuarios', cssFile: 'usuarios.css', jsFile: 'usuarios.js' });
});

app.get('/admin/carreras', (req, res) => {
    res.render('carreras', { currentPage: 'carreras', cssFile: 'carreras.css', jsFile: 'carreras.js' });
});

app.get('/admin/semestres', (req, res) => {
    res.render('semestres', { currentPage: 'semestres', cssFile: 'semestres.css', jsFile: 'semestres.js' });
});

app.get('/admin/materias', (req, res) => {
    res.render('materiasPlanes', { currentPage: 'materias', cssFile: 'materiasPlanes.css', jsFile: 'materiasPlanes.js' });
});

app.get('/admin/grupos', (req, res) => {
    res.render('grupos', { currentPage: 'grupos', cssFile: 'grupos.css', jsFile: 'grupos.js' });
});

app.get('/admin/alumnos', (req, res) => {
    res.render('alumnos', { currentPage: 'alumnos', cssFile: 'alumnos.css', jsFile: 'alumnos.js' });
});

app.get('/admin/asignaciones', (req, res) => {
    res.render('asignaciones', { currentPage: 'asignaciones', cssFile: 'asignaciones.css', jsFile: 'asignaciones.js' });
});

app.get('/admin/visualizar', (req, res) => {
    res.render('visualizar', { currentPage: 'visualizar', cssFile: 'visualizar.css', jsFile: 'visualizar.js' });
});

app.get('/maestro', (req, res) => {
    res.render('maestro');
});

// ========== RUTAS PARA PORTAL DE PREFECTOS ==========
app.get('/prefecto', requirePrefecto, (req, res) => {
    res.redirect('/prefecto/dashboard');
});

// Dashboard Principal
app.get('/prefecto/dashboard', requirePrefecto, (req, res) => {
    res.render('prefecto-dashboard', { 
        currentPage: 'dashboard', 
        cssFile: 'prefecto.css', 
        jsFile: 'prefecto-dashboard.js',
        user: req.session.user || req.user
    });
});

// Alumnos Problemáticos
app.get('/prefecto/alumnos-problematicos', requirePrefecto, (req, res) => {
    res.render('prefecto-alumnos', { 
        currentPage: 'alumnos-problematicos', 
        cssFile: 'prefecto.css', 
        jsFile: 'prefecto-alumnos.js',
        user: req.session.user || req.user
    });
});

// Detalle de Alumno
app.get('/prefecto/alumno/:id', requirePrefecto, (req, res) => {
    res.render('prefecto-alumno-detalle', { 
        currentPage: 'alumno-detalle',
        alumnoId: req.params.id,
        cssFile: 'prefecto.css', 
        jsFile: 'prefecto-alumno-detalle.js',
        user: req.session.user || req.user
    });
});

// Control de Maestros
app.get('/prefecto/maestros-control', requirePrefecto, (req, res) => {
    res.render('prefecto-maestros', { 
        currentPage: 'maestros-control', 
        cssFile: 'prefecto.css', 
        jsFile: 'prefecto-maestros.js',
        user: req.session.user || req.user
    });
});

// Detalle de Maestro
app.get('/prefecto/maestro/:id', requirePrefecto, (req, res) => {
    res.render('prefecto-maestro-detalle', { 
        currentPage: 'maestro-detalle',
        maestroId: req.params.id,
        cssFile: 'prefecto.css', 
        jsFile: 'prefecto-maestro-detalle.js',
        user: req.session.user || req.user
    });
});

// Importar logger
import logger from "./utils/logger.js";

// Iniciar servidor
app.listen(PORT, () => {
    logger.info(`Servidor corriendo en http://localhost:${PORT}`);
});