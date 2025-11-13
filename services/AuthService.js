// AuthService.js - Centralized Authentication Service
// Handles all user authentication and authorization logic

import { STORAGE_KEYS } from '../utils/StorageKeys.js';

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

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
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
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

        console.log('✅ Login successful:', data.user.name);
        return { success: true, user: data.user };
    } catch (error) {
        console.error('❌ Login failed:', error);
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

        console.log('✅ Registration successful:', data.user.name);
        return { success: true, user: data.user };
    } catch (error) {
        console.error('❌ Registration failed:', error);
        return { success: false, error: error.message };
    }
}

// ===== LOGOUT =====

/**
 * Logout current user
 * @param {boolean} redirectToLogin - Whether to redirect to login page (default: true)
 */
export function logout(redirectToLogin = true) {
    clearToken();
    clearCurrentUser();
    console.log('✅ Logout successful');

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
        console.log('❌ Not authenticated, redirecting to login...');
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
        console.log('✅ Already logged in, redirecting to dashboard...');
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
        console.log('❌ Authentication required, redirecting to login...');
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
        console.log('✅ User already logged in, redirecting to dashboard...');
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

// ===== DEPRECATED (for backward compatibility) =====

/**
 * @deprecated Use API-based authentication instead
 */
export function getUsers() {
    console.warn('⚠️ getUsers() is deprecated - users are now managed by the backend API');
    return [];
}

/**
 * @deprecated Use API-based authentication instead
 */
export function saveUsers() {
    console.warn('⚠️ saveUsers() is deprecated - users are now managed by the backend API');
}

/**
 * @deprecated Use API-based authentication instead
 */
export function updateUser() {
    console.warn('⚠️ updateUser() is deprecated - users are now managed by the backend API');
    throw new Error('Not implemented - use backend API');
}

/**
 * @deprecated Use API-based authentication instead
 */
export function changePassword() {
    console.warn('⚠️ changePassword() is deprecated - users are now managed by the backend API');
    throw new Error('Not implemented - use backend API');
}

// ===== USER PROFILE MANAGEMENT (API-BASED) =====

/**
 * Get current user profile
 * @returns {Promise<Object>} User profile data
 */
export async function getCurrentUserProfile() {
    try {
        const response = await apiRequest('/api/users/me', {
            method: 'GET'
        });

        console.log('✅ User profile fetched');
        return response;
    } catch (error) {
        console.error('❌ Error fetching user profile:', error);
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
        const response = await apiRequest('/api/users/me', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });

        console.log('✅ User profile updated');

        // Update current user in localStorage
        const currentUser = getCurrentUser();
        if (currentUser) {
            const updatedUser = { ...currentUser, ...response };
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
        }

        return response;
    } catch (error) {
        console.error('❌ Error updating user profile:', error);
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
        const response = await apiRequest('/api/users/me/profile-picture', {
            method: 'PUT',
            body: JSON.stringify({ profilePicture })
        });

        console.log('✅ Profile picture updated');

        // Update current user in localStorage
        const currentUser = getCurrentUser();
        if (currentUser) {
            const updatedUser = { ...currentUser, ...response };
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
        }

        return response;
    } catch (error) {
        console.error('❌ Error updating profile picture:', error);
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
        const response = await apiRequest('/api/users/me/name', {
            method: 'PUT',
            body: JSON.stringify({ name })
        });

        console.log('✅ User name updated');

        // Update current user in localStorage
        const currentUser = getCurrentUser();
        if (currentUser) {
            const updatedUser = { ...currentUser, ...response };
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
        }

        return response;
    } catch (error) {
        console.error('❌ Error updating user name:', error);
        throw error;
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
