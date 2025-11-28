// AuthMiddleware.js - Centralized authentication middleware

import Logger from '../utils/Logger.js';
import { getCurrentUser } from '../services/AuthService.js';

/**
 * Require authentication for page access
 * Redirects to login if user is not authenticated
 * @returns {Object|null} Current user if authenticated, null if redirected
 */
export function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        Logger.warn(' User not authenticated, redirecting to login');
        window.location.href = './LoginPage.html';
        return null;
    }
    Logger.success(' User authenticated:', user.username);
    return user;
}

/**
 * Check if user is authenticated (without redirect)
 * @returns {boolean} True if authenticated, false otherwise
 */
export function isAuthenticated() {
    return getCurrentUser() !== null;
}
