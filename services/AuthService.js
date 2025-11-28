// AuthService.js - Centralized Authentication Service
// Handles all user authentication and authorization logic

import { STORAGE_KEYS } from '../utils/StorageKeys.js';
import { CONFIG } from '../config.js';
import Logger from '../utils/Logger.js';

// API Configuration
const API_BASE_URL = CONFIG.API_BASE_URL;

// ===== TOKEN MANAGEMENT =====

/**
 * Get JWT token from localStorage
 * @returns {string|null} JWT token or null if not exists
 */
function getToken() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * Set JWT token in localStorage
 * @param {string} token - JWT token
 */
function setToken(token) {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
}

/**
 * Remove JWT token from localStorage
 */
function clearToken() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
}

// ===== CURRENT USER =====

/**
 * Get currently logged in user
 * @returns {Object|null} User object or null if not logged in
 */
export function getCurrentUser() {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return saved ? JSON.parse(saved) : null;
}

/**
 * Set current user in localStorage
 * @param {Object} user - User object to set as current
 */
function setCurrentUser(user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

/**
 * Remove current user from localStorage
 */
function clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

// ===== AUTHENTICATION STATUS =====

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is logged in
 */
export function isAuthenticated() {
    return !!getCurrentUser() && !!getToken();
}

// ===== API HELPER =====

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        console.error(`[API ERROR] ${options.method || 'GET'} ${endpoint} - Status: ${response.status}`, error);
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    // Handle 204 No Content responses (e.g., DELETE requests)
    if (response.status === 204) {
        return {};
    }

    // Check if there's content to parse
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }

    // Return empty object for responses without JSON content
    return {};
}

// ===== LOGIN =====

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Result object with success status and user/error
 */
export async function login(email, password) {
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        // Save token and user
        setToken(data.token);
        setCurrentUser(data.user);

        Logger.success('Login successful:', data.user.name);
        return { success: true, user: data.user };
    } catch (error) {
        Logger.error('Login failed:', error);
        return { success: false, error: error.message };
    }
}

// ===== EMAIL VERIFICATION =====

/**
 * Send verification code to email
 * @param {string} email - User email
 * @returns {Promise<Object>} Result object with success status and message/error
 */
export async function sendVerificationCode(email) {
    try {
        const data = await apiRequest('/auth/send-verification', {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        Logger.success('Verification code sent:', data.message);
        return { success: true, message: data.message };
    } catch (error) {
        Logger.error('Failed to send verification code:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verify email with code
 * @param {string} email - User email
 * @param {string} code - 6-digit verification code
 * @returns {Promise<Object>} Result object with success status and verified/error
 */
export async function verifyEmailCode(email, code) {
    try {
        const data = await apiRequest('/auth/verify-code', {
            method: 'POST',
            body: JSON.stringify({ email, code })
        });

        Logger.success('Email verified:', data.message);
        return { success: true, verified: data.verified };
    } catch (error) {
        Logger.error('Email verification failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Request password reset code
 * @param {string} email - User email
 * @returns {Promise<Object>} Result object with success status and message/error
 */
export async function forgotPassword(email) {
    try {
        const data = await apiRequest('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        Logger.success('Password reset code sent:', data.message);
        return { success: true, message: data.message };
    } catch (error) {
        Logger.error('Failed to send password reset code:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reset password with code
 * @param {string} email - User email
 * @param {string} code - 6-digit reset code
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Result object with success status and message/error
 */
export async function resetPassword(email, code, newPassword) {
    try {
        const data = await apiRequest('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, code, newPassword })
        });

        Logger.success('Password reset successful:', data.message);
        return { success: true, message: data.message };
    } catch (error) {
        Logger.error('Password reset failed:', error);
        return { success: false, error: error.message };
    }
}

// ===== REGISTER =====

/**
 * Register a new user
 * @param {Object} userData - User data {name, email, password}
 * @returns {Promise<Object>} Result object with success status and user/error
 */
export async function register(userData) {
    try {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name: userData.name,
                email: userData.email,
                password: userData.password
            })
        });

        // Save token and user
        setToken(data.token);
        setCurrentUser(data.user);

        Logger.success('Registration successful:', data.user.name);
        return { success: true, user: data.user };
    } catch (error) {
        Logger.error('Registration failed:', error);
        return { success: false, error: error.message };
    }
}

// ===== LOGOUT =====

/**
 * Clear all user-related data from localStorage
 */
function clearAllUserData() {
    // Clear all user-related data from localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });

    // Also clear any other keys that might be related to the user
    // This ensures a clean slate for the next user
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('nivoxar_')) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Logout current user
 * @param {boolean} redirectToLogin - Whether to redirect to login page (default: true)
 */
export function logout(redirectToLogin = true) {
    clearToken();
    clearCurrentUser();
    clearAllUserData(); // Clear ALL user data
    Logger.success('Logout successful - all user data cleared');

    if (redirectToLogin) {
        if (window.__SPA_MODE__) {
            import('../scripts/core/Router.js').then(({ router }) => {
                router.navigate('/login', true);
            });
        } else {
            window.location.href = '/views/LoginPage.html';
        }
    }
}

// ===== ROUTE PROTECTION =====

/**
 * Check authentication and redirect if necessary
 * @returns {boolean} True if user can access the current page
 */
export function checkAuth() {
    const currentUser = getCurrentUser();
    const currentPath = window.location.pathname;

    // If not logged in and not on login page
    if (!currentUser && !currentPath.includes('LoginPage.html') && currentPath !== '/login') {
        Logger.warn('Not authenticated, redirecting to login...');
        if (window.__SPA_MODE__) {
            import('../scripts/core/Router.js').then(({ router }) => {
                router.navigate('/login', true);
            });
        } else {
            window.location.href = '/views/LoginPage.html';
        }
        return false;
    }

    // If logged in and on login page, redirect to dashboard
    if (currentUser && (currentPath.includes('LoginPage.html') || currentPath === '/login')) {
        Logger.info('Already logged in, redirecting to dashboard...');
        if (window.__SPA_MODE__) {
            import('../scripts/core/Router.js').then(({ router }) => {
                router.navigate('/dashboard', true);
            });
        } else {
            window.location.href = '/views/DashboardPage.html';
        }
        return false;
    }

    return true;
}

/**
 * Require authentication - redirect to login if not authenticated
 * Use this at the start of protected pages
 */
export function requireAuth() {
    if (!isAuthenticated()) {
        Logger.warn('Authentication required, redirecting to login...');
        if (window.__SPA_MODE__) {
            import('../scripts/core/Router.js').then(({ router }) => {
                router.navigate('/login', true);
            });
        } else {
            window.location.href = '/views/LoginPage.html';
        }
        return false;
    }
    return true;
}

/**
 * Check if user is already logged in (for login page)
 * @returns {boolean} True if already logged in
 */
export function checkIfLoggedIn() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        Logger.info('User already logged in, redirecting to dashboard...');
        if (window.__SPA_MODE__) {
            import('../scripts/core/Router.js').then(({ router }) => {
                router.navigate('/dashboard', true);
            });
        } else {
            window.location.href = '/views/DashboardPage.html';
        }
        return true;
    }
    return false;
}

// ===== USER PROFILE MANAGEMENT (API-BASED) =====

/**
 * Get current user profile
 * @returns {Promise<Object>} User profile data
 */
export async function getCurrentUserProfile() {
    try {
        const response = await apiRequest('/users/me', {
            method: 'GET'
        });

        Logger.success('User profile fetched');
        return response;
    } catch (error) {
        Logger.error('Error fetching user profile:', error);
        throw error;
    }
}

/**
 * Update user profile (name and/or profile picture)
 * @param {Object} profileData - { name?, profilePicture? }
 * @returns {Promise<Object>} Updated user data
 */
export async function updateUserProfile(profileData) {
    try {
        // Convert camelCase to PascalCase for C# model binding
        const payload = {};
        if (profileData.name !== undefined) payload.Name = profileData.name;
        if (profileData.profilePicture !== undefined) payload.ProfilePicture = profileData.profilePicture;

        const response = await apiRequest('/users/me', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        Logger.success('User profile updated');

        // Update current user in localStorage
        const currentUser = getCurrentUser();
        if (currentUser) {
            const updatedUser = { ...currentUser, ...response };
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
        }

        return response;
    } catch (error) {
        Logger.error('Error updating user profile:', error);
        throw error;
    }
}

/**
 * Update profile picture
 * @param {string} profilePicture - Base64 encoded image data
 * @returns {Promise<Object>} Updated user data
 */
export async function updateProfilePicture(profilePicture) {
    try {
        const response = await apiRequest('/users/me/profile-picture', {
            method: 'PUT',
            body: JSON.stringify({ ProfilePicture: profilePicture })  // Capital P to match C# model
        });

        Logger.success('Profile picture updated');

        // Update current user in localStorage
        const currentUser = getCurrentUser();
        if (currentUser) {
            const updatedUser = { ...currentUser, ...response };
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
        }

        return response;
    } catch (error) {
        Logger.error('Error updating profile picture:', error);
        throw error;
    }
}

/**
 * Update username/name
 * @param {string} name - New name
 * @returns {Promise<Object>} Updated user data
 */
export async function updateUserName(name) {
    try {
        const response = await apiRequest('/users/me/name', {
            method: 'PUT',
            body: JSON.stringify({ Name: name })  // Capital N to match C# model
        });

        Logger.success('User name updated');

        // Update current user in localStorage
        const currentUser = getCurrentUser();
        if (currentUser) {
            const updatedUser = { ...currentUser, ...response };
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
        }

        return response;
    } catch (error) {
        Logger.error('Error updating user name:', error);
        throw error;
    }
}

/**
 * Change user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success response
 */
export async function changePassword(currentPassword, newPassword) {
    try {
        const response = await apiRequest('/users/me/password', {
            method: 'PUT',
            body: JSON.stringify({
                CurrentPassword: currentPassword,
                NewPassword: newPassword
            })
        });

        Logger.success('Password changed successfully');
        return response;
    } catch (error) {
        Logger.error('Error changing password:', error);
        throw error;
    }
}

/**
 * Search users by name
 * @param {string} query - Search query (minimum 2 characters)
 * @returns {Promise<Array>} Array of matching users
 */
export async function searchUsers(query) {
    try {
        if (!query || query.length < 2) {
            return [];
        }

        const response = await apiRequest(`/users/search?query=${encodeURIComponent(query)}`, {
            method: 'GET'
        });

        return response.users || [];
    } catch (error) {
        Logger.error('Error searching users:', error);
        return [];
    }
}

/**
 * Check if username is available
 * @param {string} name - Username to check
 * @returns {Promise<boolean>} True if name is available
 */
export async function checkNameAvailability(name) {
    try {
        if (!name) {
            return false;
        }

        const response = await apiRequest(`/users/check-name?name=${encodeURIComponent(name)}`, {
            method: 'GET'
        });

        return response.available;
    } catch (error) {
        Logger.error('Error checking name availability:', error);
        return false;
    }
}

// ===== EXPORT API HELPER FOR OTHER SERVICES =====

/**
 * Make authenticated API request (exported for use in other services)
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
export { apiRequest };
