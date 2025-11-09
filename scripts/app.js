/**
 * Main App Entry Point
 * Initializes the SPA and registers all routes
 */

import { router } from './core/Router.js';
import { renderNavbar } from './components/Navbar.js';
import { isAuthenticated } from '../services/AuthService.js';

// Import page loaders
import { loadDashboardPage } from '../views/DashboardPage.js';
import { loadLoginPage } from '../views/LoginPage.js';
import { loadCalendarPage } from '../views/CalendarPage.js';
import { loadCategoriesPage } from '../views/CategoriesPage.js';
import { loadProfilePage } from '../views/ProfilePage.js';
import { loadSharedTasksPage } from '../views/SharedTasksPage.js';
import { loadAnalyticsPage } from '../views/AnalyticsPage.js';

/**
 * Initialize the application
 */
async function initApp() {
    try {
        // Register all routes (including login)
        registerRoutes();

        // Add navigation callbacks
        setupNavigationCallbacks();

        // Check authentication
        const authenticated = isAuthenticated();

        if (!authenticated) {
            // Navigate to login page via router
            await router.navigate('/login', true);
            return;
        }

        // Render navbar (stays fixed for authenticated users)
        await renderNavbar();

        // Initialize router and load current route
        await router.init();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to load application. Please refresh the page.');
    }
}

/**
 * Register all application routes
 */
function registerRoutes() {
    router.register('/login', loadLoginPage);
    router.register('/dashboard', loadDashboardPage);
    router.register('/calendar', loadCalendarPage);
    router.register('/categories', loadCategoriesPage);
    router.register('/profile', loadProfilePage);
    router.register('/shared-tasks', loadSharedTasksPage);
    router.register('/analytics', loadAnalyticsPage);
}

/**
 * Setup navigation callbacks (before/after)
 */
function setupNavigationCallbacks() {
    // Before navigation: Show loading
    router.beforeNavigate(async (path) => {
        showGlobalLoading();
        return true; // Continue navigation
    });

    // After navigation: Hide loading, update navbar active state
    router.afterNavigate(async (path) => {
        hideGlobalLoading();

        // Show/hide navbar based on route
        if (path === '/login') {
            // Hide navbar on login page
            const navbarContainer = document.getElementById('navbarContainer');
            if (navbarContainer) {
                navbarContainer.style.display = 'none';
            }
        } else {
            // Show navbar on authenticated pages
            const navbarContainer = document.getElementById('navbarContainer');
            if (navbarContainer) {
                navbarContainer.style.display = 'block';

                // Render navbar if not already rendered
                if (!navbarContainer.innerHTML.trim()) {
                    await renderNavbar();
                }
            }
        }

        updateNavbarActiveState(path);
    });
}

/**
 * Update navbar active state based on current route
 * @param {string} path - Current route path
 */
function updateNavbarActiveState(path) {
    // Remove active class from all nav links
    document.querySelectorAll('.navbar-menu a').forEach(link => {
        link.classList.remove('active');
    });

    // Add active class to current route link
    const activeLink = document.querySelector(`.navbar-menu a[href="${path}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

/**
 * Show global loading indicator
 */
function showGlobalLoading() {
    const loading = document.getElementById('globalLoading');
    if (loading) {
        loading.style.display = 'flex';
    }
}

/**
 * Hide global loading indicator
 */
function hideGlobalLoading() {
    const loading = document.getElementById('globalLoading');
    if (loading) {
        loading.style.display = 'none';
    }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--color-danger); margin-bottom: 20px;"></i>
                <h1>Oops!</h1>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="btn btn-primary">
                    <i class="fas fa-redo"></i> Reload
                </button>
            </div>
        `;
    }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
