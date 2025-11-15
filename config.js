// config.js - Application configuration (reads from .env)

export const CONFIG = {
    // Use environment variable or fallback to localhost for development
    API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    APP_NAME: import.meta.env.VITE_APP_NAME || 'Nivoxar',
    VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0'
};
