// AuthService.js - Centralized Authentication Service
// Handles all user authentication and authorization logic

// ===== CONSTANTS =====
const STORAGE_KEYS = {
    USERS: 'nivoxar_users',
    CURRENT_USER: 'nivoxar_current_user'
};

// ===== USER MANAGEMENT =====

/**
 * Get all users from localStorage
 * @returns {Array} Array of user objects
 */
export function getUsers() {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : [];
}

/**
 * Save users to localStorage
 * @param {Array} users - Array of user objects
 */
export function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
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
    return !!getCurrentUser();
}

// ===== LOGIN =====

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} Result object with success status and user/error
 */
export function login(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        setCurrentUser(user);
        console.log('✅ Login successful:', user.name);
        return { success: true, user };
    }
    
    return { success: false, error: 'Invalid email or password' };
}

// ===== REGISTER =====

/**
 * Register a new user
 * @param {Object} userData - User data {name, email, password}
 * @returns {Object} Result object with success status and user/error
 */
export function register(userData) {
    const users = getUsers();
    
    // Check if email already exists
    if (users.find(u => u.email === userData.email)) {
        return { success: false, error: 'Email already exists' };
    }
    
    // Create new user
    const newUser = {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        password: userData.password,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    
    // Auto login
    setCurrentUser(newUser);
    console.log('✅ Registration successful:', newUser.name);
    
    return { success: true, user: newUser };
}

// ===== LOGOUT =====

/**
 * Logout current user
 * @param {boolean} redirectToLogin - Whether to redirect to login page (default: true)
 */
export function logout(redirectToLogin = true) {
    clearCurrentUser();
    console.log('✅ Logout successful');
    
    if (redirectToLogin) {
        window.location.href = '/views/LoginPage.html';
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
    if (!currentUser && !currentPath.includes('LoginPage.html')) {
        console.log('❌ Not authenticated, redirecting to login...');
        window.location.href = '/views/LoginPage.html';
        return false;
    }
    
    // If logged in and on login page, redirect to dashboard
    if (currentUser && currentPath.includes('LoginPage.html')) {
        console.log('✅ Already logged in, redirecting to dashboard...');
        window.location.href = '/views/DashboardPage.html';
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
        window.location.href = '/views/LoginPage.html';
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
        window.location.href = '/views/DashboardPage.html';
        return true;
    }
    return false;
}