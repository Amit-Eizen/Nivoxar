// DashboardPage.js
import { initTaskManager, renderTasks, updateStats } from './managers/TaskManager.js';
import { initSubTasksManager } from './managers/SubTasksManager.js';
import { initializePopups } from './managers/PopupFactory.js';
import { setupAllEventListeners } from './managers/EventHandlers.js';
import { initNavbar, checkAuth } from './components/Navbar.js';

export const dashboardState = {
    tasks: [],
    filteredTasks: [],
    currentCategory: 'all',
    currentPage: 1,
    tasksPerPage: 10,
    totalPages: 1,
    user: {
        name: 'Guest User',     
        email: 'guest@nivoxar.com'    
    },
    tempSubTasks: []
};

function initializeDashboard() {
    console.log('🚀 Initializing Dashboard...');
    checkAuth();
    initNavbar();
    
    // Read category filter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFilter = urlParams.get('categoryFilter');
    
    if (categoryFilter) {
        console.log('📌 Category filter detected:', categoryFilter);
        dashboardState.currentCategory = categoryFilter;
    }
    
    hideInitialElements();
    showLoading();
    
    loadUserData();
    initTaskManager(); // Loads from localStorage
    initSubTasksManager();
    setupAllEventListeners();
    
    setTimeout(() => {
        initializePopups();
        hideLoading();
        updateDashboard();
        
        // Show filter notification if category is filtered
        if (categoryFilter) {
            showCategoryFilterNotification(categoryFilter);
        }
        
        console.log('✅ Dashboard initialized!');
    }, 500);
}

function loadUserData() {
    const savedUser = localStorage.getItem('nivoxar_user');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            dashboardState.user.name = userData.name;
            dashboardState.user.email = userData.email;
        } catch (error) {
            console.error('Failed to parse user data');
        }
    }
}

function hideInitialElements() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('paginationControls').style.display = 'none';
}

function showLoading() {
    document.getElementById('loadingState').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

export function updateDashboard() {
    updateStats();
    renderTasks();
    updateDashboardSubtitle();
}

function updateDashboardSubtitle() {
    const subtitle = document.getElementById('dashboardSubtitle');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    
    const messages = ['Ready to be productive?', 'Let\'s get things done!', 'You\'ve got this!'];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    subtitle.innerHTML = `${greeting}, <strong>${dashboardState.user.name}</strong>! <span class="status-indicator">${message}</span>`;
}

function showCategoryFilterNotification(categoryId) {
    // Import getCategoryName from TaskUtils
    import('./utils/TaskUtils.js').then(module => {
        const categoryName = module.getCategoryName(categoryId);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'category-filter-notification';
        notification.innerHTML = `
            <div class="filter-message">
                <i class="fas fa-filter"></i>
                <span>Showing tasks from: <strong>${categoryName}</strong></span>
            </div>
            <button class="clear-filter-btn" onclick="window.location.href='/views/DashboardPage.html'">
                <i class="fas fa-times"></i> Clear Filter
            </button>
        `;
        
        // Insert notification at the top of the dashboard
        const container = document.querySelector('.dashboard-container');
        const header = document.querySelector('.dashboard-header');
        if (container && header) {
            container.insertBefore(notification, header.nextSibling);
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeDashboard);