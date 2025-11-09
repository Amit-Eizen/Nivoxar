// Navbar.js - Navigation component with authentication
import { getCurrentUser, logout, checkAuth } from '../../services/AuthService.js';

// Create navbar HTML
export function createNavbar() {
    const currentUser = getCurrentUser();

    // If not logged in, don't render navbar (SPA mode will redirect to login)
    if (!currentUser) {
        return '';
    }

    // Get current path for active state
    const currentPath = window.location.pathname;

    // Helper functions for URL and active state
    const getUrl = (path) => path;
    const isActive = (path) => currentPath === path ? 'active' : '';

    return `
        <nav class="navbar">
            <div class="navbar-container">
                <a href="${getUrl('/dashboard')}" class="navbar-brand">
                    <i class="fas fa-tasks"></i>
                    <span>Nivoxar</span>
                </a>

                <ul class="navbar-menu">
                    <li>
                        <a href="${getUrl('/dashboard')}" class="${isActive('/dashboard')}">
                            <i class="fas fa-home"></i>
                            <span>Dashboard</span>
                        </a>
                    </li>
                    <li>
                        <a href="${getUrl('/shared-tasks')}" class="${isActive('/shared-tasks')}">
                            <i class="fas fa-share-nodes"></i>
                            <span>Shared Tasks</span>
                        </a>
                    </li>
                    <li>
                        <a href="${getUrl('/categories')}" class="${isActive('/categories')}">
                            <i class="fas fa-folder"></i>
                            <span>Categories</span>
                        </a>
                    </li>
                    <li>
                        <a href="${getUrl('/calendar')}" class="${isActive('/calendar')}">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Calendar</span>
                        </a>
                    </li>
                    <li>
                        <a href="${getUrl('/analytics')}" class="${isActive('/analytics')}">
                            <i class="fas fa-chart-line"></i>
                            <span>Analytics</span>
                        </a>
                    </li>
                </ul>
                
                <div class="navbar-user">
                    <div class="user-info" id="userProfileBtn" style="cursor: pointer;">
                        ${currentUser.profilePicture
                            ? `<div class="user-avatar"><img src="${currentUser.profilePicture}" alt="Profile"></div>`
                            : `<div class="user-avatar"><i class="fas fa-user-circle"></i></div>`
                        }
                        <span>${currentUser.username || currentUser.name || currentUser.email}</span>
                    </div>
                    <button class="btn-logout" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    `;
}

// Initialize navbar
export function initNavbar() {
    const navbarContainer = document.getElementById('navbarContainer');
    
    if (!navbarContainer) {
        console.warn('⚠️ Navbar container not found');
        return;
    }
    
    // Insert navbar HTML
    navbarContainer.innerHTML = createNavbar();
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Setup profile button
    const profileBtn = document.getElementById('userProfileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            if (window.__SPA_MODE__) {
                import('../core/Router.js').then(({ router }) => {
                    router.navigate('/profile');
                });
            } else {
                window.location.href = '/views/ProfilePage.html';
            }
        });
    }

    console.log('✅ Navbar initialized');
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        logout(); // Uses AuthService - includes redirect
    }
}

// Export checkAuth from AuthService for backward compatibility
export { checkAuth };

// Render navbar for SPA
export async function renderNavbar() {
    const navbarContainer = document.getElementById('navbarContainer');

    if (!navbarContainer) {
        console.warn('⚠️ Navbar container not found');
        return;
    }

    // Insert navbar HTML
    navbarContainer.innerHTML = createNavbar();

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Setup profile button - for SPA mode, use router
    const profileBtn = document.getElementById('userProfileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            if (window.__SPA_MODE__) {
                import('../core/Router.js').then(({ router }) => {
                    router.navigate('/profile');
                });
            } else {
                window.location.href = '/views/ProfilePage.html';
            }
        });
    }

    console.log('✅ Navbar rendered');
}