// Sistema de logging optimizado y configurable

const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

class Logger {
    constructor(level = LogLevel.INFO) {
        this.level = level;
        this.colors = {
            error: '\x1b[31m', // Rojo
            warn: '\x1b[33m',  // Amarillo
            info: '\x1b[36m',  // Cian
            debug: '\x1b[90m', // Gris
            reset: '\x1b[0m'   // Reset
        };
    }

    _log(level, message, data = null) {
        if (level > this.level) return;

        const timestamp = new Date().toISOString();
        const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        const levelName = levelNames[level];
        const color = this.colors[levelName.toLowerCase()] || '';
        
        let logMessage = `${color}[${timestamp}] ${levelName}: ${message}${this.colors.reset}`;
        
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }

    error(message, data = null) {
        this._log(LogLevel.ERROR, message, data);
    }

    warn(message, data = null) {
        this._log(LogLevel.WARN, message, data);
    }

    info(message, data = null) {
        this._log(LogLevel.INFO, message, data);
    }

    debug(message, data = null) {
        this._log(LogLevel.DEBUG, message, data);
    }

    // Métodos específicos para el contexto de la aplicación
    dbOperation(operation, table, success = true, data = null) {
        if (success) {
            this.info(`DB: ${operation} en ${table} exitoso`, data);
        } else {
            this.error(`DB: Error en ${operation} en ${table}`, data);
        }
    }

    apiRequest(method, path, status, responseTime = null) {
        const message = `API: ${method} ${path} - ${status}${responseTime ? ` (${responseTime}ms)` : ''}`;
        
        if (status >= 500) {
            this.error(message);
        } else if (status >= 400) {
            this.warn(message);
        } else {
            this.info(message);
        }
    }

    auth(action, user, success = true) {
        const message = `AUTH: ${action} - Usuario: ${user} - ${success ? 'Exitoso' : 'Fallido'}`;
        if (success) {
            this.info(message);
        } else {
            this.warn(message);
        }
    }
}

// Configuración basada en el entorno
const getLogLevel = () => {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
        case 'production':
            return LogLevel.WARN;
        case 'test':
            return LogLevel.ERROR;
        default:
            return LogLevel.INFO;
    }
};

// Instancia singleton del logger
const logger = new Logger(getLogLevel());

export default logger;
export { LogLevel };
