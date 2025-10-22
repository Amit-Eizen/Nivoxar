// Get current user from localStorage
function getCurrentUser() {
    const saved = localStorage.getItem('nivoxar_current_user');
    return saved ? JSON.parse(saved) : null;
}

// Create navbar HTML
export function createNavbar() {
    const currentUser = getCurrentUser();
    
    // If not logged in, redirect to login
    if (!currentUser) {
        if (!window.location.pathname.includes('LoginPage.html')) {
            window.location.href = '/views/LoginPage.html';
        }
        return '';
    }
    
    // Get current page
    const currentPage = window.location.pathname.split('/').pop() || 'DashboardPage.html';
    
    return `
        <nav class="navbar">
            <div class="navbar-container">
                <a href="/views/DashboardPage.html" class="navbar-brand">
                    <i class="fas fa-tasks"></i>
                    <span>Nivoxar</span>
                </a>
                
                <ul class="navbar-menu">
                    <li>
                        <a href="/views/DashboardPage.html" class="${currentPage === 'DashboardPage.html' ? 'active' : ''}">
                            <i class="fas fa-home"></i>
                            <span>Dashboard</span>
                        </a>
                    </li>
                    <li>
                        <a href="/views/CategoriesPage.html" class="${currentPage === 'CategoriesPage.html' ? 'active' : ''}">
                            <i class="fas fa-folder"></i>
                            <span>Categories</span>
                        </a>
                    </li>
                    <li>
                        <a href="/views/AnalyticsPage.html" class="${currentPage === 'AnalyticsPage.html' ? 'active' : ''}">
                            <i class="fas fa-chart-line"></i>
                            <span>Analytics</span>
                        </a>
                    </li>
                </ul>
                
                <div class="navbar-user">
                    <div class="user-info">
                        <i class="fas fa-user-circle"></i>
                        <span>${currentUser.name || currentUser.email}</span>
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
    
    console.log('✅ Navbar initialized');
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('nivoxar_current_user');
        window.location.href = '/views/LoginPage.html';
    }
}

// Check authentication
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