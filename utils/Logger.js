// Logger.js - Centralized Logging System
// Controls logging output based on environment

const IS_PRODUCTION = false; // Set to true for production
const ENABLE_LOGS = !IS_PRODUCTION;

// Log level configuration
// 0 = DEBUG (all logs)
// 1 = INFO (info, success, warning, error)
// 2 = WARNING (warning, error only)
// 3 = ERROR (error only)
const LOG_LEVEL = 0; // Set to 0 to show all debug logs

/**
 * Log levels
 */
const LogLevel = {
    INFO: 'INFO',
    SUCCESS: 'SUCCESS',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG'
};

/**
 * Format log message with timestamp and level
 */
function formatMessage(level, message, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    const icon = getIcon(level);
    return [`[${timestamp}] ${icon} ${message}`, ...args];
}

/**
 * Get icon for log level
 */
function getIcon(level) {
    switch (level) {
        case LogLevel.INFO: return 'ℹ️';
        case LogLevel.SUCCESS: return '✅';
        case LogLevel.WARNING: return '⚠️';
        case LogLevel.ERROR: return '❌';
        case LogLevel.DEBUG: return '🔍';
        default: return '📝';
    }
}

/**
 * Logger class
 */
export class Logger {
    /**
     * Info log
     */
    static info(message, ...args) {
        if (ENABLE_LOGS && LOG_LEVEL <= 1) {
            console.log(...formatMessage(LogLevel.INFO, message, ...args));
        }
    }

    /**
     * Success log
     */
    static success(message, ...args) {
        if (ENABLE_LOGS && LOG_LEVEL <= 1) {
            console.log(...formatMessage(LogLevel.SUCCESS, message, ...args));
        }
    }

    /**
     * Warning log
     */
    static warn(message, ...args) {
        if (ENABLE_LOGS && LOG_LEVEL <= 2) {
            console.warn(...formatMessage(LogLevel.WARNING, message, ...args));
        }
    }

    /**
     * Error log (always shown, even in production)
     */
    static error(message, ...args) {
        console.error(...formatMessage(LogLevel.ERROR, message, ...args));
    }

    /**
     * Debug log (only in development)
     */
    static debug(message, ...args) {
        if (ENABLE_LOGS && LOG_LEVEL === 0) {
            console.log(...formatMessage(LogLevel.DEBUG, message, ...args));
        }
    }

    /**
     * Group start
     */
    static group(label) {
        if (ENABLE_LOGS) {
            console.group(label);
        }
    }

    /**
     * Group end
     */
    static groupEnd() {
        if (ENABLE_LOGS) {
            console.groupEnd();
        }
    }

    /**
     * Table log
     */
    static table(data) {
        if (ENABLE_LOGS) {
            console.table(data);
        }
    }
}

// Default export
export default Logger;
